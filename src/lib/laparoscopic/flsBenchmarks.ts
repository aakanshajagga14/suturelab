import type { FlsBenchmarkResult, FlsTaskId } from "./types";
import { LAPAROSCOPIC_TASKS } from "./tasks";

export const FLS_BENCHMARKS = {
  "peg-transfer": {
    maxTimeSeconds: 300,
    maxDrops: 0,
    maxPathLengthCm: 165,
    minBimanualSync: 60,
    minStability: 65,
    maxTransferHeightErrors: 1,
  },
  "pattern-cutting": {
    maxMeanDeviationMm: 2,
    minCompletionPct: 95,
    minNonDominantStability: 70,
    maxSimultaneousMovement: 0.08,
    minSmoothness: 65,
  },
  "knot-tying": {
    minPrecision: 75,
    minKnotSecurity: 70,
    correctThrows: 2,
    maxExcessMovement: 0.15,
  },
} as const;

export function evaluateBenchmark(
  taskId: FlsTaskId,
  metrics: Record<string, number>
): FlsBenchmarkResult {
  let passCount = 0;
  let total = 0;

  if (taskId === "peg-transfer") {
    const b = FLS_BENCHMARKS["peg-transfer"];
    total = 4;
    if ((metrics.timeSeconds ?? 999) <= b.maxTimeSeconds) passCount++;
    if ((metrics.drops ?? 99) <= b.maxDrops) passCount++;
    if ((metrics.pathLengthCm ?? 999) <= b.maxPathLengthCm) passCount++;
    if ((metrics.stability ?? 0) >= b.minStability) passCount++;
  } else if (taskId === "pattern-cutting") {
    const b = FLS_BENCHMARKS["pattern-cutting"];
    total = 4;
    if ((metrics.meanDeviationMm ?? 99) <= b.maxMeanDeviationMm) passCount++;
    if ((metrics.completionPct ?? 0) >= b.minCompletionPct) passCount++;
    if ((metrics.nonDominantStability ?? 0) >= b.minNonDominantStability)
      passCount++;
    if ((metrics.smoothness ?? 0) >= b.minSmoothness) passCount++;
  } else {
    const b = FLS_BENCHMARKS["knot-tying"];
    total = 3;
    if ((metrics.precision ?? 0) >= b.minPrecision) passCount++;
    if ((metrics.knotSecurity ?? 0) >= b.minKnotSecurity) passCount++;
    if ((metrics.throws ?? 0) >= b.correctThrows) passCount++;
  }

  if (passCount === total) return "PASS";
  if (passCount >= total - 1) return "BORDERLINE";
  return "NEEDS_PRACTICE";
}

export const TASK_META = Object.fromEntries(
  Object.entries(LAPAROSCOPIC_TASKS).map(([id, task]) => [
    id,
    {
      name: task.name,
      description: task.description,
      clinicalPurpose: task.clinicalPurpose,
    },
  ])
) as Record<
  FlsTaskId,
  { name: string; description: string; clinicalPurpose: string }
>;
