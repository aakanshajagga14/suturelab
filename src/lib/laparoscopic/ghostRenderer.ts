import type { Point2D } from "@/lib/types";
import type { ViewportGeometry } from "./viewportRenderer";

const GHOST = "rgba(0, 212, 170, 0.4)";

export function drawGhostPath(
  ctx: CanvasRenderingContext2D,
  points: Point2D[],
  dashed = true
): void {
  if (points.length < 2) return;
  ctx.strokeStyle = GHOST;
  ctx.lineWidth = 2;
  if (dashed) ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawGhostInstrument(
  ctx: CanvasRenderingContext2D,
  tip: Point2D,
  entry: Point2D,
  pulse = 0
): void {
  const alpha = 0.35 + Math.sin(pulse) * 0.1;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = GHOST;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(entry.x, entry.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawHintArrow(
  ctx: CanvasRenderingContext2D,
  from: Point2D,
  to: Point2D,
  pulse: number
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const scale = 1 + Math.sin(pulse * 4) * 0.15;
  const endX = from.x + ux * 60 * scale;
  const endY = from.y + uy * 60 * scale;

  ctx.strokeStyle = "#00D4AA";
  ctx.fillStyle = "#00D4AA";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  const angle = Math.atan2(endY - from.y, endX - from.x);
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - 10 * Math.cos(angle - 0.4),
    endY - 10 * Math.sin(angle - 0.4)
  );
  ctx.lineTo(
    endX - 10 * Math.cos(angle + 0.4),
    endY - 10 * Math.sin(angle + 0.4)
  );
  ctx.closePath();
  ctx.fill();
}

export function drawStepCompleteFlash(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
): void {
  if (intensity <= 0) return;
  ctx.strokeStyle = `rgba(0, 212, 170, ${intensity * 0.8})`;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);
}

export function getPegGhostTargets(
  geo: ViewportGeometry,
  step: number,
  ringPeg: number,
  targetPeg: number
): { path: Point2D[]; ghostTips: Point2D[]; hintFrom?: Point2D; hintTo?: Point2D } {
  const peg = (idx: number) => ({
    x: geo.cx + (idx < 3 ? -0.18 : 0.18) * geo.rx * 2,
    y: geo.cy + (idx % 3 === 0 ? -0.12 : idx % 3 === 1 ? 0 : 0.12) * geo.ry * 2,
  });

  const ringPos = peg(ringPeg);
  ringPos.y -= 28;
  const target = peg(targetPeg);
  target.y -= 28;
  const centre = { x: geo.cx, y: geo.cy - geo.ry * 0.1 };
  const entryR = { x: geo.cx + geo.rx * 0.85, y: geo.cy + geo.ry * 0.9 };

  switch (step) {
    case 0:
      return {
        path: [entryR, { x: ringPos.x, y: ringPos.y - 20 }, ringPos],
        ghostTips: [ringPos],
        hintFrom: entryR,
        hintTo: ringPos,
      };
    case 1:
      return { path: [], ghostTips: [ringPos], hintFrom: ringPos, hintTo: ringPos };
    case 2:
      return {
        path: [ringPos, { x: ringPos.x, y: geo.cy - 40 }, centre],
        ghostTips: [centre],
        hintFrom: ringPos,
        hintTo: centre,
      };
    case 3:
      return {
        path: [],
        ghostTips: [
          { x: geo.cx - geo.rx * 0.3, y: centre.y },
          { x: geo.cx + geo.rx * 0.3, y: centre.y },
        ],
        hintFrom: { x: geo.cx + geo.rx * 0.2, y: centre.y },
        hintTo: { x: geo.cx - geo.rx * 0.2, y: centre.y },
      };
    case 4:
      return {
        path: [centre, { x: target.x, y: target.y - 30 }, target],
        ghostTips: [target],
        hintFrom: centre,
        hintTo: target,
      };
    case 5:
      return {
        path: [target, { x: target.x, y: target.y + 10 }],
        ghostTips: [target],
        hintFrom: { x: target.x, y: target.y - 20 },
        hintTo: target,
      };
    default:
      return { path: [], ghostTips: [] };
  }
}
