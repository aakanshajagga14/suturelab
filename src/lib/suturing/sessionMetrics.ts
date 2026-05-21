import type { SessionMetrics, SessionSummary } from "@/lib/types";

export class SessionMetricsAccumulator {
  private accuracySamples: number[] = [];
  private stabilitySamples: number[] = [];
  private smoothnessSamples: number[] = [];
  private onPathCount = 0;
  private totalSamples = 0;
  private startTime = Date.now();

  record(
    accuracy: number,
    stability: number,
    smoothness: number,
    onPath: boolean
  ): void {
    this.accuracySamples.push(accuracy);
    this.stabilitySamples.push(stability);
    this.smoothnessSamples.push(smoothness);
    this.totalSamples++;
    if (onPath) this.onPathCount++;
  }

  getMetrics(): SessionMetrics {
    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

    return {
      accuracy: Math.round(avg(this.accuracySamples)),
      stability: Math.round(avg(this.stabilitySamples)),
      smoothness: Math.round(avg(this.smoothnessSamples)),
      pathAdherence: this.totalSamples
        ? Math.round((this.onPathCount / this.totalSamples) * 100)
        : 0,
      elapsedSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      samplesOnPath: this.onPathCount,
      totalSamples: this.totalSamples,
    };
  }

  toSummary(completed: boolean): SessionSummary {
    const m = this.getMetrics();
    const improvements: string[] = [];

    if (m.stability < 70) {
      improvements.push(
        "Practice stabilizing wrist position before initiating each stitch"
      );
    }
    if (m.smoothness < 70) {
      improvements.push(
        "Focus on continuous, controlled finger movement along the guide path"
      );
    }
    if (m.pathAdherence < 75) {
      improvements.push(
        "Align index finger trajectory more closely with the demonstrated stitch line"
      );
    }
    if (m.accuracy < 70) {
      improvements.push(
        "Reduce deviation from the target path during needle passage simulation"
      );
    }
    if (improvements.length === 0) {
      improvements.push(
        "Continue practicing to maintain consistency across multiple stitch repetitions"
      );
    }

    return {
      accuracy: m.accuracy,
      stability: m.stability,
      smoothness: m.smoothness,
      pathAdherence: m.pathAdherence,
      durationSeconds: m.elapsedSeconds,
      completedAt: new Date().toISOString(),
      improvements,
      status: completed ? "completed" : "incomplete",
      scores: {
        precision: m.accuracy,
        stability: m.stability,
        motionControl: m.smoothness,
        proceduralConsistency: m.pathAdherence,
        smoothness: m.smoothness,
        controlRating: m.smoothness,
      },
    };
  }
}
