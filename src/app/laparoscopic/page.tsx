"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Lock, Activity } from "lucide-react";
import { TASK_META, FLS_BENCHMARKS } from "@/lib/laparoscopic/flsBenchmarks";
import { getFlsProgress } from "@/lib/laparoscopic/sessionStorage";
import {
  getFlsSessionMode,
  setFlsSessionMode,
  type FlsSessionMode,
} from "@/lib/laparoscopic/trainingMode";
import { ModeToggle } from "@/components/laparoscopic/ModeToggle";
import type { FlsProgress, FlsTaskId } from "@/lib/laparoscopic/types";

const TASK_ORDER: FlsTaskId[] = [
  "peg-transfer",
  "pattern-cutting",
  "knot-tying",
];

export default function LaparoscopicLandingPage() {
  const [progress, setProgress] = useState<FlsProgress | null>(null);
  const [mode, setMode] = useState<FlsSessionMode>("training");

  useEffect(() => {
    setProgress(getFlsProgress());
    setMode(getFlsSessionMode());
  }, []);

  const handleModeChange = (m: FlsSessionMode) => {
    setMode(m);
    setFlsSessionMode(m);
  };

  const unlocked = (id: FlsTaskId): boolean => {
    if (!progress) return id === "peg-transfer";
    if (id === "peg-transfer") return true;
    if (id === "pattern-cutting") return progress.patternCuttingUnlocked;
    return progress.knotTyingUnlocked;
  };

  return (
    <div className="page-enter mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-12 border-b border-[#1E2A35] pb-10">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#00D4AA]">
          SAGES-Validated Curriculum
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#E8EDF2]">
          Fundamentals of Laparoscopic Surgery
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B7F8F]">
          The FLS program is the global gold standard for laparoscopic surgical
          training. These tasks develop bimanual coordination, precision
          dissection, and intracorporeal suturing — competencies required for
          appendectomy, hernia repair, and bowel anastomosis.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-xs text-[#6B7F8F] hover:text-[#E8EDF2]"
          >
            ← Return to SutureLab dashboard
          </Link>
          <ModeToggle mode={mode} onChange={handleModeChange} />
        </div>
        <p className="mt-3 text-xs text-[#6B7F8F]">
          Default session mode:{" "}
          {mode === "training"
            ? "Training (guided steps, no time pressure)"
            : "Assessment (FLS-standard timed evaluation)"}
        </p>
      </header>

      <div className="grid gap-6">
        {TASK_ORDER.map((id, index) => {
          const meta = TASK_META[id];
          const open = unlocked(id);
          const best = progress?.personalBests[id];
          const bench =
            id === "peg-transfer"
              ? `FLS pass: <${FLS_BENCHMARKS["peg-transfer"].maxTimeSeconds}s, 0 drops`
              : id === "pattern-cutting"
                ? `Deviation <${FLS_BENCHMARKS["pattern-cutting"].maxMeanDeviationMm}mm`
                : `Precision >${FLS_BENCHMARKS["knot-tying"].minPrecision}`;

          return (
            <div
              key={id}
              className={`rounded-xl border bg-[#0D1117] p-6 transition-shadow ${
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
                    {meta.name}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-[#6B7F8F]">
                    {meta.description}
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
                    href={`/laparoscopic/${id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#00D4AA] px-5 py-2.5 text-sm font-medium text-[#0A0E12]"
                  >
                    Begin Session
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="text-xs text-[#6B7F8F]">
                    Complete Task 1 to unlock
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
            Webcam-based hand tracking maps pinch gestures to instrument grasp
            and fingertip position to instrument tips. Position both hands
            within frame with adequate lighting. This module reuses SutureLab
            stability and motion quality analysis engines.
          </p>
        </div>
      </div>
    </div>
  );
}
