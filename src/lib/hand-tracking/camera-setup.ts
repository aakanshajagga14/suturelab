export interface CameraSetupStatus {
  handDetection: "good" | "poor" | "waiting";
  lighting: "good" | "poor" | "waiting";
  bothHandsVisible: "good" | "poor" | "waiting";
  readyToBegin: boolean;
  holdProgress: number;
}

const CONFIDENCE_GOOD = 0.45;
const HOLD_MS = 800;
const LIGHTING_MIN = 35;
const LIGHTING_MAX = 245;

export function sampleFrameBrightness(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): number {
  const sampleW = Math.min(80, width);
  const sampleH = Math.min(60, height);
  const data = ctx.getImageData(
    Math.floor((width - sampleW) / 2),
    Math.floor((height - sampleH) / 2),
    sampleW,
    sampleH
  ).data;
  let sum = 0;
  const step = 4 * 8;
  for (let i = 0; i < data.length; i += step) {
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  const samples = Math.floor(data.length / step) || 1;
  return sum / samples;
}

export class CameraSetupGate {
  private goodSince: number | null = null;

  evaluate(params: {
    leftConfidence: number;
    rightConfidence: number;
    brightness: number;
    now: number;
  }): CameraSetupStatus {
    const { leftConfidence, rightConfidence, brightness, now } = params;
    const leftOk = leftConfidence >= CONFIDENCE_GOOD;
    const rightOk = rightConfidence >= CONFIDENCE_GOOD;
    const bothOk = leftOk && rightOk;
    const lightingOk =
      brightness >= LIGHTING_MIN && brightness <= LIGHTING_MAX;

    const handDetection: CameraSetupStatus["handDetection"] =
      leftOk || rightOk ? (bothOk ? "good" : "poor") : "waiting";
    const lighting: CameraSetupStatus["lighting"] = lightingOk
      ? "good"
      : brightness > 0
        ? "poor"
        : "waiting";
    const bothHandsVisible: CameraSetupStatus["bothHandsVisible"] = bothOk
      ? "good"
      : leftOk || rightOk
        ? "poor"
        : "waiting";

    if (bothOk && lightingOk) {
      if (this.goodSince === null) this.goodSince = now;
    } else {
      this.goodSince = null;
    }

    const holdProgress =
      this.goodSince === null
        ? 0
        : Math.min(1, (now - this.goodSince) / HOLD_MS);

    return {
      handDetection,
      lighting,
      bothHandsVisible,
      readyToBegin: holdProgress >= 1,
      holdProgress,
    };
  }

  reset(): void {
    this.goodSince = null;
  }
}
