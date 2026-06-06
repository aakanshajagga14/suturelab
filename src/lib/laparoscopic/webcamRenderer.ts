import type { Point2D } from "@/lib/types";
import type { ProcessedDualHandResult } from "./dualHandTracker";
import { getInstrumentLabels } from "./trainingMode";
import type { FlsTaskId } from "./types";
import {
  drawPinchIndicatorOnWebcam,
  drawWebcamTrackingHud,
  type HandTrackingUiState,
} from "@/lib/hand-tracking/tracking-overlays";

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

function toCanvas(
  lm: Point2D,
  width: number,
  height: number,
  mirror: boolean
): Point2D {
  return {
    x: (mirror ? 1 - lm.x : lm.x) * width,
    y: lm.y * height,
  };
}

export function drawWebcamFeed(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number
): void {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  ctx.restore();
}

export function drawWebcamHandOverlay(
  ctx: CanvasRenderingContext2D,
  hands: ProcessedDualHandResult,
  taskId: FlsTaskId,
  width: number,
  height: number,
  trackingUi?: HandTrackingUiState
): { tracking: boolean; bothHands: boolean } {
  const labels = getInstrumentLabels(taskId);
  let count = 0;

  const drawHand = (
    hand: NonNullable<ProcessedDualHandResult["left"]>,
    label: string
  ) => {
    count++;
    const landmarks = hand.landmarks;
    const points = landmarks.map((lm) => toCanvas(lm, width, height, false));

    ctx.strokeStyle = "rgba(0, 212, 170, 0.7)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (const [a, b] of CONNECTIONS) {
      if (!points[a] || !points[b]) continue;
      ctx.beginPath();
      ctx.moveTo(points[a].x, points[a].y);
      ctx.lineTo(points[b].x, points[b].y);
      ctx.stroke();
    }

    for (const p of points) {
      ctx.fillStyle = "rgba(0, 212, 170, 0.95)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const thumb = landmarks[4];
    const index = landmarks[8];
    if (thumb && index) {
      drawPinchIndicatorOnWebcam(
        ctx,
        thumb,
        index,
        hand.pinchDistance,
        hand.isGrasping,
        width,
        height,
        false
      );
    }

    const wrist = points[0];
    if (wrist) {
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillStyle = "#E8EDF2";
      ctx.fillText(label, wrist.x + 8, wrist.y - 6);
    }
  };

  if (hands.left) drawHand(hands.left, labels.left);
  if (hands.right) drawHand(hands.right, labels.right);

  if (trackingUi) {
    drawWebcamTrackingHud(ctx, width, height, trackingUi);
  }

  return { tracking: count > 0, bothHands: !!(hands.left && hands.right) };
}

export function drawWebcamNoHandsOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.fillStyle = "rgba(10, 14, 18, 0.55)";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#E8EDF2";
  ctx.font = "13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "Position both hands within camera frame",
    width / 2,
    height / 2
  );
  ctx.textAlign = "left";
}
