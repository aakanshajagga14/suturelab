export interface Point2D {
  x: number;
  y: number;
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

export interface PerformanceScores {
  precision: number;
  stability: number;
  motionControl: number;
  proceduralConsistency: number;
  smoothness: number;
  controlRating: number;
}
