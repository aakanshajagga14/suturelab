export class EMASmoother {
  private smoothed = new Map<string, number>();

  /** Lower alpha = more smoothing (surgical default 0.12). */
  constructor(private alpha: number = 0.12) {}

  smooth(key: string, value: number): number {
    const prev = this.smoothed.get(key) ?? value;
    const next = this.alpha * value + (1 - this.alpha) * prev;
    this.smoothed.set(key, next);
    return next;
  }

  reset(): void {
    this.smoothed.clear();
  }
}
