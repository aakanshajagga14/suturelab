import type { Point2D } from "@/lib/types";
import { distance, standardDeviation, clamp, movingAverage } from "@/lib/utils/math";

export interface MotionQualityResult {
  smoothnessScore: number;
  controlRating: number;
  accelerationSpike: boolean;
  abruptDirection: boolean;
  speedConsistent: boolean;
  avgSpeed: number;
}

export class MotionQualityEngine {
  private velocityHistory: number[] = [];
  private directionHistory: number[] = [];
  private prevFinger: Point2D | null = null;
  private prevVelocity = 0;

  reset(): void {
    this.velocityHistory = [];
    this.directionHistory = [];
    this.prevFinger = null;
    this.prevVelocity = 0;
  }

  analyze(finger: Point2D | null): MotionQualityResult {
    if (!finger) {
      return {
        smoothnessScore: 0,
        controlRating: 0,
        accelerationSpike: false,
        abruptDirection: false,
        speedConsistent: true,
        avgSpeed: 0,
      };
    }

    let accelerationSpike = false;
    let abruptDirection = false;

    if (this.prevFinger) {
      const vel = distance(finger, this.prevFinger);
      this.velocityHistory.push(vel);
      if (this.velocityHistory.length > 24) this.velocityHistory.shift();

      const accel = Math.abs(vel - this.prevVelocity);
      accelerationSpike = accel > 0.12 && vel > 0.04;

      const angle = Math.atan2(
        finger.y - this.prevFinger.y,
        finger.x - this.prevFinger.x
      );
      this.directionHistory.push(angle);
      if (this.directionHistory.length > 8) this.directionHistory.shift();

      if (this.directionHistory.length >= 4) {
        const recent = this.directionHistory.slice(-4);
        let maxDelta = 0;
        for (let i = 1; i < recent.length; i++) {
          let delta = Math.abs(recent[i] - recent[i - 1]);
          if (delta > Math.PI) delta = 2 * Math.PI - delta;
          maxDelta = Math.max(maxDelta, delta);
        }
        abruptDirection = maxDelta > 1.1;
      }

      this.prevVelocity = vel;
    }
    this.prevFinger = finger;

    const velStd = standardDeviation(this.velocityHistory);
    const avgSpeed = this.velocityHistory.length
      ? this.velocityHistory.reduce((a, b) => a + b, 0) /
        this.velocityHistory.length
      : 0;

    const smoothnessScore = clamp(
      Math.round(100 - velStd * 14 - (accelerationSpike ? 12 : 0)),
      0,
      100
    );

    const speedVariance = standardDeviation(this.velocityHistory);
    const speedConsistent = speedVariance < 0.035 || this.velocityHistory.length < 6;

    const controlRating = clamp(
      Math.round(
        movingAverage(
          [
            smoothnessScore,
            speedConsistent ? 88 : 62,
            abruptDirection ? 55 : 90,
          ],
          3
        )
      ),
      0,
      100
    );

    return {
      smoothnessScore,
      controlRating,
      accelerationSpike,
      abruptDirection,
      speedConsistent,
      avgSpeed,
    };
  }
}
