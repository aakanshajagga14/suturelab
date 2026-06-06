"use client";

interface LapFeedbackBarProps {
  message: string;
  severity?: "info" | "caution" | "warning";
}

const border = {
  info: "border-[#1E2A35]",
  caution: "border-[#F0A500]/40",
  warning: "border-[#E84545]/40",
};

export function LapFeedbackBar({
  message,
  severity = "info",
}: LapFeedbackBarProps) {
  return (
    <div
      className={`rounded-lg border bg-[#0D1117] px-3 py-2.5 ${border[severity]}`}
    >
      <p className="text-[10px] font-medium uppercase tracking-widest text-[#6B7F8F]">
        Simulator feedback
      </p>
      <p className="mt-1 font-[family-name:var(--font-dm-sans)] text-sm leading-relaxed text-[#E8EDF2]">
        {message}
      </p>
    </div>
  );
}
