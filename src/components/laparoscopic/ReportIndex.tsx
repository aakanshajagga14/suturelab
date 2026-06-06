"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { useLapSessions } from "@/hooks/use-client-storage";

function formatCompletedAt(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReportIndex() {
  const sessions = useLapSessions();

  return (
    <div className="page-enter mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="mb-10 border-b border-[#1E2A35] pb-8">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#00D4AA]">
          Performance Summaries
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#E8EDF2]">
          Laparoscopic Reports
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#6B7F8F]">
          Review completed training and assessment sessions, benchmark status,
          instrument path density, stability trends, and improvement guidance.
        </p>
      </header>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-[#1E2A35] bg-[#0D1117] p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-[#6B7F8F]" />
          <p className="mt-4 text-sm text-[#6B7F8F]">
            No laparoscopic session reports are available yet.
          </p>
          <Link
            href="/training"
            className="mt-5 inline-flex rounded-lg bg-[#00D4AA] px-5 py-2.5 text-sm font-medium text-[#0A0E12]"
          >
            Start Training
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/report/${session.id}`}
              className="block rounded-lg border border-[#1E2A35] bg-[#0D1117] p-5 transition-colors hover:border-[#00D4AA]/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[#E8EDF2]">
                    {session.taskName}
                  </h2>
                  <p className="mt-1 text-xs text-[#6B7F8F]">
                    {formatCompletedAt(session.completedAt)} -{" "}
                    {session.sessionMode === "assessment"
                      ? "Assessment"
                      : "Training"}
                  </p>
                </div>
                <span className="rounded border border-[#1E2A35] px-3 py-1 font-mono text-xs text-[#00D4AA]">
                  {session.benchmarkResult.replace("_", " ")}
                </span>
              </div>
              <p className="mt-3 text-xs text-[#6B7F8F]">
                Duration {session.durationSeconds}s - {session.errorCount} error
                events
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
