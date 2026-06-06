import type { FlsProgress, FlsTaskId, LapSessionReport } from "./types";

const PROGRESS_KEY = "fls-progress";
const SESSIONS_KEY = "fls-sessions";

export function getFlsProgress(): FlsProgress {
  if (typeof window === "undefined") {
    return defaultProgress();
  }
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return { ...defaultProgress(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultProgress();
}

function defaultProgress(): FlsProgress {
  return {
    pegTransferAttempts: 0,
    patternCuttingUnlocked: false,
    knotTyingUnlocked: false,
    personalBests: {},
  };
}

/** SSR-safe default — use for useState initial value before hydrating from localStorage. */
export function createDefaultFlsProgress(): FlsProgress {
  return defaultProgress();
}

export function saveFlsProgress(update: Partial<FlsProgress>): FlsProgress {
  const current = getFlsProgress();
  const next = { ...current, ...update };
  if (typeof window !== "undefined") {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
  }
  return next;
}

export function recordAttempt(taskId: FlsTaskId): FlsProgress {
  const p = getFlsProgress();
  if (taskId === "peg-transfer") {
    const attempts = p.pegTransferAttempts + 1;
    return saveFlsProgress({
      pegTransferAttempts: attempts,
      patternCuttingUnlocked: true,
      knotTyingUnlocked: attempts >= 1,
    });
  }
  if (taskId === "pattern-cutting") {
    return saveFlsProgress({ knotTyingUnlocked: true });
  }
  return p;
}

export function saveSession(report: LapSessionReport): void {
  if (typeof window === "undefined") return;
  const sessions = getAllSessions();
  sessions.push(report);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));

  const p = getFlsProgress();
  const bests = { ...p.personalBests };
  if (taskIdUsesTime(report.taskId) && report.durationSeconds) {
    const prev = bests[report.taskId]?.timeSeconds;
    if (!prev || report.durationSeconds < prev) {
      bests[report.taskId] = {
        ...bests[report.taskId],
        timeSeconds: report.durationSeconds,
      };
    }
  }
  saveFlsProgress({ personalBests: bests });
  recordAttempt(report.taskId);
}

function taskIdUsesTime(taskId: FlsTaskId): boolean {
  return taskId === "peg-transfer";
}

export function getAllSessions(): LapSessionReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as LapSessionReport[]) : [];
  } catch {
    return [];
  }
}

export function getSessionById(id: string): LapSessionReport | null {
  return getAllSessions().find((s) => s.id === id) ?? null;
}

export function generateSessionId(): string {
  return `fls-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
