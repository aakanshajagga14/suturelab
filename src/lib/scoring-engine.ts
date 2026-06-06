import type { PerformanceScores, Point2D } from "@/lib/types";
import { clamp } from "@/lib/utils/math";
import type { StabilityResult } from "@/lib/stability-engine";
import type { MotionQualityResult } from "@/lib/engines/motionQualityEngine";

export const PATH_THRESHOLD_PX = 42;

export interface PathMetrics {
  deviation: number;
  onPath: boolean;
  progress: number;
  lateralOffset: number;
}

export function computePathMetrics(
  finger: Point2D,
  path: Point2D[],
  currentProgress: number,
  canvasWidth: number
): PathMetrics {
  const { distance: dist, progress, closest } = getClosestPointOnPath(
    finger,
    path
  );
  const pathProgress = Math.max(currentProgress, progress);
  const onPath = dist <= PATH_THRESHOLD_PX;

  const thresholdNorm =
    PATH_THRESHOLD_PX * (canvasWidth > 0 ? 640 / canvasWidth : 1);

  const lateralOffset =
    path.length > 1
      ? Math.abs(finger.y - closest.y) / Math.max(1, thresholdNorm)
      : 0;

  return {
    deviation: dist,
    onPath,
    progress: pathProgress,
    lateralOffset,
  };
}

export function computePerformanceScores(
  path: PathMetrics,
  stability: StabilityResult,
  motion: MotionQualityResult,
  canvasWidth: number
): PerformanceScores {
  const thresholdNorm =
    PATH_THRESHOLD_PX * (canvasWidth > 0 ? 640 / canvasWidth : 1);

  const precision = clamp(
    Math.round(100 - (path.deviation / thresholdNorm) * 32),
    0,
    100
  );

  const motionControl = clamp(
    Math.round(motion.controlRating * 0.55 + motion.smoothnessScore * 0.45),
    0,
    100
  );

  const pacingFactor = motion.speedConsistent ? 1 : 0.85;
  const proceduralConsistency = clamp(
    Math.round(
      (path.onPath ? 88 : 58) * 0.35 +
        precision * 0.35 +
        motionControl * 0.2 +
        stability.score * 0.1 * pacingFactor
    ),
    0,
    100
  );

  return {
    precision,
    stability: stability.score,
    motionControl,
    proceduralConsistency,
    smoothness: motion.smoothnessScore,
    controlRating: motion.controlRating,
  };
}

function getClosestPointOnPath(point: Point2D, path: Point2D[]) {
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestIndex = 0;
  let closest: Point2D = path[0] ?? point;

  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const distance = Math.hypot(point.x - p.x, point.y - p.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
      closest = p;
    }
  }

  return {
    distance: bestDistance,
    closest,
    progress: path.length <= 1 ? 0 : bestIndex / (path.length - 1),
  };
}
