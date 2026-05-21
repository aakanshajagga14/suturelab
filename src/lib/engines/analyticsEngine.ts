import type {
  FrameSample,
  PerformanceScores,
  PhasePerformance,
  ProceduralPhaseId,
  SessionAnalytics,
  SessionSummary,
  StabilityTrendPoint,
  TimingAnalysis,
} from "@/lib/types";
import { PROCEDURAL_PHASES } from "./phases";
import { DeviationHeatmap } from "./heatmapRenderer";
import { PATH_THRESHOLD_PX } from "@/lib/suturing/stitchPath";
import type { Point2D } from "@/lib/types";

interface PhaseAccumulator {
  scores: number[];
  deviations: number[];
  startTime: number | null;
  totalMs: number;
}

export class SessionAnalyticsRecorder {
  private samples: FrameSample[] = [];
  private heatmap = new DeviationHeatmap();
  private stabilityTrend: StabilityTrendPoint[] = [];
  private phaseAccum: Record<ProceduralPhaseId, PhaseAccumulator>;
  private onPathCount = 0;
  private totalSamples = 0;
  private startTime = Date.now();
  private lastTrendTime = 0;
  private trackingActiveMs = 0;
  private lastFrameTime = 0;

  constructor() {
    this.phaseAccum = this.initPhaseAccum();
  }

  private initPhaseAccum(): Record<ProceduralPhaseId, PhaseAccumulator> {
    const acc = {} as Record<ProceduralPhaseId, PhaseAccumulator>;
    for (const p of PROCEDURAL_PHASES) {
      acc[p.id] = {
        scores: [],
        deviations: [],
        startTime: null,
        totalMs: 0,
      };
    }
    return acc;
  }

  reset(): void {
    this.samples = [];
    this.heatmap.reset();
    this.stabilityTrend = [];
    this.phaseAccum = this.initPhaseAccum();
    this.onPathCount = 0;
    this.totalSamples = 0;
    this.startTime = Date.now();
    this.lastTrendTime = 0;
    this.trackingActiveMs = 0;
    this.lastFrameTime = 0;
  }

  recordFrame(
    finger: Point2D | null,
    pathDeviation: number,
    onPath: boolean,
    pathProgress: number,
    phaseId: ProceduralPhaseId,
    scores: PerformanceScores,
    canvasWidth: number,
    canvasHeight: number,
    timestamp: number
  ): void {
    if (finger) {
      const now = timestamp;
      if (this.lastFrameTime > 0) {
        this.trackingActiveMs += now - this.lastFrameTime;
      }
      this.lastFrameTime = now;
    }

    if (!finger) return;

    this.totalSamples++;
    if (onPath) this.onPathCount++;

    this.samples.push({
      timestamp,
      fingerTip: finger,
      pathDeviation,
      onPath,
      pathProgress,
      phaseId,
      scores: { ...scores },
    });

    if (!onPath && pathDeviation > PATH_THRESHOLD_PX * 0.5) {
      const intensity = Math.min(
        1,
        (pathDeviation - PATH_THRESHOLD_PX) / (PATH_THRESHOLD_PX * 2)
      );
      this.heatmap.recordDeviation(
        finger.x,
        finger.y,
        canvasWidth,
        canvasHeight,
        intensity + 0.2
      );
    }

    if (timestamp - this.lastTrendTime > 500) {
      this.stabilityTrend.push({
        t: Math.round((timestamp - this.startTime) / 1000),
        value: scores.stability,
      });
      this.lastTrendTime = timestamp;
      if (this.stabilityTrend.length > 120) this.stabilityTrend.shift();
    }

    const phase = this.phaseAccum[phaseId];
    const composite =
      (scores.precision +
        scores.stability +
        scores.motionControl +
        scores.proceduralConsistency) /
      4;
    phase.scores.push(composite);
    phase.deviations.push(pathDeviation);
    if (phase.startTime === null) phase.startTime = timestamp;
  }

  private avg(arr: number[]): number {
    return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
  }

  buildPhasePerformance(): PhasePerformance[] {
    return PROCEDURAL_PHASES.map((p) => {
      const acc = this.phaseAccum[p.id];
      const avgDev = this.avg(acc.deviations);
      const durationSeconds =
        acc.startTime !== null
          ? Math.max(0, Math.round((Date.now() - this.startTime) / 1000) * 0.25)
          : 0;

      return {
        phaseId: p.id,
        label: p.label,
        averageScore: Math.round(this.avg(acc.scores)),
        samples: acc.scores.length,
        avgDeviation: Math.round(avgDev * 10) / 10,
        durationSeconds:
          acc.scores.length > 0
            ? Math.max(1, Math.round(durationSeconds))
            : 0,
      };
    });
  }

  toAnalytics(completed: boolean): SessionAnalytics {
    const allScores = this.samples.map((s) => s.scores);
    const avgScores = (key: keyof PerformanceScores) =>
      Math.round(
        this.avg(allScores.map((s) => s[key]))
      );

    const deviations = this.samples.map((s) => s.pathDeviation);
    const avgDeviation = this.avg(deviations);

    const pathAdherence = this.totalSamples
      ? Math.round((this.onPathCount / this.totalSamples) * 100)
      : 0;

    const precision = avgScores("precision");
    const stability = avgScores("stability");
    const smoothness = avgScores("smoothness");
    const motionControl = avgScores("motionControl");
    const proceduralConsistency = avgScores("proceduralConsistency");
    const controlRating = avgScores("controlRating");

    const phasePerformance = this.buildPhasePerformance();
    const withSamples = phasePerformance.filter((p) => p.samples > 0);
    const strongest =
      withSamples.length > 0
        ? [...withSamples].sort((a, b) => b.averageScore - a.averageScore)[0]
            .label
        : "N/A";
    const weakest =
      withSamples.length > 0
        ? [...withSamples].sort((a, b) => a.averageScore - b.averageScore)[0]
            .label
        : "N/A";

    const lastProgress =
      this.samples.length > 0
        ? this.samples[this.samples.length - 1].pathProgress
        : 0;

    const improvements = this.buildImprovements({
      precision,
      stability,
      smoothness,
      pathAdherence,
      motionControl,
      proceduralConsistency,
      weakest,
    });

    const durationSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    const timingAnalysis: TimingAnalysis = {
      totalSeconds: durationSeconds,
      activeTrackingSeconds: Math.round(this.trackingActiveMs / 1000),
      averagePhaseSeconds: PROCEDURAL_PHASES.reduce(
        (acc, p) => {
          const perf = phasePerformance.find((x) => x.phaseId === p.id);
          acc[p.id] = perf?.durationSeconds ?? 0;
          return acc;
        },
        {} as Record<ProceduralPhaseId, number>
      ),
    };

    const base: SessionSummary = {
      accuracy: precision,
      stability,
      smoothness,
      pathAdherence,
      durationSeconds,
      completedAt: new Date().toISOString(),
      improvements,
      status: completed ? "completed" : "incomplete",
      scores: {
        precision,
        stability,
        motionControl,
        proceduralConsistency,
        smoothness,
        controlRating,
      },
    };

    return {
      ...base,
      completionPercentage: Math.round(lastProgress * 100),
      averageDeviation: Math.round(avgDeviation * 10) / 10,
      motionControl,
      proceduralConsistency,
      controlRating,
      stabilityTrend: [...this.stabilityTrend],
      phasePerformance,
      strongestPhase: strongest,
      weakestPhase: weakest,
      heatmap: this.heatmap.toData(),
      timingAnalysis,
    };
  }

  private buildImprovements(metrics: {
    precision: number;
    stability: number;
    smoothness: number;
    pathAdherence: number;
    motionControl: number;
    proceduralConsistency: number;
    weakest: string;
  }): string[] {
    const items: string[] = [];

    if (metrics.stability < 70) {
      items.push(
        "Increase wrist stabilization during instrument handling — consider supported forearm position"
      );
    }
    if (metrics.smoothness < 70) {
      items.push(
        "Practice continuous passage motion to reduce abrupt transitions along the stitch path"
      );
    }
    if (metrics.pathAdherence < 75) {
      items.push(
        "Focus on lateral trajectory control to minimize deviation from the demonstrated guide path"
      );
    }
    if (metrics.motionControl < 70) {
      items.push(
        "Reduce acceleration variability — maintain uniform procedural speed throughout each phase"
      );
    }
    if (metrics.proceduralConsistency < 70) {
      items.push(
        "Improve consistency across procedural phases, particularly during " +
          metrics.weakest.toLowerCase()
      );
    }
    if (items.length === 0) {
      items.push(
        "Performance metrics within acceptable training range — continue structured repetition for skill retention"
      );
    }

    return items;
  }
}
