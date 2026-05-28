import type { Point2D } from "@/lib/types";
import { movingAverage, clamp } from "@/lib/utils/math";
import {
  analyzeJitter,
  rawStabilityFromJitter,
  type JitterMetrics,
} from "@/lib/jitter-detector";

const HISTORY_SIZE = 20;
const TREND_SIZE = 24;

export type { JitterMetrics };

export interface StabilityResult {
  score: number;
  jitter: number;
  microMovementRate: number;
  trend: number[];
  improved: boolean;
  unstable: boolean;
  jitterMetrics: JitterMetrics;
}

export class StabilityEngine {
  private wristHistory: Point2D[] = [];
  private fingerHistory: Point2D[] = [];
  private scoreHistory: number[] = [];
  private prevScore = 85;

  reset(): void {
    this.wristHistory = [];
    this.fingerHistory = [];
    this.scoreHistory = [];
    this.prevScore = 85;
  }

  analyze(wrist: Point2D | null, finger: Point2D | null): StabilityResult {
    if (wrist) {
      this.wristHistory.push(wrist);
      if (this.wristHistory.length > HISTORY_SIZE) this.wristHistory.shift();
    }
    if (finger) {
      this.fingerHistory.push(finger);
      if (this.fingerHistory.length > HISTORY_SIZE) this.fingerHistory.shift();
    }

    if (this.wristHistory.length < 4) {
      return {
        score: this.prevScore,
        jitter: 0,
        microMovementRate: 0,
        trend: [...this.scoreHistory],
        improved: false,
        unstable: false,
        jitterMetrics: {
          wristJitter: 0,
          fingerNoise: 0,
          microMovementRate: 0,
          suddenSpikeCount: 0,
          combinedJitter: 0,
        },
      };
    }

    const jitterMetrics = analyzeJitter(this.wristHistory, this.fingerHistory);
    let score = rawStabilityFromJitter(jitterMetrics);
    score = clamp(Math.round(score), 0, 100);

    const smoothed = Math.round(movingAverage([this.prevScore, score], 3));
    const improved = smoothed > this.prevScore + 2;
    const unstable = smoothed < 52;

    this.prevScore = smoothed;
    this.scoreHistory.push(smoothed);
    if (this.scoreHistory.length > TREND_SIZE) this.scoreHistory.shift();

    return {
      score: smoothed,
      jitter: jitterMetrics.combinedJitter,
      microMovementRate: jitterMetrics.microMovementRate,
      trend: [...this.scoreHistory],
      improved,
      unstable,
      jitterMetrics,
    };
  }
}
