import type { Point2D } from "@/lib/types";

/** Flip x so coordinates match the mirrored selfie webcam the user sees. */
export function mirrorX(x: number): number {
  return 1 - x;
}

export function mirrorLandmarks(landmarks: Point2D[]): Point2D[] {
  return landmarks.map((lm) => ({ x: mirrorX(lm.x), y: lm.y }));
}

/** Lower screen x = user's left side in mirror view → left instrument slot. */
export function assignScreenSlots<T extends { tipNorm: Point2D }>(
  hands: T[]
): { left: T | null; right: T | null } {
  if (hands.length === 0) return { left: null, right: null };
  if (hands.length === 1) {
    const h = hands[0];
    return h.tipNorm.x < 0.5
      ? { left: h, right: null }
      : { left: null, right: h };
  }
  const sorted = [...hands].sort((a, b) => a.tipNorm.x - b.tipNorm.x);
  return { left: sorted[0], right: sorted[sorted.length - 1] };
}
