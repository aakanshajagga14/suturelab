import type { FlsTaskId, FlsSessionMode } from "./types";

export type { FlsSessionMode };

export type TrainingSubPhase =
  | "idle"
  | "positioning"
  | "demo"
  | "guided"
  | "free";

const MODE_KEY = "fls-session-mode";
const GUIDED_KEY = "fls-guided-progress";

export interface GuidedProgressStore {
  taskId: FlsTaskId;
  currentStep: number;
  completedSteps: boolean[];
  ringIndex: number;
  guidedComplete: boolean;
  demoSeen: boolean;
}

export function getFlsSessionMode(): FlsSessionMode {
  if (typeof window === "undefined") return "training";
  return localStorage.getItem(MODE_KEY) === "assessment"
    ? "assessment"
    : "training";
}

export function setFlsSessionMode(mode: FlsSessionMode): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(MODE_KEY, mode);
  }
}

export function loadGuidedProgress(taskId: FlsTaskId): GuidedProgressStore {
  if (typeof window === "undefined") {
    return defaultGuided(taskId);
  }
  try {
    const raw = localStorage.getItem(`${GUIDED_KEY}-${taskId}`);
    if (raw) return JSON.parse(raw) as GuidedProgressStore;
  } catch {
    /* ignore */
  }
  return defaultGuided(taskId);
}

export function saveGuidedProgress(progress: GuidedProgressStore): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(
      `${GUIDED_KEY}-${progress.taskId}`,
      JSON.stringify(progress)
    );
  }
}

function defaultGuided(taskId: FlsTaskId): GuidedProgressStore {
  return {
    taskId,
    currentStep: 0,
    completedSteps: Array(6).fill(false),
    ringIndex: 0,
    guidedComplete: false,
    demoSeen: false,
  };
}

/** SSR-safe default — use for useState initial value before hydrating from localStorage. */
export function createDefaultGuidedProgress(
  taskId: FlsTaskId
): GuidedProgressStore {
  return defaultGuided(taskId);
}

export function getInstrumentLabels(taskId: FlsTaskId): {
  left: string;
  right: string;
} {
  switch (taskId) {
    case "pattern-cutting":
      return { left: "L - Grasper", right: "R - Scissors" };
    case "knot-tying":
      return { left: "L - Grasper", right: "R - Driver" };
    default:
      return { left: "L - Grasper", right: "R - Maryland Grasper" };
  }
}
