import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { PhasePerformance } from "@/lib/types";

interface PhaseBreakdownProps {
  phases: PhasePerformance[];
  strongest: string;
  weakest: string;
}

export function PhaseBreakdown({
  phases,
  strongest,
  weakest,
}: PhaseBreakdownProps) {
  const active = phases.filter((p) => p.samples > 0);

  return (
    <Card title="Procedural Phase Analysis" subtitle="Performance by workflow phase">
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
          <p className="text-xs text-[var(--muted)]">Strongest phase</p>
          <p className="mt-0.5 text-sm font-medium text-[var(--success)]">
            {strongest}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
          <p className="text-xs text-[var(--muted)]">Area requiring focus</p>
          <p className="mt-0.5 text-sm font-medium text-[var(--warning)]">
            {weakest}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {active.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No phase data recorded for this session.
          </p>
        ) : (
          active.map((phase) => (
            <div key={phase.phaseId}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-[var(--foreground)]">
                  {phase.label}
                </span>
                <span className="text-[var(--muted)]">
                  {phase.averageScore}/100
                </span>
              </div>
              <ProgressBar value={phase.averageScore} showValue={false} />
              <p className="mt-1 text-xs text-[var(--muted)]">
                Avg deviation: {phase.avgDeviation}px · {phase.samples} samples
              </p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
