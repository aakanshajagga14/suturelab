
export class BimanualSyncTracker {
  private leftVel: number[] = [];
  private rightVel: number[] = [];
  private prevLeft: { x: number; y: number } | null = null;
  private prevRight: { x: number; y: number } | null = null;

  reset(): void {
    this.leftVel = [];
    this.rightVel = [];
    this.prevLeft = null;
    this.prevRight = null;
  }

  sample(leftSpeed: number, rightSpeed: number): number {
    this.leftVel.push(leftSpeed);
    this.rightVel.push(rightSpeed);
    if (this.leftVel.length > 20) this.leftVel.shift();
    if (this.rightVel.length > 20) this.rightVel.shift();

    if (this.leftVel.length < 6) return 75;

    const n = this.leftVel.length;
    const meanL =
      this.leftVel.reduce((a, b) => a + b, 0) / n;
    const meanR =
      this.rightVel.reduce((a, b) => a + b, 0) / n;

    let cov = 0;
    let varL = 0;
    let varR = 0;
    for (let i = 0; i < n; i++) {
      const dl = this.leftVel[i] - meanL;
      const dr = this.rightVel[i] - meanR;
      cov += dl * dr;
      varL += dl * dl;
      varR += dr * dr;
    }

    const denom = Math.sqrt(varL * varR) || 0.001;
    const corr = cov / denom;
    const syncScore = Math.round(((corr + 1) / 2) * 100);
    return Math.max(0, Math.min(100, syncScore));
  }

  updatePositions(
    leftTip: { x: number; y: number } | null,
    rightTip: { x: number; y: number } | null
  ): number {
    let lv = 0;
    let rv = 0;
    if (leftTip) {
      if (this.prevLeft) {
        lv = Math.hypot(leftTip.x - this.prevLeft.x, leftTip.y - this.prevLeft.y);
      }
      this.prevLeft = { x: leftTip.x, y: leftTip.y };
    }
    if (rightTip) {
      if (this.prevRight) {
        rv = Math.hypot(rightTip.x - this.prevRight.x, rightTip.y - this.prevRight.y);
      }
      this.prevRight = { x: rightTip.x, y: rightTip.y };
    }
    return this.sample(lv, rv);
  }
}

export class PathLengthTracker {
  private totalCm = 0;
  private prevLeft: { x: number; y: number } | null = null;
  private prevRight: { x: number; y: number } | null = null;

  reset(): void {
    this.totalCm = 0;
    this.prevLeft = null;
    this.prevRight = null;
  }

  sample(
    left: { x: number; y: number } | null,
    right: { x: number; y: number } | null,
    pxToCm = 0.08
  ): number {
    if (left) {
      if (this.prevLeft) {
        this.totalCm +=
          Math.hypot(left.x - this.prevLeft.x, left.y - this.prevLeft.y) *
          pxToCm;
      }
      this.prevLeft = { x: left.x, y: left.y };
    }
    if (right) {
      if (this.prevRight) {
        this.totalCm +=
          Math.hypot(right.x - this.prevRight.x, right.y - this.prevRight.y) *
          pxToCm;
      }
      this.prevRight = { x: right.x, y: right.y };
    }
    return Math.round(this.totalCm);
  }

  getTotal(): number {
    return Math.round(this.totalCm);
  }
}

export class MetricHistoryBuffer {
  private buffers: Map<string, number[]> = new Map();
  private maxLen = 30;

  push(key: string, value: number): number[] {
    const buf = this.buffers.get(key) ?? [];
    buf.push(value);
    if (buf.length > this.maxLen) buf.shift();
    this.buffers.set(key, buf);
    return [...buf];
  }

  get(key: string): number[] {
    return [...(this.buffers.get(key) ?? [])];
  }

  reset(): void {
    this.buffers.clear();
  }
}

export function tremorFromStability(stabilityScore: number): number {
  return stabilityScore;
}

export function metricColorState(
  value: number,
  threshold: number,
  direction: "below" | "above"
): "pass" | "caution" | "fail" {
  const margin = threshold * 0.1;
  if (direction === "below") {
    if (value <= threshold) return "pass";
    if (value <= threshold + margin) return "caution";
    return "fail";
  }
  if (value >= threshold) return "pass";
  if (value >= threshold - margin) return "caution";
  return "fail";
}
