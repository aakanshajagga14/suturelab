import type {
  InstrumentState,
  PegTransferRing,
  PegTransferState,
  LapErrorEvent,
  LapPhaseMarker,
} from "../types";
import type { ViewportGeometry } from "../viewportRenderer";
import { distance } from "@/lib/utils/math";

const PICKUP_RADIUS = 36;
const PLACE_RADIUS = 40;
const MIN_TRANSFER_HEIGHT = 0.25;

export const PEG_POSITIONS = [
  { x: 0.32, y: 0.38 },
  { x: 0.32, y: 0.5 },
  { x: 0.32, y: 0.62 },
  { x: 0.68, y: 0.38 },
  { x: 0.68, y: 0.5 },
  { x: 0.68, y: 0.62 },
];

export function createInitialPegState(): PegTransferState {
  const rings: PegTransferRing[] = Array.from({ length: 3 }, (_, i) => ({
    id: i,
    pegIndex: i,
    heldBy: null,
    x: 0,
    y: 0,
    z: 0,
    completed: false,
  }));

  return {
    rings,
    direction: "forward",
    currentRingIndex: 0,
    phase: "approach_pickup",
    drops: 0,
    transferHeightErrors: 0,
    midAirTransferStarted: false,
    startTime: Date.now(),
    elapsedMs: 0,
    completed: false,
  };
}

export function pegCoords(
  pegIndex: number,
  geo: ViewportGeometry
): { x: number; y: number } {
  const p = PEG_POSITIONS[pegIndex];
  return {
    x: geo.cx + (p.x - 0.5) * geo.rx * 2,
    y: geo.cy + (p.y - 0.5) * geo.ry * 2,
  };
}

export function syncRingPositions(
  state: PegTransferState,
  geo: ViewportGeometry,
  left: InstrumentState | null,
  right: InstrumentState | null
): void {
  for (const ring of state.rings) {
    if (ring.heldBy === "left" && left) {
      ring.x = left.tip.x;
      ring.y = left.tip.y;
      ring.z = left.depth;
    } else if (ring.heldBy === "right" && right) {
      ring.x = right.tip.x;
      ring.y = right.tip.y;
      ring.z = right.depth;
    } else if (ring.pegIndex !== null) {
      const c = pegCoords(ring.pegIndex, geo);
      ring.x = c.x;
      ring.y = c.y - 28;
      ring.z = 0;
    }
  }
}

function sourcePegForRing(ringId: number, direction: "forward" | "reverse"): number {
  if (direction === "forward") return ringId;
  return ringId + 3;
}

function targetPegForRing(ringId: number, direction: "forward" | "reverse"): number {
  if (direction === "forward") return ringId + 3;
  return ringId;
}

export interface PegTransferUpdateResult {
  state: PegTransferState;
  feedback: string;
  phaseLabel: string;
  events: LapErrorEvent[];
}

export function updatePegTransfer(
  state: PegTransferState,
  left: InstrumentState | null,
  right: InstrumentState | null,
  geo: ViewportGeometry,
  elapsedSec: number
): PegTransferUpdateResult {
  const events: LapErrorEvent[] = [];
  let feedback =
    "Position both instruments within the laparoscopic field of view";
  let phaseLabel = "Awaiting instrument tracking";

  state.elapsedMs = Date.now() - state.startTime;
  syncRingPositions(state, geo, left, right);

  if (!left && !right) {
    return { state, feedback, phaseLabel, events };
  }

  const idx = state.currentRingIndex % 3;
  const step = state.currentRingIndex;

  if (state.completed) {
    return {
      state,
      feedback: "Peg transfer sequence complete. End session to generate report.",
      phaseLabel: "Complete",
      events,
    };
  }

  const ring = state.rings[idx];
  const dir =
    step < 3 ? "forward" : "reverse";
  const srcPeg = sourcePegForRing(idx, dir);
  const tgtPeg = targetPegForRing(idx, dir);
  const src = pegCoords(srcPeg, geo);
  const tgt = pegCoords(tgtPeg, geo);

  const dominant: InstrumentState | null = right ?? left;
  const nonDom: InstrumentState | null =
    right && left ? (ring.heldBy === "right" ? left : right) : null;

  switch (state.phase) {
    case "approach_pickup": {
      phaseLabel = `Transfer ${step + 1}/6 — Approach source peg`;
      feedback =
        "Close grasper on ring at source peg — maintain instrument tip stability during approach";
      const inst = dominant;
      if (inst?.graspClosed && ring.pegIndex === srcPeg) {
        const d = distance(inst.tip, { x: src.x, y: src.y - 28 });
        if (d < PICKUP_RADIUS) {
          state.phase = "grasp_ring";
        }
      }
      break;
    }
    case "grasp_ring": {
      phaseLabel = `Transfer ${step + 1}/6 — Grasp and lift`;
      if (dominant?.graspClosed) {
        ring.heldBy = dominant.side;
        ring.pegIndex = null;
        state.phase = "lift_transfer";
        feedback =
          "Lift ring to adequate transfer height before mid-air handoff — low transfer increases collision risk";
      } else {
        feedback = "Maintain closed grasper until ring is secured";
      }
      break;
    }
    case "lift_transfer": {
      phaseLabel = `Transfer ${step + 1}/6 — Transfer elevation`;
      if (ring.z < MIN_TRANSFER_HEIGHT && ring.heldBy) {
        if (!state.midAirTransferStarted) {
          state.transferHeightErrors++;
          events.push({
            t: elapsedSec,
            type: "transfer_height",
            description: "Transfer height below safe threshold",
          });
        }
      }
      if (ring.z >= MIN_TRANSFER_HEIGHT) {
        state.midAirTransferStarted = true;
        state.phase = "handoff";
        feedback =
          "Initiate handoff — release dominant instrument while non-dominant grasper closes on ring";
      } else {
        feedback =
          "Elevate ring before handoff — insufficient clearance from tissue plane";
      }
      break;
    }
    case "handoff": {
      phaseLabel = `Ring ${idx + 1}/6 — Bimanual handoff`;
      const catcher = nonDom ?? (left && right ? left : null);
      if (catcher?.graspClosed && ring.heldBy !== catcher.side) {
        const d = distance(catcher.tip, { x: ring.x, y: ring.y });
        if (d < PICKUP_RADIUS && dominant && !dominant.graspClosed) {
          ring.heldBy = catcher.side;
          state.phase = "place_ring";
          feedback = "Transport ring to target peg with controlled instrument trajectory";
        }
      } else {
        feedback =
          "Non-dominant instrument should secure ring before dominant release — coordinate timing";
      }
      if (dominant?.graspClosed === false && ring.heldBy && catcher && !catcher.graspClosed) {
        const dropped = ring.pegIndex === null && ring.y > geo.cy + geo.ry * 0.3;
        if (dropped) {
          state.drops++;
          ring.heldBy = null;
          ring.pegIndex = null;
          events.push({ t: elapsedSec, type: "drop", description: "Ring dropped during transfer" });
          state.phase = "approach_pickup";
          feedback = "Ring dropped — recover and re-attempt transfer with elevated handoff";
        }
      }
      break;
    }
    case "place_ring": {
      phaseLabel = `Ring ${idx + 1}/6 — Placement`;
      const placer = ring.heldBy === "left" ? left : right;
      if (placer) {
        const d = distance(placer.tip, { x: tgt.x, y: tgt.y - 28 });
        if (d < PLACE_RADIUS && !placer.graspClosed) {
          ring.pegIndex = tgtPeg;
          ring.heldBy = null;
          ring.completed = true;
          state.midAirTransferStarted = false;
          state.currentRingIndex++;
          if (state.currentRingIndex >= 6) {
            state.completed = true;
            state.phase = "complete";
          }
          state.phase = "approach_pickup";
          feedback = "Placement confirmed — proceed to next ring";
        } else {
          feedback = "Align instrument tip with target peg before opening grasper";
        }
      }
      break;
    }
    case "complete":
      phaseLabel = "Sequence complete";
      feedback = "All peg transfers completed per FLS protocol";
      break;
  }

  return { state, feedback, phaseLabel, events };
}

export function buildPegPhaseTimeline(
  elapsedSec: number,
  phases: LapPhaseMarker[]
): LapPhaseMarker[] {
  return phases;
}
