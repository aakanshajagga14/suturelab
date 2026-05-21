import type { Point2D } from "@/lib/types";
import { distance, movingAverage, standardDeviation, clamp } from "@/lib/utils/math";

const HISTORY_SIZE = 20;
const TREND_SIZE = 24;

export interface StabilityResult {
  score: number;
  jitter: number;
  microMovementRate: number;
  trend: number[];
  improved: boolean;
  unstable: boolean;
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
      };
    }

    const wristDeltas: number[] = [];
    for (let i = 1; i < this.wristHistory.length; i++) {
      wristDeltas.push(distance(this.wristHistory[i], this.wristHistory[i - 1]));
    }

    const fingerDeltas: number[] = [];
    for (let i = 1; i < this.fingerHistory.length; i++) {
      fingerDeltas.push(
        distance(this.fingerHistory[i], this.fingerHistory[i - 1])
      );
    }

    const wristJitter = standardDeviation(wristDeltas);
    const fingerNoise =
      fingerDeltas.length > 2 ? standardDeviation(fingerDeltas) : 0;

    const microThreshold = 3;
    const microCount = wristDeltas.filter((d) => d > microThreshold && d < 12).length;
    const microMovementRate =
      wristDeltas.length > 0 ? microCount / wristDeltas.length : 0;

    const suddenSpikes = wristDeltas.filter((d) => d > 18).length;
    const jitter = wristJitter * 0.65 + fingerNoise * 0.35;

    let score =
      100 -
      jitter * 420 -
      microMovementRate * 28 -
      suddenSpikes * 6;
    score = clamp(Math.round(score), 0, 100);

    const smoothed = Math.round(
      movingAverage([this.prevScore, score], 3)
    );
    const improved = smoothed > this.prevScore + 2;
    const unstable = smoothed < 52;

    this.prevScore = smoothed;
    this.scoreHistory.push(smoothed);
    if (this.scoreHistory.length > TREND_SIZE) this.scoreHistory.shift();

    return {
      score: smoothed,
      jitter,
      microMovementRate,
      trend: [...this.scoreHistory],
      improved,
      unstable,
    };
  }
}
