"use client";

import type { FlsSessionMode } from "@/lib/laparoscopic/trainingMode";

interface ModeToggleProps {
  mode: FlsSessionMode;
  onChange: (mode: FlsSessionMode) => void;
  disabled?: boolean;
}

export function ModeToggle({ mode, onChange, disabled }: ModeToggleProps) {
  return (
    <div
      className="inline-flex rounded-lg border border-[#1E2A35] bg-[#0D1117] p-0.5"
      role="group"
      aria-label="Session mode"
    >
      {(["training", "assessment"] as const).map((m) => (
        <button
          key={m}
          type="button"
          disabled={disabled}
          onClick={() => onChange(m)}
          className={`rounded-md px-4 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors ${
            mode === m
              ? m === "training"
                ? "bg-[#00D4AA]/20 text-[#00D4AA]"
                : "bg-[#F0A500]/20 text-[#F0A500]"
              : "text-[#6B7F8F] hover:text-[#E8EDF2]"
          } disabled:opacity-50`}
        >
          {m === "training" ? "Training Mode" : "Assessment Mode"}
        </button>
      ))}
    </div>
  );
}
