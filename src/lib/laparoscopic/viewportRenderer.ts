import type { InstrumentState, PegTransferRing } from "./types";
import type { Point2D } from "@/lib/types";

export interface ViewportGeometry {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export const LAP_COLORS = {
  bg: "#0A0E12",
  viewport: "#1A1208",
  tissue: "#C4846A",
  tissueHighlight: "#D4A090",
  metal: "#8A9BB0",
  metalHighlight: "#A8B8C8",
  accent: "#00D4AA",
  warning: "#E84545",
  caution: "#F0A500",
  success: "#2ECC71",
  drape: "#0D1F1A",
};

export function getViewportGeometry(
  width: number,
  height: number
): ViewportGeometry {
  return {
    cx: width / 2,
    cy: height * 0.48,
    rx: width * 0.38,
    ry: height * 0.36,
  };
}

export function drawLaparoscopicFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): ViewportGeometry {
  const geo = getViewportGeometry(width, height);

  ctx.fillStyle = LAP_COLORS.bg;
  ctx.fillRect(0, 0, width, height);

  const drapeGrad = ctx.createLinearGradient(0, 0, 0, height);
  drapeGrad.addColorStop(0, "#0D1F1A");
  drapeGrad.addColorStop(1, "#0A1512");
  ctx.fillStyle = drapeGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(geo.cx, geo.cy, geo.rx, geo.ry, 0, 0, Math.PI * 2);
  ctx.clip();

  const lightGrad = ctx.createRadialGradient(
    geo.cx,
    geo.cy - geo.ry * 0.3,
    0,
    geo.cx,
    geo.cy,
    geo.rx
  );
  lightGrad.addColorStop(0, "#2A1F14");
  lightGrad.addColorStop(0.6, LAP_COLORS.viewport);
  lightGrad.addColorStop(1, "#0F0A06");
  ctx.fillStyle = lightGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = LAP_COLORS.tissue;
  ctx.beginPath();
  ctx.ellipse(geo.cx, geo.cy + geo.ry * 0.15, geo.rx * 0.85, geo.ry * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const spec = ctx.createRadialGradient(
    geo.cx - geo.rx * 0.2,
    geo.cy,
    0,
    geo.cx,
    geo.cy,
    geo.rx * 0.5
  );
  spec.addColorStop(0, "rgba(212, 160, 144, 0.35)");
  spec.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = spec;
  ctx.fill();

  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(geo.cx, geo.cy, geo.rx, geo.ry, 0, 0, Math.PI * 2);
  const vig = ctx.createRadialGradient(geo.cx, geo.cy, geo.rx * 0.5, geo.cx, geo.cy, geo.rx);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = vig;
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(138, 155, 176, 0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(geo.cx, geo.cy, geo.rx, geo.ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  return geo;
}

export function drawPeg(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  geo: ViewportGeometry
): void {
  ctx.strokeStyle = "#6B5A4E";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 28);
  ctx.stroke();
  ctx.fillStyle = "#5A4A3E";
  ctx.beginPath();
  ctx.arc(x, y - 28, 4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawRing(
  ctx: CanvasRenderingContext2D,
  ring: PegTransferRing,
  geo: ViewportGeometry
): void {
  const scale = 0.85 + ring.z * 0.15;
  const r = 14 * scale;
  ctx.strokeStyle = LAP_COLORS.metal;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = LAP_COLORS.metalHighlight;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function drawInstrument(
  ctx: CanvasRenderingContext2D,
  inst: InstrumentState,
  entryX: number,
  entryY: number,
  type: "grasper" | "scissors" | "driver"
): void {
  const tip = inst.tip;
  ctx.strokeStyle = LAP_COLORS.metal;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(entryX, entryY);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();

  const jawOpen = inst.graspClosed ? 0.15 : 0.5;
  ctx.fillStyle = LAP_COLORS.metalHighlight;
  ctx.strokeStyle = LAP_COLORS.metal;

  if (type === "scissors") {
    ctx.beginPath();
    ctx.moveTo(tip.x - 6, tip.y - 4 * jawOpen);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(tip.x + 8, tip.y - 6);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
    ctx.fill();
    if (!inst.graspClosed) {
      ctx.beginPath();
      ctx.moveTo(tip.x - 4 * jawOpen, tip.y);
      ctx.lineTo(tip.x + 4 * jawOpen, tip.y);
      ctx.stroke();
    }
  }

  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(tip.x + 4, tip.y + 6, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function mapHandToViewportTip(
  nx: number,
  ny: number,
  geo: ViewportGeometry,
  mirror: boolean
): Point2D {
  const x = geo.cx + (mirror ? 1 - nx - 0.5 : nx - 0.5) * geo.rx * 1.6;
  const y = geo.cy + (ny - 0.45) * geo.ry * 1.8;
  return { x, y };
}

export function drawCutCircle(
  ctx: CanvasRenderingContext2D,
  geo: ViewportGeometry,
  progress: number,
  cutPath: Point2D[]
): void {
  const cx = geo.cx;
  const cy = geo.cy;
  const r = Math.min(geo.rx, geo.ry) * 0.45;

  ctx.fillStyle = "rgba(200, 180, 160, 0.5)";
  ctx.fillRect(cx - r - 20, cy - r - 20, (r + 20) * 2, (r + 20) * 2);

  ctx.strokeStyle = LAP_COLORS.caution;
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  if (cutPath.length > 1) {
    ctx.strokeStyle = LAP_COLORS.warning;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cutPath[0].x, cutPath[0].y);
    for (let i = 1; i < cutPath.length; i++) {
      ctx.lineTo(cutPath[i].x, cutPath[i].y);
    }
    ctx.stroke();
  }
}
