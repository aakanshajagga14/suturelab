import type { Point2D } from "@/lib/types";

/** Quadratic Bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2 */
function quadraticBezier(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  t: number
): Point2D {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

/** Normalized stitch path control points (0–1 canvas space). */
const PATH_CONTROL = {
  start: { x: 0.15, y: 0.72 },
  control: { x: 0.5, y: 0.28 },
  end: { x: 0.85, y: 0.72 },
};

const SAMPLE_COUNT = 120;

export function generateStitchPath(
  width: number,
  height: number
): Point2D[] {
  const p0 = {
    x: PATH_CONTROL.start.x * width,
    y: PATH_CONTROL.start.y * height,
  };
  const p1 = {
    x: PATH_CONTROL.control.x * width,
    y: PATH_CONTROL.control.y * height,
  };
  const p2 = {
    x: PATH_CONTROL.end.x * width,
    y: PATH_CONTROL.end.y * height,
  };

  const points: Point2D[] = [];
  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    points.push(quadraticBezier(p0, p1, p2, i / SAMPLE_COUNT));
  }
  return points;
}

export function getClosestPointOnPath(
  point: Point2D,
  path: Point2D[]
): { closest: Point2D; distance: number; progress: number } {
  let minDist = Infinity;
  let closest = path[0];
  let closestIndex = 0;

  for (let i = 0; i < path.length; i++) {
    const d = Math.hypot(point.x - path[i].x, point.y - path[i].y);
    if (d < minDist) {
      minDist = d;
      closest = path[i];
      closestIndex = i;
    }
  }

  return {
    closest,
    distance: minDist,
    progress: closestIndex / (path.length - 1),
  };
}

export const PATH_THRESHOLD_PX = 42;
export const PATH_THRESHOLD_NORMALIZED = 0.06;
