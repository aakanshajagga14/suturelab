"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { LeftPanel } from "@/components/training/LeftPanel";
import { RightPanel } from "@/components/training/RightPanel";
import {
  WebcamCanvas,
  type WebcamCanvasHandle,
  type WebcamMetrics,
} from "@/components/training/WebcamCanvas";
import { useSession } from "@/context/SessionContext";
import { getPhaseForProgress } from "@/lib/engines/phases";
import type { SessionAnalytics } from "@/lib/types";
import type { LivePerformanceMetrics } from "@/lib/types";

const EMPTY_METRICS: LivePerformanceMetrics = {
  scores: {
    precision: 0,
    stability: 0,
    motionControl: 0,
    proceduralConsistency: 0,
    smoothness: 0,
    controlRating: 0,
  },
  feedback: [],
  pathProgress: 0,
  pathDeviation: 0,
  onPath: false,
  phase: getPhaseForProgress(0),
  stabilityTrend: [],
  fps: 0,
  isTracking: false,
  elapsedSeconds: 0,
};

export function TrainingWorkspace() {
  const router = useRouter();
  const { setAnalytics } = useSession();
  const canvasRef = useRef<WebcamCanvasHandle>(null);

  const [sessionActive, setSessionActive] = useState(false);
  const [metrics, setMetrics] = useState<WebcamMetrics>(EMPTY_METRICS);

  const handleMetricsUpdate = useCallback((m: WebcamMetrics) => {
    setMetrics(m);
  }, []);

  const handleSessionComplete = useCallback(
    (analytics: SessionAnalytics) => {
      setAnalytics(analytics);
      router.push("/summary");
    },
    [setAnalytics, router]
  );

  const startSession = () => {
    canvasRef.current?.startSession();
    setSessionActive(true);
  };

  const endSession = () => {
    canvasRef.current?.endSession();
    setSessionActive(false);
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ChevronLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="text-[var(--border)]">|</span>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              Suturing Practice
            </h1>
            <p className="text-xs text-[var(--muted)]">
              Simple interrupted · AI-assisted performance analysis
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!sessionActive ? (
            <Button onClick={startSession} variant="primary">
              <Play className="h-4 w-4" />
              Start Exercise
            </Button>
          ) : (
            <Button onClick={endSession} variant="outline">
              <Square className="h-4 w-4" />
              End Session
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <LeftPanel
            pathProgress={metrics.pathProgress}
            sessionActive={sessionActive}
            currentPhase={metrics.phase}
          />
        </div>

        <div className="lg:col-span-6">
          <WebcamCanvas
            ref={canvasRef}
            sessionActive={sessionActive}
            onMetricsUpdate={handleMetricsUpdate}
            onSessionComplete={handleSessionComplete}
          />
          <p className="mt-3 text-center text-xs text-[var(--muted)]">
            Performance analysis evaluates path adherence, stability, motion
            quality, and procedural phase execution in real time.
          </p>
        </div>

        <div className="lg:col-span-3">
          <RightPanel {...metrics} />
        </div>
      </div>
    </div>
  );
}
