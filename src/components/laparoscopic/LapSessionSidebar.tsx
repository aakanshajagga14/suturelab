"use client";

import { MiniSparkline } from "@/components/ui/MiniSparkline";
import { LapFeedbackBar } from "@/components/laparoscopic/LapFeedbackBar";
import { TrainingStepIndicator } from "@/components/laparoscopic/TrainingStepIndicator";
import type { LapMetricTrend } from "@/lib/laparoscopic/types";
import type { FlsSessionMode, TrainingSubPhase } from "@/lib/laparoscopic/trainingMode";
import { metricColorState } from "@/lib/laparoscopic/bimanualMetrics";

interface LapSessionSidebarProps {
  metrics: LapMetricTrend[];
  timeElapsed: number;
  timeBenchmark?: number;
  phaseLabel: string;
  errorCount: number;
  mode: FlsSessionMode;
  feedback: string;
  feedbackSeverity: "info" | "caution" | "warning";
  subPhase: TrainingSubPhase;
  guidedStep?: { current: number; total: number; title: string; instruction: string };
  trackingOk: boolean;
  bothHands: boolean;
}

export function LapSessionSidebar({
  metrics,
  timeElapsed,
  timeBenchmark,
  phaseLabel,
  errorCount,
  mode,
  feedback,
  feedbackSeverity,
  subPhase,
  guidedStep,
  trackingOk,
  bothHands,
}: LapSessionSidebarProps) {
  const isTraining = mode === "training";
  const remaining =
    !isTraining && timeBenchmark
      ? Math.max(0, timeBenchmark - timeElapsed)
      : null;

  return (
    <aside className="flex h-full min-h-0 w-full flex-col gap-2 lg:w-72 lg:shrink-0">
      <div className="shrink-0 rounded-lg border border-[#1E2A35] bg-[#0D1117] px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[#6B7F8F]">
            Tracking
          </p>
          <span
            className={`font-mono text-[10px] ${
              trackingOk && bothHands
                ? "text-[#2ECC71]"
                : trackingOk
                  ? "text-[#F0A500]"
                  : "text-[#6B7F8F]"
            }`}
          >
            {trackingOk && bothHands
              ? "BOTH HANDS"
              : trackingOk
                ? "PARTIAL"
                : "NO HANDS"}
          </span>
        </div>
        <p className="mt-1 text-xs text-[#E8EDF2]">{phaseLabel}</p>
        {!isTraining && (
          <p className="mt-1 font-mono text-lg text-[#F0A500]">
            {formatTime(timeElapsed)}
            {remaining !== null && (
              <span className="ml-2 text-xs text-[#6B7F8F]">
                / {formatTime(timeBenchmark!)}
              </span>
            )}
          </p>
        )}
        {isTraining && (
          <p className="mt-1 font-mono text-xs text-[#6B7F8F]">
            Practice errors: {errorCount}
          </p>
        )}
      </div>

      {guidedStep && subPhase === "guided" && (
        <div className="shrink-0 rounded-lg border border-[#00D4AA]/25 bg-[#0D1117] p-3">
          <TrainingStepIndicator
            current={guidedStep.current}
            total={guidedStep.total}
            title={guidedStep.title}
            inline
          />
          <p className="mt-2 text-xs leading-relaxed text-[#6B7F8F]">
            {guidedStep.instruction}
          </p>
        </div>
      )}

      <div className="shrink-0">
        <LapFeedbackBar message={feedback} severity={feedbackSeverity} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-[#1E2A35] bg-[#0D1117] p-2">
        <p className="px-1 pb-2 text-[10px] uppercase tracking-widest text-[#6B7F8F]">
          {isTraining ? "Live metrics" : "Assessment metrics"}
        </p>
        <div className="space-y-2">
          {metrics.map((m) => {
            const showThreshold = !isTraining && m.threshold !== undefined;
            const colorKey =
              showThreshold && m.thresholdDirection
                ? metricColorState(m.value, m.threshold!, m.thresholdDirection)
                : "pass";
            return (
              <div
                key={m.label}
                className="rounded-md border border-[#1E2A35]/80 px-2 py-2"
              >
                <p className="text-[10px] text-[#6B7F8F]">{m.label}</p>
                <p
                  className={`font-mono text-base ${
                    isTraining ? "text-[#00D4AA]" : metricTone[colorKey]
                  }`}
                >
                  {m.format ? m.format(m.value) : `${Math.round(m.value)}${m.unit}`}
                </p>
                <MiniSparkline data={m.history} width={240} height={18} />
              </div>
            );
          })}
          {metrics.length === 0 && (
            <p className="px-1 text-xs text-[#6B7F8F]">
              Metrics appear once the session starts.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

const metricTone = {
  pass: "text-[#2ECC71]",
  caution: "text-[#F0A500]",
  fail: "text-[#E84545]",
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
