"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Lock, Activity } from "lucide-react";
import { FLS_BENCHMARKS } from "@/lib/laparoscopic/flsBenchmarks";
import { useFlsProgress } from "@/hooks/use-client-storage";
import {
  setFlsSessionMode,
  type FlsSessionMode,
} from "@/lib/laparoscopic/trainingMode";
import { ModeToggle } from "@/components/laparoscopic/ModeToggle";
import type { FlsTaskId } from "@/lib/laparoscopic/types";
import {
  LAPAROSCOPIC_TASK_ORDER,
  LAPAROSCOPIC_TASKS,
} from "@/lib/laparoscopic/tasks";

interface TaskSelectionPageProps {
  defaultMode: FlsSessionMode;
}

export function TaskSelectionPage({ defaultMode }: TaskSelectionPageProps) {
  const progress = useFlsProgress();
  const [mode, setMode] = useState<FlsSessionMode>(() => defaultMode);

  useEffect(() => {
    setFlsSessionMode(defaultMode);
  }, [defaultMode]);

  const handleModeChange = (m: FlsSessionMode) => {
    setMode(m);
    setFlsSessionMode(m);
  };

  const unlocked = (id: FlsTaskId): boolean => {
    if (id === "peg-transfer") return true;
    if (id === "pattern-cutting") return progress.patternCuttingUnlocked;
    return progress.knotTyingUnlocked;
  };

  const routeBase = mode === "assessment" ? "/assessment" : "/training";

  return (
    <div className="page-enter mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-12 border-b border-[#1E2A35] pb-10">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#00D4AA]">
          Laparoscopic Simulation
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#E8EDF2]">
          {mode === "assessment" ? "Assessment Workflow" : "Training Session"}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B7F8F]">
          Select a laparoscopic task for webcam-based instrument tracking. The
          simulator emphasizes instrument stability, path efficiency, tremor,
          smoothness, economy of motion, dual-hand coordination, completion
          time, and procedural accuracy.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-xs text-[#6B7F8F] hover:text-[#E8EDF2]">
            Return to landing page
          </Link>
          <ModeToggle mode={mode} onChange={handleModeChange} />
        </div>
      </header>

      <div className="grid gap-6">
        {LAPAROSCOPIC_TASK_ORDER.map((id, index) => {
          const task = LAPAROSCOPIC_TASKS[id];
          const open = unlocked(id);
          const best = progress.personalBests[id];
          const bench =
            id === "peg-transfer"
              ? `FLS pass: <${FLS_BENCHMARKS["peg-transfer"].maxTimeSeconds}s, 0 drops`
              : id === "pattern-cutting"
                ? `Deviation <${FLS_BENCHMARKS["pattern-cutting"].maxMeanDeviationMm}mm`
                : `Precision >${FLS_BENCHMARKS["knot-tying"].minPrecision}`;

          return (
            <div
              key={id}
              className={`rounded-lg border bg-[#0D1117] p-6 transition-colors ${
                open
                  ? "border-[#1E2A35] hover:border-[#00D4AA]/30"
                  : "border-[#1E2A35]/50 opacity-60"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#6B7F8F]">
                      Task {index + 1}
                    </span>
                    {!open && <Lock className="h-3.5 w-3.5 text-[#6B7F8F]" />}
                  </div>
                  <h2 className="mt-1 text-lg font-semibold text-[#E8EDF2]">
                    {task.name}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-[#6B7F8F]">
                    {task.description}
                  </p>
                  <p className="mt-2 text-xs text-[#6B7F8F]">
                    {task.clinicalPurpose}
                  </p>
                  <p className="mt-2 text-xs text-[#6B7F8F]">{bench}</p>
                  {best?.timeSeconds !== undefined && (
                    <p className="mt-2 font-mono text-xs text-[#00D4AA]">
                      Personal best: {best.timeSeconds}s
                    </p>
                  )}
                </div>
                {open ? (
                  <Link
                    href={`${routeBase}/${id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#00D4AA] px-5 py-2.5 text-sm font-medium text-[#0A0E12]"
                  >
                    {mode === "assessment" ? "Begin Assessment" : "Begin Training"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="text-xs text-[#6B7F8F]">
                    Complete prior task to unlock
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-lg border border-[#1E2A35] bg-[#0D1117] p-5">
        <div className="flex items-start gap-3">
          <Activity className="h-5 w-5 shrink-0 text-[#00D4AA]" />
          <p className="text-xs leading-relaxed text-[#6B7F8F]">
            Webcam tracking maps pinch gestures to grasp state and fingertip
            motion to instrument-tip movement. Position both hands in frame
            with stable lighting before starting a session.
          </p>
        </div>
      </div>
    </div>
  );
}
