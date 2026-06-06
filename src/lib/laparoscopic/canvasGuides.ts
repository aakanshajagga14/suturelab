import type { Point2D } from "@/lib/types";

export function drawInstrumentGuidePath(
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
