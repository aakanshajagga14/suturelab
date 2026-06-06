import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { EMASmoother } from "./ema-smoother";
import { DeadZoneFilter } from "./dead-zone";
import { VelocityGate } from "./velocity-gate";
import { PinchDebouncer } from "./pinch-debouncer";
import type { Point2D } from "@/lib/types";

/*
  INSTRUMENT CONTROL TUNING GUIDE
  ================================
  If instruments are still too jittery:
    - Lower EMA alpha: 0.12 → 0.08
    - Increase dead zone threshold: 0.008 → 0.012
    - Decrease velocity gate max: 0.04 → 0.03

  If instruments feel laggy or sluggish to respond:
    - Raise EMA alpha: 0.12 → 0.20
    - Lower dead zone threshold: 0.008 → 0.005
    - Raise velocity gate max: 0.04 → 0.06

  If pinch gesture is hard to trigger:
    - Raise closeThreshold: 0.06 → 0.08
    - Lower minHoldFrames: 4 → 2

  If pinch keeps triggering accidentally:
    - Lower closeThreshold: 0.06 → 0.04
    - Raise minHoldFrames: 4 → 6
    - Increase hysteresis gap: openThreshold 0.10 → 0.14

  Recommended starting config for surgical sim: alpha=0.12, dz=0.008, vg=0.04
  Recommended for assessment mode (slightly more responsive): alpha=0.15, dz=0.006
*/

export interface InstrumentPipelineConfig {
  alpha?: number;
  deadZone?: number;
  maxVelocity?: number;
  closeThreshold?: number;
  openThreshold?: number;
  minHoldFrames?: number;
  keyPrefix?: string;
}

export interface InstrumentState {
  x: number;
  y: number;
  isGrasping: boolean;
  confidence: number;
  pinchDistance: number;
  smoothedLandmarks: Point2D[];
}

export class InstrumentPositionPipeline {
  private landmarkSmoother: EMASmoother;
  private deadZone: DeadZoneFilter;
  private velocityGate: VelocityGate;
  private pinchDebouncer: PinchDebouncer;
  private keyPrefix: string;

  constructor(config: InstrumentPipelineConfig = {}) {
    this.keyPrefix = config.keyPrefix ?? "";
    this.landmarkSmoother = new EMASmoother(config.alpha ?? 0.12);
    this.deadZone = new DeadZoneFilter(config.deadZone ?? 0.008);
    this.velocityGate = new VelocityGate(config.maxVelocity ?? 0.04);
    this.pinchDebouncer = new PinchDebouncer(
      config.closeThreshold ?? 0.06,
      config.openThreshold ?? 0.1,
      config.minHoldFrames ?? 4
    );
  }

  process(landmarks: NormalizedLandmark[]): InstrumentState {
    if (!landmarks || landmarks.length < 21) {
      return {
        x: 0.5,
        y: 0.5,
        isGrasping: false,
        confidence: 0,
        pinchDistance: 0.12,
        smoothedLandmarks: [],
      };
    }

    const p = this.keyPrefix;
    const smoothed = landmarks.map((lm, idx) => ({
      x: this.landmarkSmoother.smooth(`${p}lm${idx}_x`, lm.x),
      y: this.landmarkSmoother.smooth(`${p}lm${idx}_y`, lm.y),
      z: this.landmarkSmoother.smooth(`${p}lm${idx}_z`, lm.z ?? 0),
    }));

    const tip7 = smoothed[7];
    const tip8 = smoothed[8];
    const rawTipX = tip7 && tip8 ? (tip7.x + tip8.x) / 2 : smoothed[8]?.x ?? 0.5;
    const rawTipY = tip7 && tip8 ? (tip7.y + tip8.y) / 2 : smoothed[8]?.y ?? 0.5;

    const dzFiltered = this.deadZone.filter(rawTipX, rawTipY);
    const vgFiltered = this.velocityGate.filter(dzFiltered.x, dzFiltered.y);

    const thumb = smoothed[4] ?? { x: 0, y: 0 };
    const index = smoothed[8] ?? { x: 0, y: 0 };
    const isGrasping = this.pinchDebouncer.update(thumb, index);
    const pinchDistance = this.pinchDebouncer.pinchDistance(thumb, index);

    const vis8 = landmarks[8]?.visibility ?? 1;
    const vis4 = landmarks[4]?.visibility ?? 1;
    const confidence = Math.min(vis8, vis4);

    return {
      x: vgFiltered.x,
      y: vgFiltered.y,
      isGrasping,
      confidence,
      pinchDistance,
      smoothedLandmarks: smoothed.map(({ x, y }) => ({ x, y })),
    };
  }

  reset(): void {
    this.landmarkSmoother.reset();
    this.deadZone.reset();
    this.velocityGate.reset();
    this.pinchDebouncer.reset();
  }
}

/** Faster pickup for positioning; still stable enough for instrument control. */
export function createHandPipelines(mode: "training" | "assessment"): {
  left: InstrumentPositionPipeline;
  right: InstrumentPositionPipeline;
} {
  const responsive = mode === "assessment";
  const base = responsive
    ? { alpha: 0.22, deadZone: 0.004, maxVelocity: 0.07, minHoldFrames: 2, closeThreshold: 0.075 }
    : { alpha: 0.18, deadZone: 0.005, maxVelocity: 0.06, minHoldFrames: 2, closeThreshold: 0.075 };

  return {
    left: new InstrumentPositionPipeline({ ...base, keyPrefix: "L_" }),
    right: new InstrumentPositionPipeline({ ...base, keyPrefix: "R_" }),
  };
}
