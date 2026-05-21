"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, FileText } from "lucide-react";
import { getSessionById } from "@/lib/laparoscopic/sessionStorage";
import type { LapSessionReport, FlsBenchmarkResult } from "@/lib/laparoscopic/types";
import { StabilityChart } from "@/components/analytics/StabilityChart";
import { renderHeatmapFromData } from "@/lib/engines/heatmapRenderer";
import { useRef } from "react";

const resultStyles: Record<FlsBenchmarkResult, string> = {
  PASS: "text-[#2ECC71] border-[#2ECC71]/30",
  BORDERLINE: "text-[#F0A500] border-[#F0A500]/30",
  NEEDS_PRACTICE: "text-[#E84545] border-[#E84545]/30",
};

const resultLabel: Record<FlsBenchmarkResult, string> = {
  PASS: "PASS",
  BORDERLINE: "BORDERLINE",
  NEEDS_PRACTICE: "NEEDS PRACTICE",
};

interface LapSessionReportViewProps {
  sessionId: string;
}

export function LapSessionReportView({ sessionId }: LapSessionReportViewProps) {
  const [report, setReport] = useState<LapSessionReport | null>(null);
  const heatmapRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setReport(getSessionById(sessionId));
  }, [sessionId]);

  useEffect(() => {
    if (!report || !heatmapRef.current) return;
    const canvas = heatmapRef.current;
    canvas.width = 480;
    canvas.height = 270;
    renderHeatmapFromData(canvas, report.pathHeatmap);
  }, [report]);

  if (!report) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <FileText className="mx-auto h-10 w-10 text-[#6B7F8F]" />
        <p className="mt-4 text-[#6B7F8F]">Session record not found.</p>
        <Link href="/laparoscopic" className="mt-6 inline-block text-[#00D4AA]">
          Return to FLS module
        </Link>
      </div>
    );
  }

  const date = new Date(report.completedAt).toLocaleString();

  return (
    <div className="page-enter mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-10 border-b border-[#1E2A35] pb-8">
        <p className="text-[10px] uppercase tracking-widest text-[#6B7F8F]">
          Clinical Performance Report
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{report.taskName}</h1>
        <p className="mt-1 text-sm text-[#6B7F8F]">
          Attempt {report.attemptNumber} · {date}
        </p>
        <div
          className={`mt-4 inline-flex rounded-lg border px-4 py-2 font-mono text-sm font-semibold ${resultStyles[report.benchmarkResult]}`}
        >
          FLS Benchmark: {resultLabel[report.benchmarkResult]}
        </div>
      </header>

      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#6B7F8F]">
          Metric Breakdown
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(report.metrics).map(([key, m]) => (
            <div
              key={key}
              className="rounded-lg border border-[#1E2A35] bg-[#0D1117] p-4"
            >
              <p className="text-[10px] uppercase tracking-widest text-[#6B7F8F]">
                {key.replace(/([A-Z])/g, " $1")}
              </p>
              <p className="mt-1 font-mono text-xl text-[#00D4AA]">
                {m.value}
                {m.unit}
              </p>
              <p className="mt-1 text-xs text-[#6B7F8F]">
                Benchmark: {m.benchmarkLabel} · Delta{" "}
                {m.delta > 0 ? "+" : ""}
                {m.delta.toFixed(1)}
              </p>
              <p
                className={`mt-1 text-xs ${m.passing ? "text-[#2ECC71]" : "text-[#F0A500]"}`}
              >
                {m.passing ? "Within threshold" : "Outside threshold"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {report.stabilityTrend.length > 1 && (
        <section className="mb-8 rounded-lg border border-[#1E2A35] bg-[#0D1117] p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#6B7F8F]">
            Stability Trend
          </h2>
          <StabilityChart data={report.stabilityTrend} />
        </section>
      )}

      <section className="mb-8 rounded-lg border border-[#1E2A35] bg-[#0D1117] p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#6B7F8F]">
          Instrument Path Density
        </h2>
        <canvas ref={heatmapRef} className="w-full rounded-lg" />
      </section>

      {report.errorEvents.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#6B7F8F]">
            Error Events ({report.errorCount})
          </h2>
          <ul className="space-y-2">
            {report.errorEvents.map((e, i) => (
              <li
                key={i}
                className="rounded border border-[#1E2A35] bg-[#0D1117] px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs text-[#6B7F8F]">
                  T+{e.t}s
                </span>{" "}
                {e.description}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8 rounded-lg border border-[#1E2A35] bg-[#0D1117] p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#6B7F8F]">
          Improvement Guidance
        </h2>
        <ul className="space-y-3">
          {report.recommendations.map((r, i) => (
            <li
              key={i}
              className="flex gap-3 text-sm leading-relaxed text-[#E8EDF2]"
            >
              <span className="font-mono text-xs text-[#6B7F8F]">
                {String(i + 1).padStart(2, "0")}
              </span>
              {r}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3 border-t border-[#1E2A35] pt-8">
        <Link
          href={`/laparoscopic/${report.taskId}`}
          className="inline-flex items-center gap-2 rounded-lg bg-[#00D4AA] px-5 py-2.5 text-sm font-medium text-[#0A0E12]"
        >
          New Attempt
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/laparoscopic"
          className="inline-flex items-center gap-2 rounded-lg border border-[#1E2A35] px-5 py-2.5 text-sm text-[#E8EDF2]"
        >
          Task Selection
        </Link>
      </div>
    </div>
  );
}
