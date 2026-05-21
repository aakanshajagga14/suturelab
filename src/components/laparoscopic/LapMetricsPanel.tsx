"use client";

import { MiniSparkline } from "@/components/ui/MiniSparkline";
import type { LapMetricTrend } from "@/lib/laparoscopic/types";
import { metricColorState } from "@/lib/laparoscopic/bimanualMetrics";

interface LapMetricsPanelProps {
  metrics: LapMetricTrend[];
  timeElapsed: number;
  timeBenchmark?: number;
  phaseLabel: string;
  errorCount: number;
}

const stateColors = {
  pass: "text-[#2ECC71]",
  caution: "text-[#F0A500]",
  fail: "text-[#E84545]",
};

export function LapMetricsPanel({
  metrics,
  timeElapsed,
  timeBenchmark,
  phaseLabel,
  errorCount,
}: LapMetricsPanelProps) {
  const remaining = timeBenchmark
    ? Math.max(0, timeBenchmark - timeElapsed)
    : null;

  return (
    <aside className="flex w-full flex-col gap-4 lg:w-72">
      <div className="rounded-lg border border-[#1E2A35] bg-[#0D1117] p-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#6B7F8F]">
          Procedural Phase
        </p>
        <p className="mt-1 font-[family-name:var(--font-dm-sans)] text-sm text-[#E8EDF2]">
          {phaseLabel}
        </p>
      </div>

      <div className="rounded-lg border border-[#1E2A35] bg-[#0D1117] p-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#6B7F8F]">
          Time
        </p>
        <p className="mt-1 font-mono text-2xl text-[#00D4AA]">
          {formatTime(timeElapsed)}
        </p>
        {remaining !== null && (
          <p className="mt-1 font-mono text-xs text-[#6B7F8F]">
            Remaining vs FLS: {formatTime(remaining)}
          </p>
        )}
        <p className="mt-2 font-mono text-xs text-[#6B7F8F]">
          Errors: {errorCount}
        </p>
      </div>

      {metrics.map((m) => {
        const colorKey =
          m.threshold !== undefined && m.thresholdDirection
            ? metricColorState(m.value, m.threshold, m.thresholdDirection)
            : "pass";
        return (
          <div
            key={m.label}
            className="rounded-lg border border-[#1E2A35] bg-[#0D1117] p-4 transition-opacity duration-300"
          >
            <p className="text-[10px] font-medium uppercase tracking-widest text-[#6B7F8F]">
              {m.label}
            </p>
            <p
              className={`mt-1 font-mono text-xl ${stateColors[colorKey]}`}
            >
              {m.format ? m.format(m.value) : `${Math.round(m.value)}${m.unit}`}
            </p>
            <div className="mt-2">
              <MiniSparkline
                data={m.history}
                width={200}
                height={24}
                className="opacity-80"
              />
            </div>
          </div>
        );
      })}
    </aside>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
