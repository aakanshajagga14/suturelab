/**
 * Analysis engine modules — extensible for future procedures,
 * institution dashboards, and multilingual AI guidance layers.
 */
export { PerformancePipeline } from "./performancePipeline";
export { SessionAnalyticsRecorder } from "./analyticsEngine";
export { StabilityEngine } from "@/lib/stability-engine";
export { analyzeJitter, tremorIndexFromJitter } from "@/lib/jitter-detector";
export {
  computePathMetrics,
  computePerformanceScores,
} from "@/lib/scoring-engine";
export { MotionQualityEngine } from "./motionQualityEngine";
export { generateClinicalFeedback } from "./feedbackEngine";
export { PROCEDURAL_PHASES, getPhaseForProgress } from "./phases";
export { DeviationHeatmap, renderHeatmapFromData } from "./heatmapRenderer";
