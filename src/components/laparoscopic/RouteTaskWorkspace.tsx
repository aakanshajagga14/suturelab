"use client";

import { useEffect } from "react";
import { LapTaskWorkspace } from "@/components/laparoscopic/LapTaskWorkspace";
import { setFlsSessionMode } from "@/lib/laparoscopic/trainingMode";
import type { FlsSessionMode } from "@/lib/laparoscopic/trainingMode";
import type { FlsTaskId } from "@/lib/laparoscopic/types";

interface RouteTaskWorkspaceProps {
  taskId: FlsTaskId;
  mode: FlsSessionMode;
}

export function RouteTaskWorkspace({ taskId, mode }: RouteTaskWorkspaceProps) {
  useEffect(() => {
    setFlsSessionMode(mode);
  }, [mode]);

  return <LapTaskWorkspace key={taskId} taskId={taskId} initialMode={mode} />;
}
