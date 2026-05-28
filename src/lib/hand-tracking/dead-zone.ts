export class DeadZoneFilter {
  private lastX = 0;
  private lastY = 0;
  private initialized = false;

  constructor(private threshold: number = 0.008) {}

  filter(x: number, y: number): { x: number; y: number } {
    if (!this.initialized) {
      this.lastX = x;
      this.lastY = y;
      this.initialized = true;
      return { x, y };
    }

    const dx = Math.abs(x - this.lastX);
    const dy = Math.abs(y - this.lastY);

    if (dx < this.threshold && dy < this.threshold) {
      return { x: this.lastX, y: this.lastY };
    }

    this.lastX = x;
    this.lastY = y;
    return { x, y };
  }

  reset(): void {
    this.lastX = 0;
    this.lastY = 0;
    this.initialized = false;
  }
}
