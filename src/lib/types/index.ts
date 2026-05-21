export interface Point2D {
  x: number;
  y: number;
}

export interface HandLandmarks {
  landmarks: Point2D[];
  handedness: "Left" | "Right" | "Unknown";
  timestamp: number;
}

export interface PerformanceScores {
  precision: number;
  stability: number;
  motionControl: number;
  proceduralConsistency: number;
  smoothness: number;
  controlRating: number;
}

export type ProceduralPhaseId =
  | "needle_positioning"
  | "entry_alignment"
  | "stitch_trajectory"
  | "exit_stabilization";

export interface ProceduralPhaseInfo {
  id: ProceduralPhaseId;
  label: string;
  description: string;
  progressStart: number;
  progressEnd: number;
}

export interface PhasePerformance {
  phaseId: ProceduralPhaseId;
  label: string;
  averageScore: number;
  samples: number;
  avgDeviation: number;
  durationSeconds: number;
}

export interface SessionMetrics {
  accuracy: number;
  stability: number;
  smoothness: number;
  pathAdherence: number;
  elapsedSeconds: number;
  samplesOnPath: number;
  totalSamples: number;
}

export interface FeedbackMessage {
  id: string;
  type: "info" | "success" | "warning" | "error";
  text: string;
  timestamp: number;
  category?: "path" | "stability" | "motion" | "phase" | "pacing";
}

export interface ProcedureStep {
  id: number;
  title: string;
  description: string;
  status: "pending" | "active" | "completed";
}

export interface SessionSummary {
  accuracy: number;
  stability: number;
  smoothness: number;
  pathAdherence: number;
  durationSeconds: number;
  completedAt: string;
  improvements: string[];
  status: "completed" | "incomplete";
  scores: PerformanceScores;
}

export interface HeatmapData {
  width: number;
  height: number;
  cells: number[];
}

export interface StabilityTrendPoint {
  t: number;
  value: number;
}

export interface TimingAnalysis {
  totalSeconds: number;
  activeTrackingSeconds: number;
  averagePhaseSeconds: Record<ProceduralPhaseId, number>;
}

export interface SessionAnalytics extends SessionSummary {
  completionPercentage: number;
  averageDeviation: number;
  motionControl: number;
  proceduralConsistency: number;
  controlRating: number;
  stabilityTrend: StabilityTrendPoint[];
  phasePerformance: PhasePerformance[];
  strongestPhase: string;
  weakestPhase: string;
  heatmap: HeatmapData;
  timingAnalysis: TimingAnalysis;
  currentPhaseLabel?: string;
}

export interface FrameSample {
  timestamp: number;
  fingerTip: Point2D | null;
  pathDeviation: number;
  onPath: boolean;
  pathProgress: number;
  phaseId: ProceduralPhaseId;
  scores: PerformanceScores;
}

export interface TrackingState {
  isReady: boolean;
  isTracking: boolean;
  fps: number;
  error: string | null;
}

export interface LivePerformanceMetrics {
  scores: PerformanceScores;
  feedback: FeedbackMessage[];
  pathProgress: number;
  pathDeviation: number;
  onPath: boolean;
  phase: ProceduralPhaseInfo;
  stabilityTrend: number[];
  fps: number;
  isTracking: boolean;
  elapsedSeconds: number;
}
