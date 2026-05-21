"use client";

import { Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RadialScore } from "@/components/ui/RadialScore";
import { StabilityIndicator } from "@/components/ui/StabilityIndicator";
import type { FeedbackMessage, LivePerformanceMetrics } from "@/lib/types";

interface RightPanelProps extends LivePerformanceMetrics {}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const feedbackVariant = {
  info: "info" as const,
  success: "success" as const,
  warning: "warning" as const,
  error: "warning" as const,
};

export function RightPanel({
  feedback,
  scores,
  stabilityTrend,
  elapsedSeconds,
  isTracking,
  phase,
}: RightPanelProps) {
  return (
    <aside className="flex flex-col gap-4">
      <Card
        title="Clinical Feedback"
        subtitle={isTracking ? "Live performance analysis" : "Awaiting hand detection"}
      >
        <div className="min-h-[100px] space-y-2">
          {feedback.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Instructional feedback will display once tracking is established.
            </p>
          ) : (
            feedback.map((msg: FeedbackMessage) => (
              <div
                key={msg.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 transition-opacity duration-300 animate-fade-in"
              >
                <Badge variant={feedbackVariant[msg.type]}>{msg.type}</Badge>
                <p className="mt-1.5 text-sm leading-snug text-[var(--foreground)]">
                  {msg.text}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card title="Performance Scores" subtitle="Live session metrics">
        <div className="mb-4 grid grid-cols-4 gap-2">
          <RadialScore value={scores.precision} label="Precision" size={64} />
          <RadialScore value={scores.stability} label="Stability" size={64} />
          <RadialScore
            value={scores.motionControl}
            label="Motion"
            size={64}
          />
          <RadialScore
            value={scores.proceduralConsistency}
            label="Consistency"
            size={64}
          />
        </div>
        <div className="space-y-3 border-t border-[var(--border)] pt-4">
          <ProgressBar
            label="Smoothness"
            value={scores.smoothness}
            variant="accent"
            size="sm"
          />
          <ProgressBar
            label="Control rating"
            value={scores.controlRating}
            variant="default"
            size="sm"
          />
        </div>
      </Card>

      <Card title="Stability Analysis">
        <StabilityIndicator
          score={scores.stability}
          trend={stabilityTrend}
        />
      </Card>

      <Card title="Session Timer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-[var(--clinical-blue)]" />
            <span className="font-mono text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
          {phase && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                Current phase
              </p>
              <p className="text-xs font-medium text-[var(--foreground)]">
                {phase.label}
              </p>
            </div>
          )}
        </div>
      </Card>
    </aside>
  );
}
