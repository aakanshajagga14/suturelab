export class VelocityGate {
  private lastX = 0;
  private lastY = 0;
  private initialized = false;

  constructor(private maxVelocity: number = 0.04) {}

  filter(x: number, y: number): { x: number; y: number } {
    if (!this.initialized) {
      this.lastX = x;
      this.lastY = y;
      this.initialized = true;
      return { x, y };
    }

    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const velocity = Math.sqrt(dx * dx + dy * dy);

    if (velocity > this.maxVelocity) {
      const scale = this.maxVelocity / velocity;
      const clampedX = this.lastX + dx * scale;
      const clampedY = this.lastY + dy * scale;
      this.lastX = clampedX;
      this.lastY = clampedY;
      return { x: clampedX, y: clampedY };
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
