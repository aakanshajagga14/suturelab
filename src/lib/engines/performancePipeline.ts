import type {
  FeedbackMessage,
  LivePerformanceMetrics,
  Point2D,
  ProceduralPhaseInfo,
  PerformanceScores,
} from "@/lib/types";
import { StabilityEngine } from "./stabilityEngine";
import { MotionQualityEngine } from "./motionQualityEngine";
import {
  computePathMetrics,
  computePerformanceScores,
} from "./scoringEngine";
import { generateClinicalFeedback } from "./feedbackEngine";
import { getPhaseForProgress } from "./phases";
import { SessionAnalyticsRecorder } from "./analyticsEngine";

export interface PipelineFrameInput {
  fingerTip: Point2D | null;
  wrist: Point2D | null;
  path: Point2D[];
  pathProgress: number;
  canvasWidth: number;
  canvasHeight: number;
  timestamp: number;
}

export class PerformancePipeline {
  private stabilityEngine = new StabilityEngine();
  private motionEngine = new MotionQualityEngine();
  private recorder = new SessionAnalyticsRecorder();
  private pathProgress = 0;
  private prevPrecision = 0;
  private sessionActive = false;

  get analyticsRecorder(): SessionAnalyticsRecorder {
    return this.recorder;
  }

  resetSession(): void {
    this.stabilityEngine.reset();
    this.motionEngine.reset();
    this.recorder.reset();
    this.pathProgress = 0;
    this.prevPrecision = 0;
    this.sessionActive = true;
  }

  endSession(): void {
    this.sessionActive = false;
  }

  processFrame(input: PipelineFrameInput): LivePerformanceMetrics | null {
    const hasHand = Boolean(input.fingerTip);
    const phase: ProceduralPhaseInfo = getPhaseForProgress(
      hasHand ? Math.max(this.pathProgress, input.pathProgress) : this.pathProgress
    );

    const stability = this.stabilityEngine.analyze(
      input.wrist,
      input.fingerTip
    );
    const motion = this.motionEngine.analyze(input.fingerTip);

    let pathMetrics = {
      deviation: 0,
      onPath: false,
      progress: this.pathProgress,
      lateralOffset: 0,
    };

    if (input.fingerTip && input.path.length > 0) {
      pathMetrics = computePathMetrics(
        input.fingerTip,
        input.path,
        this.pathProgress,
        input.canvasWidth
      );
      this.pathProgress = pathMetrics.progress;
    }

    const scores: PerformanceScores = hasHand
      ? computePerformanceScores(
          pathMetrics,
          stability,
          motion,
          input.canvasWidth
        )
      : {
          precision: 0,
          stability: 0,
          motionControl: 0,
          proceduralConsistency: 0,
          smoothness: 0,
          controlRating: 0,
        };

    const feedback: FeedbackMessage[] = generateClinicalFeedback({
      path: pathMetrics,
      scores,
      stability,
      motion,
      phase,
      hasHand,
      prevPrecision: this.prevPrecision,
    });

    if (hasHand) {
      this.prevPrecision = scores.precision;
    }

    if (this.sessionActive && input.fingerTip) {
      this.recorder.recordFrame(
        input.fingerTip,
        pathMetrics.deviation,
        pathMetrics.onPath,
        pathMetrics.progress,
        phase.id,
        scores,
        input.canvasWidth,
        input.canvasHeight,
        input.timestamp
      );
    }

    return {
      scores,
      feedback,
      pathProgress: pathMetrics.progress,
      pathDeviation: pathMetrics.deviation,
      onPath: pathMetrics.onPath,
      phase,
      stabilityTrend: stability.trend,
      fps: 0,
      isTracking: hasHand,
      elapsedSeconds: 0,
    };
  }
}
