import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { HandLandmarks, Point2D } from "@/lib/types";

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

let landmarkerInstance: HandLandmarker | null = null;

export async function initHandLandmarker(): Promise<HandLandmarker> {
  if (landmarkerInstance) return landmarkerInstance;

  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
  const baseOptions = {
    runningMode: "VIDEO" as const,
    numHands: 1,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  };

  try {
    landmarkerInstance = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      ...baseOptions,
    });
  } catch {
    landmarkerInstance = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
      ...baseOptions,
    });
  }

  return landmarkerInstance;
}

export function detectHands(
  landmarker: HandLandmarker,
  video: HTMLVideoElement,
  timestamp: number
): HandLandmarks | null {
  const result: HandLandmarkerResult = landmarker.detectForVideo(
    video,
    timestamp
  );

  if (!result.landmarks || result.landmarks.length === 0) return null;

  const landmarks: Point2D[] = result.landmarks[0].map((lm) => ({
    x: lm.x,
    y: lm.y,
  }));

  const handedness =
    result.handednesses?.[0]?.[0]?.categoryName === "Left"
      ? "Left"
      : result.handednesses?.[0]?.[0]?.categoryName === "Right"
        ? "Right"
        : "Unknown";

  return {
    landmarks,
    handedness,
    timestamp,
  };
}

/** MediaPipe hand landmark indices */
export const LANDMARK = {
  WRIST: 0,
  INDEX_FINGER_TIP: 8,
  INDEX_FINGER_MCP: 5,
  THUMB_TIP: 4,
  MIDDLE_FINGER_TIP: 12,
} as const;

export function normalizedToCanvas(
  point: Point2D,
  width: number,
  height: number,
  mirror = true
): Point2D {
  return {
    x: (mirror ? 1 - point.x : point.x) * width,
    y: point.y * height,
  };
}

export function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Point2D[],
  width: number,
  height: number,
  mirror = true
): void {
  const connections: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17],
  ];

  const toCanvas = (lm: Point2D) =>
    normalizedToCanvas(lm, width, height, mirror);

  ctx.strokeStyle = "rgba(13, 148, 136, 0.75)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  for (const [a, b] of connections) {
    if (!landmarks[a] || !landmarks[b]) continue;
    const p1 = toCanvas(landmarks[a]);
    const p2 = toCanvas(landmarks[b]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  for (const lm of landmarks) {
    const p = toCanvas(lm);
    ctx.fillStyle = "rgba(3, 105, 161, 0.9)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const indexTip = landmarks[LANDMARK.INDEX_FINGER_TIP];
  if (indexTip) {
    const p = toCanvas(indexTip);
    ctx.strokeStyle = "rgba(13, 148, 136, 1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawStitchPath(
  ctx: CanvasRenderingContext2D,
  path: Point2D[],
  progress: number
): void {
  if (path.length < 2) return;

  ctx.strokeStyle = "rgba(3, 105, 161, 0.25)";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  const progressIndex = Math.floor(progress * (path.length - 1));
  const activePath = path.slice(0, progressIndex + 1);

  if (activePath.length >= 2) {
    ctx.strokeStyle = "rgba(13, 148, 136, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(activePath[0].x, activePath[0].y);
    for (let i = 1; i < activePath.length; i++) {
      ctx.lineTo(activePath[i].x, activePath[i].y);
    }
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(3, 105, 161, 0.9)";
  ctx.beginPath();
  ctx.arc(path[0].x, path[0].y, 6, 0, Math.PI * 2);
  ctx.fill();

  const end = path[path.length - 1];
  ctx.strokeStyle = "rgba(3, 105, 161, 0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
  ctx.stroke();
}
