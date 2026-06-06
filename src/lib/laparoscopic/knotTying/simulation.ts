import type { KnotTyingState } from "../types";
import type { ViewportGeometry } from "../viewportRenderer";
import type { Point2D } from "@/lib/types";

const ALIGNMENT_THRESHOLD_PX = 44;

export function createKnotTyingState(): KnotTyingState {
  return {
    pathProgress: 0,
    throwCount: 0,
    phase: "instrument_alignment",
    completed: false,
  };
}

export function getKnotPath(geo: ViewportGeometry): Point2D[] {
  const points: Point2D[] = [];
  const radiusX = geo.rx * 0.42;
  const radiusY = geo.ry * 0.28;
  const centerX = geo.cx;
  const centerY = geo.cy + geo.ry * 0.08;

  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const angle = Math.PI * 1.15 + t * Math.PI * 1.7;
    points.push({
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
    });
  }

  return points;
}

export function updateKnotTying(
  state: KnotTyingState,
  driverTip: Point2D | null,
  path: Point2D[],
  wristRotation: number
): { state: KnotTyingState; feedback: string; phaseLabel: string } {
  let feedback =
    "Maintain instrument alignment and rotate through the wrap path";
  let phaseLabel = "Knot tying - instrument alignment";

  if (!driverTip || path.length === 0) {
    return { state, feedback, phaseLabel };
  }

  const { distance: dist, progress } = getClosestPointOnPath(driverTip, path);
  state.pathProgress = Math.max(state.pathProgress, progress);

  if (state.pathProgress < 0.15) {
    state.phase = "instrument_alignment";
    phaseLabel = "Knot tying - instrument alignment";
  } else if (state.pathProgress < 0.5) {
    state.phase = "first_throw";
    phaseLabel = "Knot tying - first throw";
    feedback = "Control the first throw with a compact wrist rotation";
  } else if (state.pathProgress < 0.85) {
    state.phase = "second_throw";
    phaseLabel = "Knot tying - second throw";
    state.throwCount = Math.max(state.throwCount, 1);
    feedback = "Reverse direction for the second throw and maintain tension";
  } else {
    state.phase = "tightening";
    phaseLabel = "Knot tying - knot tightening";
    state.throwCount = 2;
    if (state.pathProgress >= 0.95) {
      state.completed = true;
      feedback = "Knot sequence complete; verify symmetric tension";
    }
  }

  if (dist > ALIGNMENT_THRESHOLD_PX) {
    feedback = "Maintain instrument alignment through the wrap path";
  }

  if (Math.abs(wristRotation) < 0.1 && state.pathProgress > 0.2) {
    feedback = "Increase controlled wrist rotation; avoid straight pushing";
  }

  return { state, feedback, phaseLabel };
}

export function estimateWristRotation(landmarks: Point2D[]): number {
  const wrist = landmarks[0];
  const mcp = landmarks[5];
  const pinky = landmarks[17];
  const v1 = Math.atan2(mcp.y - wrist.y, mcp.x - wrist.x);
  const v2 = Math.atan2(pinky.y - wrist.y, pinky.x - wrist.x);
  return v2 - v1;
}

function getClosestPointOnPath(point: Point2D, path: Point2D[]) {
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestIndex = 0;

  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const distance = Math.hypot(point.x - p.x, point.y - p.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return {
    distance: bestDistance,
    progress: path.length <= 1 ? 0 : bestIndex / (path.length - 1),
  };
}
