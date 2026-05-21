"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Square, Play } from "lucide-react";
import {
  initDualHandLandmarker,
  detectDualHands,
} from "@/lib/laparoscopic/dualHandTracker";
import {
  drawLaparoscopicFrame,
  drawPeg,
  drawRing,
  drawInstrument,
  mapHandToViewportTip,
  drawCutCircle,
} from "@/lib/laparoscopic/viewportRenderer";
import { LapFeedbackBar } from "@/components/laparoscopic/LapFeedbackBar";
import { LapMetricsPanel } from "@/components/laparoscopic/LapMetricsPanel";
import {
  createInitialPegState,
  updatePegTransfer,
  pegCoords,
  syncRingPositions,
} from "@/lib/laparoscopic/pegTransfer/simulation";
import {
  createPatternCuttingState,
  getTargetCirclePath,
  updatePatternCutting,
} from "@/lib/laparoscopic/patternCutting/simulation";
import {
  createKnotTyingState,
  getKnotPath,
  updateKnotTying,
  estimateWristRotation,
} from "@/lib/laparoscopic/knotTying/simulation";
import {
  BimanualSyncTracker,
  PathLengthTracker,
  MetricHistoryBuffer,
} from "@/lib/laparoscopic/bimanualMetrics";
import { StabilityEngine } from "@/lib/engines/stabilityEngine";
import { MotionQualityEngine } from "@/lib/engines/motionQualityEngine";
import { buildLapSessionReport } from "@/lib/laparoscopic/buildReport";
import { saveSession, getFlsProgress } from "@/lib/laparoscopic/sessionStorage";
import { FLS_BENCHMARKS, TASK_META } from "@/lib/laparoscopic/flsBenchmarks";
import type { FlsTaskId, LapMetricTrend, LapErrorEvent, LapPhaseMarker } from "@/lib/laparoscopic/types";
import type { InstrumentState, PegTransferState } from "@/lib/laparoscopic/types";
import type { PatternCuttingState, KnotTyingState } from "@/lib/laparoscopic/types";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import type { Point2D } from "@/lib/types";
import { generateStitchPath } from "@/lib/suturing/stitchPath";
import { drawStitchPath as drawSuturePath } from "@/lib/mediapipe/handTracker";

interface LapTaskWorkspaceProps {
  taskId: FlsTaskId;
}

export function LapTaskWorkspace({ taskId }: LapTaskWorkspaceProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef(0);

  const [sessionActive, setSessionActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [phaseLabel, setPhaseLabel] = useState("Standby");
  const [metrics, setMetrics] = useState<LapMetricTrend[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const pegStateRef = useRef<PegTransferState>(createInitialPegState());
  const patternRef = useRef<PatternCuttingState>(createPatternCuttingState());
  const knotRef = useRef<KnotTyingState>(createKnotTyingState());
  const stabilityL = useRef(new StabilityEngine());
  const stabilityR = useRef(new StabilityEngine());
  const motionRef = useRef(new MotionQualityEngine());
  const syncRef = useRef(new BimanualSyncTracker());
  const pathRef = useRef(new PathLengthTracker());
  const historyRef = useRef(new MetricHistoryBuffer());
  const eventsRef = useRef<LapErrorEvent[]>([]);
  const phasesRef = useRef<LapPhaseMarker[]>([]);
  const pathSamplesRef = useRef<Point2D[]>([]);
  const stabilityTrendRef = useRef<{ t: number; value: number }[]>([]);
  const feedbackHistoryRef = useRef<string[]>([]);
  const leftPathRef = useRef(0);
  const rightPathRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseStartRef = useRef(0);
  const completingRef = useRef(false);

  const meta = TASK_META[taskId];

  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = 960;
        canvas.height = 540;
      }
      setError(null);
    } catch {
      setError("Camera access required for instrument tracking.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initCamera();
      try {
        landmarkerRef.current = await initDualHandLandmarker();
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setError("Hand tracking initialization failed.");
      }
    })();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      videoRef.current?.srcObject &&
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
    };
  }, [initCamera]);

  const finishSession = useCallback(() => {
    if (completingRef.current) return;
    completingRef.current = true;
    setSessionActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const tremorHist = historyRef.current.get("tremor");
    const avgStab =
      tremorHist.length > 0
        ? Math.round(tremorHist.reduce((a, b) => a + b, 0) / tremorHist.length)
        : 0;

    const metricValues: Record<string, number> = {
      timeSeconds: elapsed,
      drops: pegStateRef.current.drops,
      pathLengthCm: pathRef.current.getTotal(),
      stability: avgStab,
      bimanualSync: historyRef.current.get("sync").slice(-1)[0] ?? 0,
      meanDeviationMm: patternRef.current.meanDeviation,
      completionPct: patternRef.current.completionPct,
      smoothness: motionRef.current.analyze(null).smoothnessScore,
      precision: Math.round(knotRef.current.pathProgress * 100),
      knotSecurity: knotRef.current.throwCount >= 2 ? 85 : 50,
      throws: knotRef.current.throwCount,
    };

    const progress = getFlsProgress();
    const report = buildLapSessionReport({
      taskId,
      durationSeconds: elapsed,
      metrics: metricValues,
      feedbackHistory: feedbackHistoryRef.current,
      errorEvents: eventsRef.current,
      phaseTimeline: phasesRef.current,
      stabilityTrend: stabilityTrendRef.current,
      pathSamples: pathSamplesRef.current,
      attemptNumber:
        taskId === "peg-transfer"
          ? progress.pegTransferAttempts + 1
          : 1,
    });

    saveSession(report);
    router.push(`/laparoscopic/report/${report.id}`);
  }, [elapsed, router, taskId]);

  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas || !landmarker || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const w = canvas.width;
    const h = canvas.height;
    const geo = drawLaparoscopicFrame(ctx, w, h);
    const entryL = { x: geo.cx - geo.rx * 0.85, y: geo.cy + geo.ry * 0.9 };
    const entryR = { x: geo.cx + geo.rx * 0.85, y: geo.cy + geo.ry * 0.9 };

    const now = performance.now();
    const hands = detectDualHands(landmarker, video, Math.floor(now));

    let leftInst: InstrumentState | null = null;
    let rightInst: InstrumentState | null = null;

    if (hands.left) {
      const tip = mapHandToViewportTip(
        hands.left.landmarks[8].x,
        hands.left.landmarks[8].y,
        geo,
        false
      );
      leftInst = {
        side: "left",
        tip,
        shaftAngle: 0,
        depth: 1 - hands.left.landmarks[8].y,
        graspClosed:
          Math.hypot(
            hands.left.landmarks[4].x - hands.left.landmarks[8].x,
            hands.left.landmarks[4].y - hands.left.landmarks[8].y
          ) < 0.045,
        pathLength: leftPathRef.current,
      };
      leftPathRef.current = leftInst.pathLength + 0.5;
      pathSamplesRef.current.push(tip);
      if (pathSamplesRef.current.length > 500) pathSamplesRef.current.shift();
    }

    if (hands.right) {
      const tip = mapHandToViewportTip(
        hands.right.landmarks[8].x,
        hands.right.landmarks[8].y,
        geo,
        true
      );
      rightInst = {
        side: "right",
        tip,
        shaftAngle: 0,
        depth: 1 - hands.right.landmarks[8].y,
        graspClosed:
          Math.hypot(
            hands.right.landmarks[4].x - hands.right.landmarks[8].x,
            hands.right.landmarks[4].y - hands.right.landmarks[8].y
          ) < 0.045,
        pathLength: rightPathRef.current,
      };
      rightPathRef.current = rightInst.pathLength + 0.5;
      pathSamplesRef.current.push(tip);
    }

    const leftWrist = hands.left
      ? { x: hands.left.landmarks[0].x * w, y: hands.left.landmarks[0].y * h }
      : null;
    const rightWrist = hands.right
      ? { x: hands.right.landmarks[0].x * w, y: hands.right.landmarks[0].y * h }
      : null;
    const leftTip = leftInst?.tip ?? null;
    const rightTip = rightInst?.tip ?? null;

    const stabL = stabilityL.current.analyze(
      leftWrist,
      leftTip
    ).score;
    const stabR = stabilityR.current.analyze(
      rightWrist,
      rightTip
    ).score;
    const tremor = Math.round((stabL + stabR) / 2);

    if (sessionActive) {
      stabilityTrendRef.current.push({ t: elapsed, value: tremor });
      if (stabilityTrendRef.current.length > 120)
        stabilityTrendRef.current.shift();
    }

    const pathCm = pathRef.current.sample(leftTip, rightTip);
    const sync = syncRef.current.updatePositions(leftTip, rightTip);
    const motion = motionRef.current.analyze(rightTip ?? leftTip);

    let instL: "grasper" | "scissors" | "driver" = "grasper";
    let instR: "grasper" | "scissors" | "driver" = "grasper";
    if (taskId === "pattern-cutting") {
      instL = "grasper";
      instR = "scissors";
    } else if (taskId === "knot-tying") {
      instL = "grasper";
      instR = "driver";
    }

    if (taskId === "peg-transfer") {
      for (let i = 0; i < 6; i++) {
        const c = pegCoords(i, geo, w, h);
        drawPeg(ctx, c.x, c.y, geo);
      }
      syncRingPositions(pegStateRef.current, geo, w, h, leftInst, rightInst);
      for (const ring of pegStateRef.current.rings) {
        drawRing(ctx, ring, geo);
      }
      if (sessionActive) {
        const upd = updatePegTransfer(
          pegStateRef.current,
          leftInst,
          rightInst,
          geo,
          w,
          h,
          elapsed
        );
        pegStateRef.current = upd.state;
        setFeedback(upd.feedback);
        setPhaseLabel(upd.phaseLabel);
        feedbackHistoryRef.current.push(upd.feedback);
        eventsRef.current.push(...upd.events);
        setErrorCount(pegStateRef.current.drops + pegStateRef.current.transferHeightErrors);
        if (upd.state.completed && sessionActive) finishSession();
      }
    } else if (taskId === "pattern-cutting") {
      const target = getTargetCirclePath(geo);
      drawCutCircle(ctx, geo, patternRef.current.cutProgress, patternRef.current.dominantPath);
      if (sessionActive) {
        const upd = updatePatternCutting(
          patternRef.current,
          rightInst?.tip ?? null,
          leftInst?.tip ?? null,
          leftInst?.graspClosed ?? false,
          target,
          geo
        );
        patternRef.current = upd.state;
        setFeedback(upd.feedback);
        setPhaseLabel(upd.phaseLabel);
        if (upd.state.completed && sessionActive) finishSession();
      }
    } else {
      const knotPath = getKnotPath(geo, w, h);
      if (knotPath.length > 0) {
        drawSuturePath(ctx, knotPath, knotRef.current.pathProgress);
      }
      if (sessionActive && hands.right) {
        const rot = estimateWristRotation(hands.right.landmarks);
        const upd = updateKnotTying(
          knotRef.current,
          rightInst?.tip ?? null,
          knotPath,
          rot
        );
        knotRef.current = upd.state;
        setFeedback(upd.feedback);
        setPhaseLabel(upd.phaseLabel);
        if (upd.state.completed && sessionActive) finishSession();
      }
    }

    if (leftInst) drawInstrument(ctx, leftInst, entryL.x, entryL.y, instL);
    if (rightInst) drawInstrument(ctx, rightInst, entryR.x, entryR.y, instR);

    const trends: LapMetricTrend[] = [];
    if (taskId === "peg-transfer") {
      trends.push({
        label: "Economy of Movement",
        value: pathCm,
        unit: "cm",
        history: historyRef.current.push("path", pathCm),
        threshold: FLS_BENCHMARKS["peg-transfer"].maxPathLengthCm,
        thresholdDirection: "below",
        format: (v) => `${Math.round(v)}cm`,
      });
      trends.push({
        label: "Instrument Tremor",
        value: tremor,
        unit: "/100",
        history: historyRef.current.push("tremor", tremor),
        threshold: FLS_BENCHMARKS["peg-transfer"].minStability,
        thresholdDirection: "above",
      });
      trends.push({
        label: "Bimanual Sync",
        value: sync,
        unit: "/100",
        history: historyRef.current.push("sync", sync),
        threshold: FLS_BENCHMARKS["peg-transfer"].minBimanualSync,
        thresholdDirection: "above",
      });
    } else if (taskId === "pattern-cutting") {
      trends.push({
        label: "Cutting Accuracy",
        value: patternRef.current.meanDeviation,
        unit: "mm",
        history: historyRef.current.push("dev", patternRef.current.meanDeviation),
        threshold: FLS_BENCHMARKS["pattern-cutting"].maxMeanDeviationMm,
        thresholdDirection: "below",
        format: (v) => `${v.toFixed(1)}mm`,
      });
      trends.push({
        label: "Completion",
        value: patternRef.current.completionPct,
        unit: "%",
        history: historyRef.current.push("comp", patternRef.current.completionPct),
        threshold: FLS_BENCHMARKS["pattern-cutting"].minCompletionPct,
        thresholdDirection: "above",
      });
      trends.push({
        label: "Path Smoothness",
        value: motion.smoothnessScore,
        unit: "/100",
        history: historyRef.current.push("smooth", motion.smoothnessScore),
        threshold: FLS_BENCHMARKS["pattern-cutting"].minSmoothness,
        thresholdDirection: "above",
      });
    } else {
      trends.push({
        label: "Arc Adherence",
        value: Math.round(knotRef.current.pathProgress * 100),
        unit: "%",
        history: historyRef.current.push("arc", knotRef.current.pathProgress * 100),
      });
      trends.push({
        label: "Instrument Tremor",
        value: tremor,
        unit: "/100",
        history: historyRef.current.push("tremor", tremor),
      });
    }

    setMetrics(trends);
    rafRef.current = requestAnimationFrame(renderLoop);
  }, [sessionActive, elapsed, taskId, finishSession]);

  useEffect(() => {
    if (ready) rafRef.current = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, renderLoop]);

  const startSession = () => {
    pegStateRef.current = createInitialPegState();
    patternRef.current = createPatternCuttingState();
    knotRef.current = createKnotTyingState();
    stabilityL.current.reset();
    stabilityR.current.reset();
    motionRef.current.reset();
    syncRef.current.reset();
    pathRef.current.reset();
    historyRef.current.reset();
    eventsRef.current = [];
    phasesRef.current = [];
    pathSamplesRef.current = [];
    stabilityTrendRef.current = [];
    feedbackHistoryRef.current = [];
    completingRef.current = false;
    setElapsed(0);
    setErrorCount(0);
    setSessionActive(true);
    phaseStartRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const severity =
    feedback.includes("deviat") || feedback.includes("instability") || feedback.includes("dropped")
      ? "warning"
      : feedback.includes("Reduce") || feedback.includes("Elevate")
        ? "caution"
        : "info";

  return (
    <div className="min-h-screen bg-[#0A0E12] text-[#E8EDF2]">
      <div className="border-b border-[#1E2A35] px-4 py-3">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/laparoscopic"
              className="flex items-center gap-1 text-sm text-[#6B7F8F] hover:text-[#E8EDF2]"
            >
              <ChevronLeft className="h-4 w-4" />
              FLS Module
            </Link>
            <span className="text-[#1E2A35]">|</span>
            <div>
              <h1 className="text-sm font-semibold">{meta.name}</h1>
              <p className="text-xs text-[#6B7F8F]">{meta.clinicalPurpose}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!sessionActive ? (
              <button
                type="button"
                onClick={startSession}
                disabled={!ready}
                className="inline-flex items-center gap-2 rounded-lg bg-[#00D4AA] px-4 py-2 text-sm font-medium text-[#0A0E12] disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Begin Session
              </button>
            ) : (
              <button
                type="button"
                onClick={finishSession}
                className="inline-flex items-center gap-2 rounded-lg border border-[#1E2A35] px-4 py-2 text-sm text-[#E8EDF2]"
              >
                <Square className="h-4 w-4" />
                End Session
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-4 lg:flex-row">
        <div className="flex-1">
          <div className="relative overflow-hidden rounded-xl border border-[#1E2A35]">
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas ref={canvasRef} className="w-full" />
            {!ready && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0A0E12]/90">
                <p className="text-sm text-[#6B7F8F] animate-pulse-subtle">
                  Initializing laparoscopic tracking…
                </p>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[#E84545]">
                {error}
              </div>
            )}
          </div>
          <div className="mt-4">
            <LapFeedbackBar message={feedback || "Awaiting session start"} severity={severity} />
          </div>
        </div>

        <LapMetricsPanel
          metrics={metrics}
          timeElapsed={elapsed}
          timeBenchmark={
            taskId === "peg-transfer"
              ? FLS_BENCHMARKS["peg-transfer"].maxTimeSeconds
              : undefined
          }
          phaseLabel={phaseLabel}
          errorCount={errorCount}
        />
      </div>
    </div>
  );
}
