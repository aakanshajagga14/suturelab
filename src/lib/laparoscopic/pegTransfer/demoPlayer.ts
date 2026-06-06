import type { ViewportGeometry } from "../viewportRenderer";
import { getPegGhostTargets } from "../ghostRenderer";
import { PEG_DEMO_NARRATION } from "./guidedSteps";

export interface DemoFrame {
  ghostRight: { x: number; y: number };
  ghostLeft: { x: number; y: number };
  narration: string;
  stepIndex: number;
}

const DEMO_DURATION_MS = 22000;
const STEP_MS = DEMO_DURATION_MS / 6;

export function getDemoProgress(startTime: number, now: number): number {
  return Math.min(1, (now - startTime) / DEMO_DURATION_MS);
}

export function isDemoComplete(startTime: number, now: number): boolean {
  return now - startTime >= DEMO_DURATION_MS;
}

export function getDemoFrame(
  geo: ViewportGeometry,
  startTime: number,
  now: number
): DemoFrame {
  const elapsed = now - startTime;
  const stepIndex = Math.min(5, Math.floor(elapsed / STEP_MS));
  const localT = (elapsed % STEP_MS) / STEP_MS;
  const ghosts = getPegGhostTargets(geo, stepIndex, 0, 3);

  const entryR = { x: geo.cx + geo.rx * 0.85, y: geo.cy + geo.ry * 0.9 };
  const entryL = { x: geo.cx - geo.rx * 0.85, y: geo.cy + geo.ry * 0.9 };
  const targetR = ghosts.ghostTips[0] ?? { x: geo.cx, y: geo.cy };
  const targetL =
    ghosts.ghostTips[1] ?? ghosts.ghostTips[0] ?? { x: geo.cx, y: geo.cy };

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  return {
    ghostRight: {
      x: lerp(entryR.x, targetR.x, localT),
      y: lerp(entryR.y, targetR.y, localT),
    },
    ghostLeft: {
      x: lerp(entryL.x, targetL.x, localT * 0.7),
      y: lerp(entryL.y, targetL.y, localT * 0.7),
    },
    narration: PEG_DEMO_NARRATION[stepIndex] ?? "",
    stepIndex,
  };
}
