import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { Point2D } from "@/lib/types";
import {
  createHandPipelines,
  type InstrumentPositionPipeline,
} from "@/lib/hand-tracking/instrument-position-pipeline";
import type { FlsSessionMode } from "./types";

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

let dualLandmarker: HandLandmarker | null = null;

export async function initDualHandLandmarker(): Promise<HandLandmarker> {
  if (dualLandmarker) return dualLandmarker;

  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
  const opts = {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" as const },
    runningMode: "VIDEO" as const,
    numHands: 2,
    minHandDetectionConfidence: 0.7,
    minHandPresenceConfidence: 0.7,
    minTrackingConfidence: 0.6,
  };

  try {
    dualLandmarker = await HandLandmarker.createFromOptions(vision, opts);
  } catch {
    dualLandmarker = await HandLandmarker.createFromOptions(vision, {
      ...opts,
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
    });
  }

  return dualLandmarker;
}

export interface RawHandData {
  landmarks: Point2D[];
  handedness: "Left" | "Right" | "Unknown";
}

/** Smoothed, filtered hand data for instrument control and overlays. */
export interface ProcessedHandData {
  landmarks: Point2D[];
  handedness: "Left" | "Right" | "Unknown";
  tipNorm: { x: number; y: number };
  isGrasping: boolean;
  confidence: number;
  pinchDistance: number;
}

export interface DualHandResult {
  left: RawHandData | null;
  right: RawHandData | null;
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
    video.videoHeight > 0
  );
}

/** MediaPipe VIDEO mode requires strictly increasing timestamps (ms). */
function nextMonotonicTimestamp(
  video: HTMLVideoElement,
  lastMs: number
): number {
  const fromVideo = Math.round(video.currentTime * 1000);
  let ts =
    fromVideo > 0 ? fromVideo : Math.max(0, Math.round(performance.now()));
  if (ts <= lastMs) ts = lastMs + 1;
  return ts;
}

function assignHand(
  label: "Left" | "Right" | "Unknown",
  data: ProcessedHandData,
  left: ProcessedHandData | null,
  right: ProcessedHandData | null
): { left: ProcessedHandData | null; right: ProcessedHandData | null } {
  if (label === "Left") return { left: data, right };
  if (label === "Right") return { left, right: data };
  if (!left) return { left: data, right };
  if (!right) return { left, right: data };
  return { left, right };
}

/**
 * Persists EMA / dead-zone / velocity / pinch state across frames.
 * One instance per workspace session.
 */
export class DualHandTrackingSession {
  private pipelines: {
    left: InstrumentPositionPipeline;
    right: InstrumentPositionPipeline;
  };
  private lastDetectTimestampMs = -1;

  constructor(mode: FlsSessionMode = "training") {
    this.pipelines = createHandPipelines(mode);
  }

  setMode(mode: FlsSessionMode): void {
    this.pipelines = createHandPipelines(mode);
  }

  reset(): void {
    this.pipelines.left.reset();
    this.pipelines.right.reset();
    this.lastDetectTimestampMs = -1;
  }

  detect(
    landmarker: HandLandmarker,
    video: HTMLVideoElement
  ): ProcessedDualHandResult {
    if (!isVideoFrameReady(video)) {
      return EMPTY_PROCESSED;
    }

    const timestamp = nextMonotonicTimestamp(
      video,
      this.lastDetectTimestampMs
    );
    this.lastDetectTimestampMs = timestamp;

    let result: HandLandmarkerResult;
    try {
      result = landmarker.detectForVideo(video, timestamp);
    } catch {
      return EMPTY_PROCESSED;
    }

    let left: ProcessedHandData | null = null;
    let right: ProcessedHandData | null = null;

    if (!result.landmarks?.length) {
      return EMPTY_PROCESSED;
    }

    for (let i = 0; i < result.landmarks.length; i++) {
      const raw = result.landmarks[i];
      if (!raw || raw.length < HAND_LANDMARK_COUNT) continue;
      const label =
        result.handednesses?.[i]?.[0]?.categoryName === "Left"
          ? "Left"
          : result.handednesses?.[i]?.[0]?.categoryName === "Right"
            ? "Right"
            : "Unknown";

      const pipeline =
        label === "Left"
          ? this.pipelines.left
          : label === "Right"
            ? this.pipelines.right
            : !left
              ? this.pipelines.left
              : this.pipelines.right;

      const state = pipeline.process(raw);
      const data: ProcessedHandData = {
        landmarks: state.smoothedLandmarks,
        handedness: label,
        tipNorm: { x: state.x, y: state.y },
        isGrasping: state.isGrasping,
        confidence: state.confidence,
        pinchDistance: state.pinchDistance,
      };

      const assigned = assignHand(label, data, left, right);
      left = assigned.left;
      right = assigned.right;
    }

    return { left, right };
  }
}

let legacyLastTimestampMs = -1;

/** Legacy raw detection — prefer DualHandTrackingSession. */
export function detectDualHands(
  landmarker: HandLandmarker,
  video: HTMLVideoElement
): DualHandResult {
  if (!isVideoFrameReady(video)) {
    return { left: null, right: null };
  }

  const timestamp = nextMonotonicTimestamp(video, legacyLastTimestampMs);
  legacyLastTimestampMs = timestamp;

  let result: HandLandmarkerResult;
  try {
    result = landmarker.detectForVideo(video, timestamp);
  } catch {
    return { left: null, right: null };
  }

  let left: RawHandData | null = null;
  let right: RawHandData | null = null;

  if (!result.landmarks?.length) {
    return { left: null, right: null };
  }

  for (let i = 0; i < result.landmarks.length; i++) {
    const raw = result.landmarks[i];
    if (!raw || raw.length < HAND_LANDMARK_COUNT) continue;
    const landmarks: Point2D[] = raw.map((lm) => ({
      x: lm.x,
      y: lm.y,
    }));
    const label =
      result.handednesses?.[i]?.[0]?.categoryName === "Left"
        ? "Left"
        : result.handednesses?.[i]?.[0]?.categoryName === "Right"
          ? "Right"
          : "Unknown";

    const data: RawHandData = { landmarks, handedness: label };
    if (label === "Left") left = data;
    else if (label === "Right") right = data;
    else if (!left) left = data;
    else if (!right) right = data;
  }

  return { left, right };
}
