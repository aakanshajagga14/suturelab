"use client";

import { useSyncExternalStore } from "react";
import {
  createDefaultFlsProgress,
  getAllSessions,
  getFlsProgress,
  getSessionById,
} from "@/lib/laparoscopic/sessionStorage";
import {
  createDefaultGuidedProgress,
  loadGuidedProgress,
} from "@/lib/laparoscopic/trainingMode";
import type { FlsTaskId, FlsProgress, LapSessionReport } from "@/lib/laparoscopic/types";
import type { GuidedProgressStore } from "@/lib/laparoscopic/trainingMode";

const noopSubscribe = () => () => {};

function createCachedSnapshot<T>(
  read: () => T,
  getServerSnapshot: () => T
): { getSnapshot: () => T; getServerSnapshot: () => T } {
  let clientSnapshot = read();
  let clientKey = JSON.stringify(clientSnapshot);
  const serverSnapshot = getServerSnapshot();

  return {
    getSnapshot: () => {
      const next = read();
      const nextKey = JSON.stringify(next);
      if (nextKey !== clientKey) {
        clientKey = nextKey;
        clientSnapshot = next;
      }
      return clientSnapshot;
    },
    getServerSnapshot: () => serverSnapshot,
  };
}

const flsProgressStore = createCachedSnapshot(
  getFlsProgress,
  createDefaultFlsProgress
);

export function useFlsProgress(): FlsProgress {
  return useSyncExternalStore(
    noopSubscribe,
    flsProgressStore.getSnapshot,
    flsProgressStore.getServerSnapshot
  );
}

const guidedProgressStores = new Map<
  FlsTaskId,
  ReturnType<typeof createCachedSnapshot<GuidedProgressStore>>
>();

function getGuidedProgressStore(taskId: FlsTaskId) {
  let store = guidedProgressStores.get(taskId);
  if (!store) {
    store = createCachedSnapshot(
      () => loadGuidedProgress(taskId),
      () => createDefaultGuidedProgress(taskId)
    );
    guidedProgressStores.set(taskId, store);
  }
  return store;
}

export function useGuidedProgress(taskId: FlsTaskId): GuidedProgressStore {
  const store = getGuidedProgressStore(taskId);
  return useSyncExternalStore(
    noopSubscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
}

const lapSessionsStore = createCachedSnapshot<LapSessionReport[]>(
  () =>
    getAllSessions().sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
  () => []
);

export function useLapSessions(): LapSessionReport[] {
  return useSyncExternalStore(
    noopSubscribe,
    lapSessionsStore.getSnapshot,
    lapSessionsStore.getServerSnapshot
  );
}

const lapSessionStores = new Map<
  string,
  ReturnType<typeof createCachedSnapshot<LapSessionReport | null>>
>();

function getLapSessionStore(sessionId: string) {
  let store = lapSessionStores.get(sessionId);
  if (!store) {
    store = createCachedSnapshot(
      () => getSessionById(sessionId),
      () => null
    );
    lapSessionStores.set(sessionId, store);
  }
  return store;
}

export function useLapSession(sessionId: string): LapSessionReport | null {
  const store = getLapSessionStore(sessionId);
  return useSyncExternalStore(
    noopSubscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
}
