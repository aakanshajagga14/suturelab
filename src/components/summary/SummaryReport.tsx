"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Clock,
  Target,
  Activity,
  TrendingUp,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { RadialScore } from "@/components/ui/RadialScore";
import { StabilityChart } from "@/components/analytics/StabilityChart";
import { PhaseBreakdown } from "@/components/analytics/PhaseBreakdown";
import { HeatmapVisualization } from "@/components/analytics/HeatmapVisualization";
import type { SessionAnalytics } from "@/lib/types";

const STORAGE_KEY = "suturelab-analytics";

export function SummaryReport() {
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);

  useEffect(() => {
    const stored =
      sessionStorage.getItem(STORAGE_KEY) ||
      sessionStorage.getItem("suturelab-summary");
    if (stored) {
      try {
        setAnalytics(JSON.parse(stored) as SessionAnalytics);
      } catch {
        setAnalytics(null);
      }
    }
  }, []);

  if (!analytics) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center animate-fade-in">
        <FileText className="mx-auto h-10 w-10 text-[var(--muted)]" />
        <p className="mt-4 text-[var(--muted)]">
          No session analytics available.
        </p>
        <Link href="/session" className="mt-6 inline-block">
          <Button variant="primary">Start New Session</Button>
        </Link>
      </div>
    );
  }

  const completedDate = new Date(analytics.completedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const overallScore = Math.round(
    (analytics.scores.precision +
      analytics.scores.stability +
      analytics.scores.motionControl +
      analytics.scores.proceduralConsistency) /
      4
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 animate-fade-in">
      <header className="mb-10 border-b border-[var(--border)] pb-8">
        <Badge variant={analytics.status === "completed" ? "success" : "warning"}>
          {analytics.status === "completed"
            ? "Session Complete"
            : "Session Ended Early"}
        </Badge>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Clinical Performance Report
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Simple interrupted suture · {completedDate}
        </p>
      </header>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <p className="text-sm text-[var(--muted)]">Composite Performance Index</p>
          <p className="mt-2 text-5xl font-semibold tracking-tight text-[var(--foreground)]">
            {overallScore}
            <span className="text-lg font-normal text-[var(--muted)]">/100</span>
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Completion: {analytics.completionPercentage}%
          </p>
        </Card>

        <Card className="lg:col-span-2" title="Score Overview">
          <div className="grid grid-cols-4 gap-4">
            <RadialScore
              value={analytics.scores.precision}
              label="Precision"
            />
            <RadialScore
              value={analytics.scores.stability}
              label="Stability"
            />
            <RadialScore
              value={analytics.scores.motionControl}
              label="Motion Control"
            />
            <RadialScore
              value={analytics.scores.proceduralConsistency}
              label="Consistency"
            />
          </div>
        </Card>
      </div>

      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <Target className="h-4 w-4" />
            <span className="text-xs font-medium">Path Adherence</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={analytics.pathAdherence} variant="success" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium">Avg Deviation</span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
            {analytics.averageDeviation}
            <span className="text-sm font-normal text-[var(--muted)]"> px</span>
          </p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Smoothness</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={analytics.smoothness} variant="accent" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Session Duration</span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
            {Math.floor(analytics.durationSeconds / 60)}:
            {String(analytics.durationSeconds % 60).padStart(2, "0")}
          </p>
          <p className="text-xs text-[var(--muted)]">
            Active tracking: {analytics.timingAnalysis.activeTrackingSeconds}s
          </p>
        </Card>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card
          title="Stability Trend"
          subtitle="Hand stability index over session duration"
        >
          <StabilityChart data={analytics.stabilityTrend} />
        </Card>

        <Card title="Timing Analysis" subtitle="Procedural duration metrics">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-[var(--border)] pb-2">
              <dt className="text-[var(--muted)]">Total session time</dt>
              <dd className="font-medium">{analytics.timingAnalysis.totalSeconds}s</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--border)] pb-2">
              <dt className="text-[var(--muted)]">Active tracking time</dt>
              <dd className="font-medium">
                {analytics.timingAnalysis.activeTrackingSeconds}s
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Control rating (avg)</dt>
              <dd className="font-medium">{analytics.controlRating}/100</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="mb-8 space-y-6">
        <PhaseBreakdown
          phases={analytics.phasePerformance}
          strongest={analytics.strongestPhase}
          weakest={analytics.weakestPhase}
        />
        <HeatmapVisualization data={analytics.heatmap} />
      </div>

      <Card title="Clinical Recommendations" className="mb-8">
        <ul className="space-y-3">
          {analytics.improvements.map((item, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm leading-relaxed text-[var(--foreground)]"
            >
              <span className="font-mono text-xs text-[var(--muted)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-8 sm:flex-row sm:justify-center">
        <Link href="/session">
          <Button variant="primary" size="lg">
            New Session
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" size="lg">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
