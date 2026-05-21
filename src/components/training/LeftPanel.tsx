"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { PROCEDURAL_PHASES } from "@/lib/engines/phases";
import type { ProceduralPhaseInfo } from "@/lib/types";

interface LeftPanelProps {
  pathProgress: number;
  sessionActive: boolean;
  currentPhase: ProceduralPhaseInfo;
}

export function LeftPanel({
  pathProgress,
  sessionActive,
  currentPhase,
}: LeftPanelProps) {
  return (
    <aside className="flex flex-col gap-4">
      <Card title="Procedural Workflow" subtitle="Simple interrupted suture">
        <div className="mb-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-light)]/50 px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Active phase
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">
            {currentPhase.label}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {currentPhase.description}
          </p>
        </div>

        <ol className="space-y-3">
          {PROCEDURAL_PHASES.map((phase) => {
            const isActive = phase.id === currentPhase.id;
            const isComplete = pathProgress >= phase.progressEnd;
            return (
              <li key={phase.id} className="flex gap-3">
                <span className="mt-0.5 shrink-0">
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                  ) : isActive ? (
                    <Circle className="h-4 w-4 fill-[var(--accent)] text-[var(--accent)]" />
                  ) : (
                    <Circle className="h-4 w-4 text-[var(--border)]" />
                  )}
                </span>
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isActive
                        ? "text-[var(--foreground)]"
                        : "text-[var(--muted)]"
                    }`}
                  >
                    {phase.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {phase.description}
                  </p>
                  {isActive && sessionActive && (
                    <span className="mt-1.5 inline-block">
                    <Badge variant="info">
                      In progress
                    </Badge>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card title="Session Progress">
        <ProgressBar
          label="Procedural completion"
          value={pathProgress * 100}
          variant="accent"
        />
        <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">
          {sessionActive
            ? "Execute each procedural phase with controlled instrument movement along the guide path."
            : "Enable webcam access and initiate the exercise to begin performance analysis."}
        </p>
      </Card>

      <Card title="Clinical Reference" subtitle="Educational notes">
        <ul className="space-y-2 text-xs leading-relaxed text-[var(--muted)]">
          <li>• Maintain consistent instrument grip throughout passage</li>
          <li>• Minimize wrist translation during curved trajectory phase</li>
          <li>• Verify exit alignment before completing stabilization</li>
        </ul>
      </Card>
    </aside>
  );
}
