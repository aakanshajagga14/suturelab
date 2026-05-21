import { ProgressBar } from "@/components/ui/ProgressBar";
import { MiniSparkline } from "@/components/ui/MiniSparkline";

interface StabilityIndicatorProps {
  score: number;
  trend: number[];
  label?: string;
}

export function StabilityIndicator({
  score,
  trend,
  label = "Hand Stability",
}: StabilityIndicatorProps) {
  const status =
    score >= 75 ? "Stable" : score >= 50 ? "Moderate" : "Unstable";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
        <span
          className={`text-xs font-medium ${
            score >= 75
              ? "text-[var(--success)]"
              : score >= 50
                ? "text-[var(--warning)]"
                : "text-[var(--danger)]"
          }`}
        >
          {status}
        </span>
      </div>
      <ProgressBar value={score} showValue variant="accent" size="sm" />
      <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5">
        <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--muted)]">
          Live trend
        </p>
        <MiniSparkline data={trend} width={140} height={28} />
      </div>
    </div>
  );
}
