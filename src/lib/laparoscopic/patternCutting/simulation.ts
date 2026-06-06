import type { PatternCuttingState } from "../types";
import type { ViewportGeometry } from "../viewportRenderer";
import type { Point2D } from "@/lib/types";
import { distance } from "@/lib/utils/math";

const CIRCLE_SAMPLES = 64;

export function createPatternCuttingState(): PatternCuttingState {
  return {
    cutProgress: 0,
    meanDeviation: 0,
    completionPct: 0,
    dominantPath: [],
    nonDominantHeld: false,
    phase: "position_gauze",
    completed: false,
  };
}

export function getTargetCirclePath(geo: ViewportGeometry): Point2D[] {
  const cx = geo.cx;
  const cy = geo.cy;
  const r = Math.min(geo.rx, geo.ry) * 0.45;
  const points: Point2D[] = [];
  for (let i = 0; i <= CIRCLE_SAMPLES; i++) {
    const a = (i / CIRCLE_SAMPLES) * Math.PI * 2;
    points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return points;
}

export function updatePatternCutting(
  state: PatternCuttingState,
  scissorsTip: Point2D | null,
  grasperTip: Point2D | null,
  grasperClosed: boolean,
  targetPath: Point2D[]
): { state: PatternCuttingState; feedback: string; phaseLabel: string } {
  let feedback =
    "Non-dominant grasper should tension gauze — dominant hand initiates cutting along marked circle";
  let phaseLabel = "Pattern cutting — preparation";

  if (grasperClosed && grasperTip) {
    state.nonDominantHeld = true;
    state.phase = "cutting";
    phaseLabel = "Pattern cutting — active dissection";
  }

  if (scissorsTip && state.phase === "cutting") {
    state.dominantPath.push(scissorsTip);
    if (state.dominantPath.length > 200) state.dominantPath.shift();

    let minDist = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < targetPath.length; i++) {
      const d = distance(scissorsTip, targetPath[i]);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }

    const deviationMm = minDist * 0.15;
    state.meanDeviation =
      state.meanDeviation * 0.95 + deviationMm * 0.05;
    state.cutProgress = Math.max(state.cutProgress, closestIdx / targetPath.length);
    state.completionPct = Math.round(state.cutProgress * 100);

    if (deviationMm > 3) {
      feedback =
        "Cutting trajectory deviating from marked line — maintain within 2mm tolerance";
    } else if (state.completionPct > 90) {
      feedback = "Controlled trajectory maintained — complete remaining arc";
      if (state.completionPct >= 95) {
        state.completed = true;
        phaseLabel = "Pattern cutting — complete";
      }
    } else {
      feedback = "Continue circumferential cut with steady dominant-hand motion";
    }
  }

  if (grasperTip && scissorsTip) {
    const bothMove =
      state.dominantPath.length >= 2 &&
      distance(
        state.dominantPath[state.dominantPath.length - 1],
        state.dominantPath[state.dominantPath.length - 2]
      ) > 8 &&
      grasperClosed;
    if (bothMove) {
      feedback =
        "Non-dominant instrument should provide consistent traction — avoid compensatory movement";
    }
  }

  return { state, feedback, phaseLabel };
}
