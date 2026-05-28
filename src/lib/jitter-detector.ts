import type { Point2D } from "@/lib/types";
import { distance, standardDeviation } from "@/lib/utils/math";

export interface JitterMetrics {
  wristJitter: number;
  fingerNoise: number;
  microMovementRate: number;
  suddenSpikeCount: number;
  combinedJitter: number;
}

const MICRO_MOVEMENT_MIN = 3;
const MICRO_MOVEMENT_MAX = 12;
const SUDDEN_SPIKE_THRESHOLD = 18;

/**
 * Frame-to-frame positional variance and micro-movement analysis.
 * Used by the stability engine for instrument tremor scoring.
 */
export function analyzeJitter(
  wristHistory: Point2D[],
  fingerHistory: Point2D[]
): JitterMetrics {
  const wristDeltas: number[] = [];
  for (let i = 1; i < wristHistory.length; i++) {
    wristDeltas.push(distance(wristHistory[i], wristHistory[i - 1]));
  }

  const fingerDeltas: number[] = [];
  for (let i = 1; i < fingerHistory.length; i++) {
    fingerDeltas.push(distance(fingerHistory[i], fingerHistory[i - 1]));
  }

  const wristJitter = standardDeviation(wristDeltas);
  const fingerNoise =
    fingerDeltas.length > 2 ? standardDeviation(fingerDeltas) : 0;

  const microCount = wristDeltas.filter(
    (d) => d > MICRO_MOVEMENT_MIN && d < MICRO_MOVEMENT_MAX
  ).length;
  const microMovementRate =
    wristDeltas.length > 0 ? microCount / wristDeltas.length : 0;

  const suddenSpikeCount = wristDeltas.filter(
    (d) => d > SUDDEN_SPIKE_THRESHOLD
  ).length;

  const combinedJitter = wristJitter * 0.65 + fingerNoise * 0.35;

  return {
    wristJitter,
    fingerNoise,
    microMovementRate,
    suddenSpikeCount,
    combinedJitter,
  };
}

/** Map jitter metrics to a 0–100 stability contribution before smoothing. */
export function rawStabilityFromJitter(metrics: JitterMetrics): number {
  return Math.max(
    0,
    Math.min(
      100,
      100 -
        metrics.combinedJitter * 420 -
        metrics.microMovementRate * 28 -
        metrics.suddenSpikeCount * 6
    )
  );
}

/** Instrument tremor index (0–100); higher is steadier. */
export function tremorIndexFromJitter(metrics: JitterMetrics): number {
  return rawStabilityFromJitter(metrics);
}
