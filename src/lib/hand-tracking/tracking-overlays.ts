import type { Point2D } from "@/lib/types";

export type StabilityBadge = "STABLE" | "TREMOR DETECTED";

export interface HandTrackingUiState {
  left: {
    pinchDistance: number;
    isGrasping: boolean;
    confidence: number;
  } | null;
  right: {
    pinchDistance: number;
    isGrasping: boolean;
    confidence: number;
  } | null;
  stabilityBadge: StabilityBadge;
  lowConfidenceMessage: string | null;
}

/** Pinch fill: red (open) → teal (closed); closeThreshold ~0.06. */
export function pinchFillColor(distance: number, isGrasping: boolean): string {
  if (isGrasping) return "#00D4AA";
  const t = Math.max(0, Math.min(1, 1 - distance / 0.14));
  const r = Math.round(232 + (0 - 232) * t);
  const g = Math.round(69 + (212 - 69) * t);
  const b = Math.round(69 + (170 - 69) * t);
  return `rgb(${r},${g},${b})`;
}

export function drawWebcamTrackingHud(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: HandTrackingUiState
): void {
  const badge = state.stabilityBadge;
  ctx.font = "10px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = badge === "STABLE" ? "#00D4AA" : "#F0A500";
  ctx.fillText(badge, width - 10, 22);
  ctx.textAlign = "left";

  if (state.lowConfidenceMessage) {
    ctx.fillStyle = "rgba(240, 165, 0, 0.92)";
    ctx.font = "11px system-ui, sans-serif";
    const lines = wrapText(state.lowConfidenceMessage, width - 24);
    let y = height - 12 - lines.length * 14;
    for (const line of lines) {
      ctx.fillText(line, 12, y);
      y += 14;
    }
  }
}

export function drawPinchIndicatorOnWebcam(
  ctx: CanvasRenderingContext2D,
  thumb: Point2D,
  index: Point2D,
  distance: number,
  isGrasping: boolean,
  width: number,
  height: number,
  mirror: boolean
): void {
  const toCanvas = (lm: Point2D) => ({
    x: (mirror ? 1 - lm.x : lm.x) * width,
    y: lm.y * height,
  });
  const t = toCanvas(thumb);
  const i = toCanvas(index);
  const mx = (t.x + i.x) / 2;
  const my = (t.y + i.y) / 2;
  const fill = pinchFillColor(distance, isGrasping);
  const radius = 6 + (1 - Math.min(1, distance / 0.14)) * 6;

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(mx, my, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = fill;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(t.x, t.y);
  ctx.lineTo(i.x, i.y);
  ctx.stroke();
}

/** Small pinch-confidence ring at viewport instrument tip (workspace-only overlay). */
export function drawViewportPinchRing(
  ctx: CanvasRenderingContext2D,
  tip: Point2D,
  distance: number,
  isGrasping: boolean
): void {
  const fill = pinchFillColor(distance, isGrasping);
  ctx.fillStyle = fill;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = fill;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 1;
  ctx.stroke();
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (test.length * 6.5 > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Last N stability scores; tremor if average below threshold. */
export function stabilityBadgeFromScores(
  scores: number[],
  window = 10,
  tremorThreshold = 52
): StabilityBadge {
  const slice = scores.slice(-window);
  if (slice.length < 3) return "STABLE";
  const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
  return avg < tremorThreshold ? "TREMOR DETECTED" : "STABLE";
}
