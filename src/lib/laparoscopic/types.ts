import type { Point2D, StabilityTrendPoint } from "@/lib/types";

export type FlsTaskId = "peg-transfer" | "pattern-cutting" | "knot-tying";

export type FlsBenchmarkResult = "PASS" | "BORDERLINE" | "NEEDS_PRACTICE";

export type InstrumentSide = "left" | "right";

export interface InstrumentState {
  side: InstrumentSide;
  tip: Point2D;
  shaftAngle: number;
  depth: number;
  graspClosed: boolean;
  pathLength: number;
}

export interface LapMetricTrend {
  label: string;
  value: number;
  unit: string;
  history: number[];
  threshold?: number;
  thresholdDirection?: "below" | "above";
  format?: (v: number) => string;
}

export interface LapFeedbackLine {
  text: string;
  severity: "info" | "caution" | "warning";
}

export interface LapErrorEvent {
  t: number;
  type: string;
  description: string;
}

export interface LapPhaseMarker {
  phase: string;
  startT: number;
  endT: number;
}

export type FlsSessionMode = "training" | "assessment";

export interface LapSessionReport {
  id: string;
  taskId: FlsTaskId;
  taskName: string;
  sessionMode: FlsSessionMode;
  attemptNumber: number;
  completedAt: string;
  benchmarkResult: FlsBenchmarkResult;
  weakestPhase: string;
  durationSeconds: number;
  errorCount: number;
  metrics: Record<string, LapMetricSnapshot>;
  feedbackLines: string[];
  recommendations: string[];
  stabilityTrend: StabilityTrendPoint[];
  phaseTimeline: LapPhaseMarker[];
  errorEvents: LapErrorEvent[];
  pathHeatmap: { width: number; height: number; cells: number[] };
  instrumentPathSamples: Point2D[];
}

export interface LapMetricSnapshot {
  value: number;
  unit: string;
  benchmark: number;
  benchmarkLabel: string;
  delta: number;
  passing: boolean;
}

export interface FlsProgress {
  pegTransferAttempts: number;
  patternCuttingUnlocked: boolean;
  knotTyingUnlocked: boolean;
  personalBests: Partial<
    Record<FlsTaskId, { timeSeconds?: number; score?: number }>
  >;
}

export interface PegTransferRing {
  id: number;
  pegIndex: number | null;
  heldBy: InstrumentSide | null;
  x: number;
  y: number;
  z: number;
  completed: boolean;
}

export interface PegTransferState {
  rings: PegTransferRing[];
  direction: "forward" | "reverse";
  currentRingIndex: number;
  phase: PegTransferPhase;
  drops: number;
  transferHeightErrors: number;
  midAirTransferStarted: boolean;
  startTime: number;
  elapsedMs: number;
  completed: boolean;
}

export type PegTransferPhase =
  | "approach_pickup"
  | "grasp_ring"
  | "lift_transfer"
  | "handoff"
  | "place_ring"
  | "complete";

export interface PatternCuttingState {
  cutProgress: number;
  meanDeviation: number;
  completionPct: number;
  dominantPath: Point2D[];
  nonDominantHeld: boolean;
  phase: string;
  completed: boolean;
}

export interface KnotTyingState {
  pathProgress: number;
  throwCount: number;
  phase: string;
  completed: boolean;
}
