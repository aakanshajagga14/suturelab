import type { Point2D } from "@/lib/types";
import type { InstrumentSide, InstrumentState } from "./types";
import type { RawHandData } from "./dualHandTracker";

const GRASP_THRESHOLD_NORM = 0.045;

export type { RawHandData };

export function mapHandToInstrument(
  hand: RawHandData,
  side: InstrumentSide,
  viewportWidth: number,
  viewportHeight: number,
  prevPathLength: number
): InstrumentState {
  const lm = hand.landmarks;
  const thumb = lm[4];
  const index = lm[8];
  const wrist = lm[0];
  const mcp = lm[5];

  const graspDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
  const graspClosed = graspDist < GRASP_THRESHOLD_NORM;

  const tipNormX = side === "right" ? 1 - index.x : index.x;
  const tipX = tipNormX * viewportWidth;
  const tipY = index.y * viewportHeight;
  const depth = 1 - index.y;

  const shaftAngle = Math.atan2(mcp.y - wrist.y, mcp.x - wrist.x);

  const tip: Point2D = { x: tipX, y: tipY };
  const move = prevPathLength > 0 ? Math.hypot(tipX, tipY) : 0;

  return {
    side,
    tip,
    shaftAngle,
    depth: Math.max(0, Math.min(1, depth)),
    graspClosed,
    pathLength: prevPathLength + move * 0.01,
  };
}

export function viewportFromNormalized(
  nx: number,
  ny: number,
  vw: number,
  vh: number,
  ellipse: { cx: number; cy: number; rx: number; ry: number }
): Point2D {
  return {
    x: ellipse.cx + (nx - 0.5) * ellipse.rx * 2,
    y: ellipse.cy + (ny - 0.5) * ellipse.ry * 2,
  };
}

export function isInsideEllipse(
  x: number,
  y: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number
): boolean {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}
