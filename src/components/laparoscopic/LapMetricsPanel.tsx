"use client";

import { MiniSparkline } from "@/components/ui/MiniSparkline";
import type { LapMetricTrend } from "@/lib/laparoscopic/types";
import type { FlsSessionMode } from "@/lib/laparoscopic/trainingMode";
import { metricColorState } from "@/lib/laparoscopic/bimanualMetrics";

interface LapMetricsPanelProps {
  metrics: LapMetricTrend[];
  timeElapsed: number;
  timeBenchmark?: number;
  phaseLabel: string;
  errorCount: number;
  mode: FlsSessionMode;
  layout?: "sidebar" | "bar";
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
  mode,
  layout = "sidebar",
}: LapMetricsPanelProps) {
  const isTraining = mode === "training";
  const remaining =
    !isTraining && timeBenchmark
      ? Math.max(0, timeBenchmark - timeElapsed)
      : null;

  const wrapperClass =
    layout === "bar"
      ? "grid w-full grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
      : "flex w-full flex-col gap-3";

  return (
    <aside className={wrapperClass}>
      <MetricBlock label="Procedural Phase" layout={layout}>
        <p className="font-[family-name:var(--font-dm-sans)] text-sm text-[#E8EDF2]">
          {phaseLabel}
        </p>
      </MetricBlock>

      {!isTraining && (
        <MetricBlock label="Session Timer" layout={layout} highlight>
          <p className="font-mono text-2xl text-[#F0A500]">
            {formatTime(timeElapsed)}
          </p>
          {remaining !== null && (
            <p className="mt-1 font-mono text-xs text-[#6B7F8F]">
              FLS benchmark: {formatTime(timeBenchmark!)}
            </p>
          )}
          <p className="mt-1 font-mono text-xs text-[#6B7F8F]">
            Errors: {errorCount}
          </p>
        </MetricBlock>
      )}

      {isTraining && (
        <MetricBlock label="Errors (practice)" layout={layout}>
          <p className="font-mono text-xl text-[#E8EDF2]">{errorCount}</p>
        </MetricBlock>
      )}

      <p
        className={`col-span-full text-[10px] uppercase tracking-widest text-[#6B7F8F] ${layout === "sidebar" ? "px-1" : ""}`}
      >
        {isTraining ? "Learning metrics" : "Performance metrics"}
      </p>

      {metrics.map((m) => {
        const showThreshold = !isTraining && m.threshold !== undefined;
        const colorKey =
          showThreshold && m.thresholdDirection
            ? metricColorState(m.value, m.threshold!, m.thresholdDirection)
            : "pass";
        return (
          <MetricBlock key={m.label} label={m.label} layout={layout}>
            <p
              className={`font-mono text-xl ${
                isTraining ? "text-[#00D4AA]" : stateColors[colorKey]
              }`}
            >
              {m.format ? m.format(m.value) : `${Math.round(m.value)}${m.unit}`}
            </p>
            <div className="mt-2">
              <MiniSparkline data={m.history} width={layout === "bar" ? 120 : 200} height={22} />
            </div>
          </MetricBlock>
        );
      })}
    </aside>
  );
}

function MetricBlock({
  label,
  children,
  layout,
  highlight,
}: {
  label: string;
  children: React.ReactNode;
  layout: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-[#0D1117] p-3 ${
        highlight ? "border-[#F0A500]/40" : "border-[#1E2A35]"
      } ${layout === "bar" ? "" : ""}`}
    >
      <p className="text-[10px] font-medium uppercase tracking-widest text-[#6B7F8F]">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
