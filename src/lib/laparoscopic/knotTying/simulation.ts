import { generateStitchPath } from "@/lib/suturing/stitchPath";
import { getClosestPointOnPath, PATH_THRESHOLD_PX } from "@/lib/suturing/stitchPath";
import type { KnotTyingState } from "../types";
import type { ViewportGeometry } from "../viewportRenderer";
import type { Point2D } from "@/lib/types";

export function createKnotTyingState(): KnotTyingState {
  return {
    pathProgress: 0,
    throwCount: 0,
    phase: "needle_positioning",
    completed: false,
  };
}

export function getKnotPath(geo: ViewportGeometry, w: number, h: number): Point2D[] {
  return generateStitchPath(w, h).map((p) => ({
    x: geo.cx + (p.x / w - 0.5) * geo.rx * 1.4,
    y: geo.cy + (p.y / h - 0.5) * geo.ry * 1.4,
  }));
}

export function updateKnotTying(
  state: KnotTyingState,
  driverTip: Point2D | null,
  path: Point2D[],
  wristRotation: number
): { state: KnotTyingState; feedback: string; phaseLabel: string } {
  let feedback =
    "Drive needle along arc path — supination during entry, controlled withdrawal";
  let phaseLabel = "Knot tying — needle positioning";

  if (!driverTip || path.length === 0) {
    return { state, feedback, phaseLabel };
  }

  const { distance: dist, progress } = getClosestPointOnPath(driverTip, path);
  state.pathProgress = Math.max(state.pathProgress, progress);

  if (state.pathProgress < 0.15) {
    state.phase = "needle_positioning";
    phaseLabel = "Knot tying — needle positioning";
  } else if (state.pathProgress < 0.5) {
    state.phase = "first_throw";
    phaseLabel = "Knot tying — first throw";
    feedback = "Complete first throw — two wraps around non-dominant instrument";
  } else if (state.pathProgress < 0.85) {
    state.phase = "second_throw";
    phaseLabel = "Knot tying — second throw";
    state.throwCount = Math.max(state.throwCount, 1);
    feedback = "Execute second throw for square knot security";
  } else {
    state.phase = "tightening";
    phaseLabel = "Knot tying — knot tightening";
    state.throwCount = 2;
    if (state.pathProgress >= 0.95) {
      state.completed = true;
      feedback = "Square knot sequence complete — verify symmetric throws";
    }
  }

  if (dist > PATH_THRESHOLD_PX * 1.5) {
    feedback = "Needle trajectory deviating from arc — complete the arc for secure knot";
  }

  if (Math.abs(wristRotation) < 0.1 && state.pathProgress > 0.2) {
    feedback =
      "Incorporate wrist rotation — straight push without supination is a common technical error";
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
