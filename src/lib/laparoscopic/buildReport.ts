import type { FlsTaskId, LapSessionReport, LapErrorEvent, LapPhaseMarker } from "./types";
import { evaluateBenchmark, FLS_BENCHMARKS, TASK_META } from "./flsBenchmarks";
import { generateSessionId } from "./sessionStorage";
import type { StabilityTrendPoint } from "@/lib/types";

export interface ReportInput {
  taskId: FlsTaskId;
  durationSeconds: number;
  metrics: Record<string, number>;
  feedbackHistory: string[];
  errorEvents: LapErrorEvent[];
  phaseTimeline: LapPhaseMarker[];
  stabilityTrend: StabilityTrendPoint[];
  pathSamples: { x: number; y: number }[];
  heatmapCells?: number[];
  attemptNumber: number;
}

export function buildLapSessionReport(input: ReportInput): LapSessionReport {
  const benchmarkResult = evaluateBenchmark(input.taskId, input.metrics);
  const meta = TASK_META[input.taskId];

  const recommendations = generateRecommendations(
    input.taskId,
    input.metrics,
    benchmarkResult
  );

  const metricsSnapshot: LapSessionReport["metrics"] = {};

  if (input.taskId === "peg-transfer") {
    const b = FLS_BENCHMARKS["peg-transfer"];
    metricsSnapshot.timeSeconds = snap(
      input.metrics.timeSeconds ?? input.durationSeconds,
      "s",
      b.maxTimeSeconds,
      "below",
      "FLS pass <300s"
    );
    metricsSnapshot.drops = snap(
      input.metrics.drops ?? 0,
      "",
      b.maxDrops,
      "below",
      "FLS pass 0 drops"
    );
    metricsSnapshot.pathLengthCm = snap(
      input.metrics.pathLengthCm ?? 0,
      "cm",
      b.maxPathLengthCm,
      "below",
      "Economy <165cm"
    );
    metricsSnapshot.stability = snap(
      input.metrics.stability ?? 0,
      "/100",
      b.minStability,
      "above",
      "Stability >65"
    );
    metricsSnapshot.bimanualSync = snap(
      input.metrics.bimanualSync ?? 0,
      "/100",
      b.minBimanualSync,
      "above",
      "Sync >60"
    );
  } else if (input.taskId === "pattern-cutting") {
    const b = FLS_BENCHMARKS["pattern-cutting"];
    metricsSnapshot.meanDeviationMm = snap(
      input.metrics.meanDeviationMm ?? 0,
      "mm",
      b.maxMeanDeviationMm,
      "below",
      "Within 2mm"
    );
    metricsSnapshot.completionPct = snap(
      input.metrics.completionPct ?? 0,
      "%",
      b.minCompletionPct,
      "above",
      ">95% cut"
    );
    metricsSnapshot.smoothness = snap(
      input.metrics.smoothness ?? 0,
      "/100",
      b.minSmoothness,
      "above",
      "Smoothness >65"
    );
  } else {
    const b = FLS_BENCHMARKS["knot-tying"];
    metricsSnapshot.precision = snap(
      input.metrics.precision ?? 0,
      "/100",
      b.minPrecision,
      "above",
      "Precision >75"
    );
    metricsSnapshot.knotSecurity = snap(
      input.metrics.knotSecurity ?? 0,
      "/100",
      b.minKnotSecurity,
      "above",
      "Security >70"
    );
  }

  const gridW = 32;
  const gridH = 24;
  const cells =
    input.heatmapCells ??
    buildHeatmapFromSamples(input.pathSamples, gridW, gridH);

  return {
    id: generateSessionId(),
    taskId: input.taskId,
    taskName: meta.name,
    attemptNumber: input.attemptNumber,
    completedAt: new Date().toISOString(),
    benchmarkResult,
    durationSeconds: input.durationSeconds,
    errorCount: input.errorEvents.length,
    metrics: metricsSnapshot,
    feedbackLines: input.feedbackHistory.slice(-5),
    recommendations,
    stabilityTrend: input.stabilityTrend,
    phaseTimeline: input.phaseTimeline,
    errorEvents: input.errorEvents,
    pathHeatmap: { width: gridW, height: gridH, cells },
    instrumentPathSamples: input.pathSamples,
  };
}

function snap(
  value: number,
  unit: string,
  benchmark: number,
  direction: "below" | "above",
  benchmarkLabel: string
) {
  const passing =
    direction === "below" ? value <= benchmark : value >= benchmark;
  return {
    value,
    unit,
    benchmark,
    benchmarkLabel,
    delta: value - benchmark,
    passing,
  };
}

function generateRecommendations(
  taskId: FlsTaskId,
  metrics: Record<string, number>,
  result: string
): string[] {
  const items: string[] = [];
  if (taskId === "peg-transfer") {
    if ((metrics.pathLengthCm ?? 0) > 140) {
      items.push(
        "Focus on reducing instrument path length — approach pegs in a direct arc rather than repositioning mid-field"
      );
    }
    if ((metrics.drops ?? 0) > 0) {
      items.push(
        "Practice mid-air handoff at elevated transfer height — drops indicate premature release or inadequate clearance"
      );
    }
    if ((metrics.bimanualSync ?? 100) < 65) {
      items.push(
        "Coordinate bimanual timing — non-dominant catcher should close before dominant instrument opens"
      );
    }
  } else if (taskId === "pattern-cutting") {
    if ((metrics.meanDeviationMm ?? 0) > 1.5) {
      items.push(
        "Stabilize non-dominant traction while dominant hand follows marked circle — deviation suggests coupled movement"
      );
    }
  } else {
    if ((metrics.precision ?? 100) < 75) {
      items.push(
        "Complete needle arc with wrist supination — incomplete drives are the most common error at this phase"
      );
    }
  }
  if (items.length === 0 && result !== "PASS") {
    items.push(
      "Continue structured repetition against FLS benchmarks — metric variability suggests inconsistent phase execution"
    );
  }
  if (items.length === 0) {
    items.push(
      "Performance within FLS passing parameters — maintain technique during timed repetition"
    );
  }
  return items.slice(0, 3);
}

function buildHeatmapFromSamples(
  samples: { x: number; y: number }[],
  w: number,
  h: number
): number[] {
  const cells = new Array(w * h).fill(0);
  if (samples.length === 0) return cells;

  const maxX = Math.max(...samples.map((s) => s.x), 1);
  const maxY = Math.max(...samples.map((s) => s.y), 1);

  for (const s of samples) {
    const col = Math.floor((s.x / maxX) * (w - 1));
    const row = Math.floor((s.y / maxY) * (h - 1));
    cells[row * w + col] += 1;
  }
  const max = Math.max(...cells, 1);
  return cells.map((c) => c / max);
}
