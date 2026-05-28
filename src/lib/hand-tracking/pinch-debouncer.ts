export class PinchDebouncer {
  private isGrasping = false;
  private graspHeldFrames = 0;
  private releaseHeldFrames = 0;

  constructor(
    private closeThreshold: number = 0.06,
    private openThreshold: number = 0.1,
    private minHoldFrames: number = 4
  ) {}

  update(
    thumbTip: { x: number; y: number },
    indexTip: { x: number; y: number }
  ): boolean {
    const dist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

    if (!this.isGrasping) {
      if (dist < this.closeThreshold) {
        this.graspHeldFrames++;
        if (this.graspHeldFrames >= this.minHoldFrames) {
          this.isGrasping = true;
          this.graspHeldFrames = 0;
        }
      } else {
        this.graspHeldFrames = 0;
      }
    } else if (dist > this.openThreshold) {
      this.releaseHeldFrames++;
      if (this.releaseHeldFrames >= this.minHoldFrames) {
        this.isGrasping = false;
        this.releaseHeldFrames = 0;
      }
    } else {
      this.releaseHeldFrames = 0;
    }

    return this.isGrasping;
  }

  /** Normalized thumb–index distance for UI feedback (0 = closed). */
  pinchDistance(
    thumbTip: { x: number; y: number },
    indexTip: { x: number; y: number }
  ): number {
    return Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
  }

  reset(): void {
    this.isGrasping = false;
    this.graspHeldFrames = 0;
    this.releaseHeldFrames = 0;
  }
}
