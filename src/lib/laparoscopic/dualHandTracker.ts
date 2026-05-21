import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { Point2D } from "@/lib/types";
import type { RawHandData } from "./instrumentMapping";

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
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
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

export interface DualHandResult {
  left: RawHandData | null;
  right: RawHandData | null;
}

export function detectDualHands(
  landmarker: HandLandmarker,
  video: HTMLVideoElement,
  timestamp: number
): DualHandResult {
  const result: HandLandmarkerResult = landmarker.detectForVideo(
    video,
    timestamp
  );

  let left: RawHandData | null = null;
  let right: RawHandData | null = null;

  if (!result.landmarks?.length) {
    return { left: null, right: null };
  }

  for (let i = 0; i < result.landmarks.length; i++) {
    const landmarks: Point2D[] = result.landmarks[i].map((lm) => ({
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
