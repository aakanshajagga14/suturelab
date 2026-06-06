import type { InstrumentState, PegTransferRing } from "../types";
import type { ViewportGeometry } from "../viewportRenderer";
import { pegCoords } from "./simulation";
import { distance } from "@/lib/utils/math";

const PROXIMITY = 40;

export interface GuidedStepContext {
  step: number;
  ringIndex: number;
  geo: ViewportGeometry;
  width: number;
  height: number;
  left: InstrumentState | null;
  right: InstrumentState | null;
  rings: PegTransferRing[];
  stepStartedAt: number;
  midlineY: number;
}

export interface GuidedStepResult {
  complete: boolean;
  feedback: string;
  ringAttached?: boolean;
  ringTransferred?: boolean;
}

export function evaluateGuidedStep(ctx: GuidedStepContext): GuidedStepResult {
  const ring = ctx.rings[ctx.ringIndex];
  const srcPeg = ctx.ringIndex;
  const tgtPeg = ctx.ringIndex + 3;
  const ringPos = pegCoords(srcPeg, ctx.geo);
  ringPos.y -= 28;
  const targetPos = pegCoords(tgtPeg, ctx.geo);
  targetPos.y -= 28;
  const centre = { x: ctx.geo.cx, y: ctx.midlineY };

  switch (ctx.step) {
    case 0: {
      const r = ctx.right;
      if (!r) {
        return {
          complete: false,
          feedback:
            "Move your right instrument toward Ring 1 — approach from above in a direct arc.",
        };
      }
      const d = distance(r.tip, ringPos);
      if (d < PROXIMITY) {
        return {
          complete: true,
          feedback: "Step complete — proceed to grasp.",
        };
      }
      return {
        complete: false,
        feedback:
          "Maintain this approach trajectory until the instrument tip reaches the ring.",
      };
    }
    case 1: {
      const r = ctx.right;
      if (!r?.graspClosed) {
        return {
          complete: false,
          feedback:
            "Close your right instrument (pinch thumb and index finger) at the ring position.",
        };
      }
      const d = distance(r.tip, ringPos);
      if (d < PROXIMITY) {
        ring.heldBy = "right";
        ring.pegIndex = null;
        return {
          complete: true,
          feedback: "Step complete — ring secured. Lift toward centre.",
          ringAttached: true,
        };
      }
      return {
        complete: false,
        feedback: "Grasp registered — align tip with ring before lifting.",
      };
    }
    case 2: {
      if (ring.heldBy !== "right") {
        return {
          complete: false,
          feedback: "Secure the ring in your right instrument before lifting.",
        };
      }
      if (ring.y < ctx.midlineY || ring.y < centre.y) {
        return {
          complete: true,
          feedback: "Step complete — adequate transfer height. Initiate handoff.",
        };
      }
      return {
        complete: false,
        feedback:
          "Lift the ring and move toward centre — keep above the midline.",
      };
    }
    case 3: {
      const l = ctx.left;
      const r = ctx.right;
      if (l?.graspClosed && ring.heldBy === "right") {
        const d = distance(l.tip, { x: ring.x, y: ring.y });
        if (d < PROXIMITY && r && !r.graspClosed) {
          ring.heldBy = "left";
          return {
            complete: true,
            feedback: "Step complete — transfer successful. Move to target peg.",
            ringTransferred: true,
          };
        }
      }
      return {
        complete: false,
        feedback:
          "Bring left instrument to centre, close to receive ring while opening right.",
      };
    }
    case 4: {
      const l = ctx.left;
      if (!l || ring.heldBy !== "left") {
        return {
          complete: false,
          feedback: "Maintain ring in left instrument while approaching target peg.",
        };
      }
      const d = distance(l.tip, targetPos);
      if (d < PROXIMITY) {
        return {
          complete: true,
          feedback: "Step complete — lower onto peg and release.",
        };
      }
      return {
        complete: false,
        feedback: "Transport ring to target peg with controlled trajectory.",
      };
    }
    case 5: {
      const l = ctx.left;
      const d = distance(
        l?.tip ?? { x: 0, y: 0 },
        targetPos
      );
      if (d < PROXIMITY + 10 && l && !l.graspClosed) {
        ring.pegIndex = tgtPeg;
        ring.heldBy = null;
        ring.completed = true;
        return {
          complete: true,
          feedback: "Step complete — ring placed. Proceeding to next transfer.",
        };
      }
      return {
        complete: false,
        feedback: "Lower ring onto peg, then open left instrument to release.",
      };
    }
    default:
      return { complete: false, feedback: "" };
  }
}

export function shouldShowHint(stepStartedAt: number, now: number): boolean {
  return now - stepStartedAt > 15000;
}
