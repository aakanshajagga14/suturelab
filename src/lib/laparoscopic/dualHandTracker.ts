import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import type { Point2D } from "@/lib/types";
import {
  createHandPipelines,
  type InstrumentPositionPipeline,
} from "@/lib/hand-tracking/instrument-position-pipeline";
import type { FlsSessionMode } from "./types";
import {
  assignScreenSlots,
  mirrorLandmarks,
  mirrorX,
} from "./handSpace";

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

let dualLandmarker: HandLandmarker | null = null;

/** Shared across sessions — MediaPipe VIDEO mode requires global monotonic timestamps. */
let lastMediaPipeTimestampMs = 0;
let mediaPipeDetectInFlight = false;
let lastDetectWallMs = 0;
const MIN_DETECT_INTERVAL_MS = 33;

export async function initDualHandLandmarker(): Promise<HandLandmarker> {
  if (dualLandmarker) return dualLandmarker;

  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
  const opts = {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" as const },
    runningMode: "VIDEO" as const,
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };

  try {
    dualLandmarker = await HandLandmarker.createFromOptions(vision, opts);
  } catch {
    dualLandmarker = await HandLandmarker.createFromOptions(vision, {
      ...opts,
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
    });
  }

  lastMediaPipeTimestampMs = 0;
  return dualLandmarker;
}

export interface ProcessedHandData {
  landmarks: Point2D[];
  handedness: "Left" | "Right" | "Unknown";
  tipNorm: Point2D;
  isGrasping: boolean;
  confidence: number;
  pinchDistance: number;
}

export interface ProcessedDualHandResult {
  left: ProcessedHandData | null;
  right: ProcessedHandData | null;
}

const EMPTY_PROCESSED: ProcessedDualHandResult = { left: null, right: null };
const HAND_LANDMARK_COUNT = 21;

function isVideoFrameReady(video: HTMLVideoElement): boolean {
  return (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0 &&
    !video.paused &&
    !video.ended
  );
}

function nextMediaPipeTimestampMs(): number {
  const now = Math.round(performance.now());
  lastMediaPipeTimestampMs = Math.max(now, lastMediaPipeTimestampMs + 1);
  return lastMediaPipeTimestampMs;
}

function isValidLandmarkSet(landmarks: NormalizedLandmark[] | undefined): boolean {
  if (!landmarks || landmarks.length < HAND_LANDMARK_COUNT) return false;
  for (let i = 0; i < HAND_LANDMARK_COUNT; i++) {
    const lm = landmarks[i];
    if (
      !lm ||
      !Number.isFinite(lm.x) ||
      !Number.isFinite(lm.y) ||
      lm.x < -0.5 ||
      lm.x > 1.5 ||
      lm.y < -0.5 ||
      lm.y > 1.5
    ) {
      return false;
    }
  }
  return true;
}

function handConfidence(
  landmarks: NormalizedLandmark[],
  handednessScore: number | undefined
): number {
  const vis =
    landmarks[8]?.visibility ?? landmarks[0]?.visibility ?? undefined;
  const fromVis = vis !== undefined && vis > 0 ? vis : 0.85;
  const fromLabel = handednessScore ?? 0.75;
  return Math.max(0.45, Math.min(1, fromVis * 0.4 + fromLabel * 0.6));
}

function toProcessedHand(
  raw: NormalizedLandmark[],
  pipeline: InstrumentPositionPipeline,
  label: "Left" | "Right" | "Unknown",
  confidence: number
): ProcessedHandData {
  const state = pipeline.process(raw);
  const tipNorm: Point2D = {
    x: mirrorX(state.x),
    y: state.y,
  };
  return {
    landmarks: mirrorLandmarks(state.smoothedLandmarks),
    handedness: label,
    tipNorm,
    isGrasping: state.isGrasping,
    confidence,
    pinchDistance: state.pinchDistance,
  };
}

function processLandmarkerResult(
  result: HandLandmarkerResult,
  slotPipelines: [InstrumentPositionPipeline, InstrumentPositionPipeline]
): ProcessedDualHandResult {
  if (!result.landmarks?.length) {
    return EMPTY_PROCESSED;
  }

  const candidates: ProcessedHandData[] = [];

  for (let i = 0; i < result.landmarks.length; i++) {
    const raw = result.landmarks[i];
    if (!isValidLandmarkSet(raw)) continue;

    const label =
      result.handednesses?.[i]?.[0]?.categoryName === "Left"
        ? "Left"
        : result.handednesses?.[i]?.[0]?.categoryName === "Right"
          ? "Right"
          : "Unknown";

    const score = result.handednesses?.[i]?.[0]?.score;
    const confidence = handConfidence(raw, score);
    const pipeline = slotPipelines[Math.min(i, 1)];

    candidates.push(toProcessedHand(raw, pipeline, label, confidence));
  }

  return assignScreenSlots(candidates);
}

/**
 * Persists EMA / dead-zone / velocity / pinch state across frames.
 * Hands are assigned to left/right instrument slots by screen position
 * in mirror (selfie) space, not MediaPipe handedness labels.
 */
export class DualHandTrackingSession {
  private slotPipelines: [InstrumentPositionPipeline, InstrumentPositionPipeline];
  private lastVideoFrameTime = -1;
  private cached: ProcessedDualHandResult = EMPTY_PROCESSED;

  constructor(mode: FlsSessionMode = "training") {
    const p = createHandPipelines(mode);
    this.slotPipelines = [p.left, p.right];
  }

  setMode(mode: FlsSessionMode): void {
    const p = createHandPipelines(mode);
    this.slotPipelines = [p.left, p.right];
  }

  reset(): void {
    this.slotPipelines[0].reset();
    this.slotPipelines[1].reset();
    this.lastVideoFrameTime = -1;
    this.cached = EMPTY_PROCESSED;
  }

  detect(
    landmarker: HandLandmarker,
    video: HTMLVideoElement
  ): ProcessedDualHandResult {
    if (!isVideoFrameReady(video)) {
      return this.cached;
    }

    const frameTime = video.currentTime;
    if (frameTime === this.lastVideoFrameTime) {
      return this.cached;
    }

    if (mediaPipeDetectInFlight) {
      return this.cached;
    }

    const wallNow = performance.now();
    if (wallNow - lastDetectWallMs < MIN_DETECT_INTERVAL_MS) {
      return this.cached;
    }

    mediaPipeDetectInFlight = true;
    try {
      const timestamp = nextMediaPipeTimestampMs();
      const result = landmarker.detectForVideo(video, timestamp);
      const processed = processLandmarkerResult(result, this.slotPipelines);
      this.lastVideoFrameTime = frameTime;
      this.cached = processed;
      lastDetectWallMs = wallNow;
      return processed;
    } catch {
      return this.cached;
    } finally {
      mediaPipeDetectInFlight = false;
    }
  }
}
