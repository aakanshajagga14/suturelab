"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Square, Play } from "lucide-react";
import {
  initDualHandLandmarker,
  DualHandTrackingSession,
  type ProcessedDualHandResult,
} from "@/lib/laparoscopic/dualHandTracker";
import {
  CameraSetupGate,
  sampleFrameBrightness,
} from "@/lib/hand-tracking/camera-setup";
import {
  drawViewportPinchRing,
  stabilityBadgeFromScores,
  type HandTrackingUiState,
} from "@/lib/hand-tracking/tracking-overlays";
import { CameraSetupPanel } from "@/components/laparoscopic/CameraSetupPanel";
import {
  drawLaparoscopicFrame,
  drawPeg,
  drawRing,
  drawInstrument,
  mapHandToViewportTip,
  drawCutCircle,
  getViewportGeometry,
} from "@/lib/laparoscopic/viewportRenderer";
import {
  drawWebcamFeed,
  drawWebcamHandOverlay,
  drawWebcamNoHandsOverlay,
} from "@/lib/laparoscopic/webcamRenderer";
import {
  drawGhostPath,
  drawGhostInstrument,
  drawHintArrow,
  drawStepCompleteFlash,
  getPegGhostTargets,
} from "@/lib/laparoscopic/ghostRenderer";
import { LapFeedbackBar } from "@/components/laparoscopic/LapFeedbackBar";
import { LapMetricsPanel } from "@/components/laparoscopic/LapMetricsPanel";
import { ModeToggle } from "@/components/laparoscopic/ModeToggle";
import { TrainingStepIndicator } from "@/components/laparoscopic/TrainingStepIndicator";
import { InstructionCard } from "@/components/laparoscopic/InstructionCard";
import {
  createInitialPegState,
  updatePegTransfer,
  pegCoords,
  syncRingPositions,
} from "@/lib/laparoscopic/pegTransfer/simulation";
import { PEG_GUIDED_STEPS } from "@/lib/laparoscopic/pegTransfer/guidedSteps";
import {
  evaluateGuidedStep,
  shouldShowHint,
} from "@/lib/laparoscopic/pegTransfer/guidedEngine";
import {
  getDemoFrame,
  isDemoComplete,
} from "@/lib/laparoscopic/pegTransfer/demoPlayer";
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
import { StabilityEngine } from "@/lib/stability-engine";
import { MotionQualityEngine } from "@/lib/engines/motionQualityEngine";
import { buildLapSessionReport } from "@/lib/laparoscopic/buildReport";
import { saveSession, getFlsProgress } from "@/lib/laparoscopic/sessionStorage";
import {
  getFlsSessionMode,
  setFlsSessionMode,
  loadGuidedProgress,
  saveGuidedProgress,
  type FlsSessionMode,
  type TrainingSubPhase,
  type GuidedProgressStore,
} from "@/lib/laparoscopic/trainingMode";
import { FLS_BENCHMARKS, TASK_META } from "@/lib/laparoscopic/flsBenchmarks";
import type {
  FlsTaskId,
  LapMetricTrend,
  LapErrorEvent,
  InstrumentState,
  PegTransferState,
  PatternCuttingState,
  KnotTyingState,
} from "@/lib/laparoscopic/types";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import type { Point2D } from "@/lib/types";
import { drawStitchPath as drawSuturePath } from "@/lib/mediapipe/handTracker";

interface LapTaskWorkspaceProps {
  taskId: FlsTaskId;
}

function buildInstruments(
  hands: ProcessedDualHandResult,
  geo: ReturnType<typeof getViewportGeometry>
): { left: InstrumentState | null; right: InstrumentState | null } {
  let left: InstrumentState | null = null;
  let right: InstrumentState | null = null;
  if (hands.left) {
    const tip = mapHandToViewportTip(
      hands.left.tipNorm.x,
      hands.left.tipNorm.y,
      geo,
      false
    );
    left = {
      side: "left",
      tip,
      shaftAngle: 0,
      depth: 1 - hands.left.tipNorm.y,
      graspClosed: hands.left.isGrasping,
      pathLength: 0,
    };
  }
  if (hands.right) {
    const tip = mapHandToViewportTip(
      hands.right.tipNorm.x,
      hands.right.tipNorm.y,
      geo,
      true
    );
    right = {
      side: "right",
      tip,
      shaftAngle: 0,
      depth: 1 - hands.right.tipNorm.y,
      graspClosed: hands.right.isGrasping,
      pathLength: 0,
    };
  }
  return { left, right };
}

export function LapTaskWorkspace({ taskId }: LapTaskWorkspaceProps) {
  const router = useRouter();
  const meta = TASK_META[taskId];

  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewportCanvasRef = useRef<HTMLCanvasElement>(null);
  const ghostCanvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const trackingSessionRef = useRef<DualHandTrackingSession | null>(null);
  const cameraSetupRef = useRef(new CameraSetupGate());
  const stabilityScoresRef = useRef<number[]>([]);
  const rafRef = useRef(0);

  const [mode, setMode] = useState<FlsSessionMode>("training");
  const [subPhase, setSubPhase] = useState<TrainingSubPhase>("idle");
  const [guided, setGuided] = useState<GuidedProgressStore>(() =>
    loadGuidedProgress(taskId)
  );
  const [sessionActive, setSessionActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [phaseLabel, setPhaseLabel] = useState("Standby");
  const [metrics, setMetrics] = useState<LapMetricTrend[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [trackingOk, setTrackingOk] = useState(false);
  const [bothHands, setBothHands] = useState(false);
  const [stepFlash, setStepFlash] = useState(0);
  const [demoStart, setDemoStart] = useState(0);
  const [showReadyForAssessment, setShowReadyForAssessment] = useState(false);
  const [cameraSetup, setCameraSetup] = useState(
    cameraSetupRef.current.evaluate({
      leftConfidence: 0,
      rightConfidence: 0,
      brightness: 0,
      now: 0,
    })
  );

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
  const pathSamplesRef = useRef<Point2D[]>([]);
  const stabilityTrendRef = useRef<{ t: number; value: number }[]>([]);
  const feedbackHistoryRef = useRef<string[]>([]);
  const stepStartedRef = useRef(Date.now());
  const completingRef = useRef(false);
  const stepAdvanceLockRef = useRef(false);
  const positioningHoldRef = useRef(0);
  const advancedFromPositioningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseRef = useRef(0);

  const TRACKING_CONFIDENCE_MIN = 0.6;
  const POSITIONING_HOLD_FRAMES = 45;

  useEffect(() => {
    setMode(getFlsSessionMode());
    setGuided(loadGuidedProgress(taskId));
  }, [taskId]);

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
      const size = { w: 640, h: 360 };
      if (webcamCanvasRef.current) {
        webcamCanvasRef.current.width = size.w;
        webcamCanvasRef.current.height = size.h;
      }
      if (viewportCanvasRef.current) {
        viewportCanvasRef.current.width = 640;
        viewportCanvasRef.current.height = 360;
      }
      if (ghostCanvasRef.current) {
        ghostCanvasRef.current.width = 640;
        ghostCanvasRef.current.height = 360;
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
        trackingSessionRef.current = new DualHandTrackingSession(getFlsSessionMode());
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setError("Hand tracking initialization failed.");
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      const v = videoRef.current;
      if (v?.srcObject) {
        (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, [initCamera]);

  const handleModeChange = (m: FlsSessionMode) => {
    setMode(m);
    setFlsSessionMode(m);
    trackingSessionRef.current?.setMode(m);
    setSessionActive(false);
    setSubPhase("idle");
    cameraSetupRef.current.reset();
    positioningHoldRef.current = 0;
    advancedFromPositioningRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const finishSession = useCallback(() => {
    if (completingRef.current) return;
    completingRef.current = true;
    setSessionActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    if (mode === "training") {
      setShowReadyForAssessment(true);
      setSubPhase("idle");
      setSessionActive(false);
      completingRef.current = false;
      setFeedback(
        "Session ended. Review learning metrics, then switch to Assessment Mode for FLS-standard evaluation."
      );
      return;
    }

    const tremorHist = historyRef.current.get("tremor");
    const avgStab =
      tremorHist.length > 0
        ? Math.round(tremorHist.reduce((a, b) => a + b, 0) / tremorHist.length)
        : 0;

    const progress = getFlsProgress();
    const report = buildLapSessionReport({
      taskId,
      mode,
      durationSeconds: elapsed,
      metrics: {
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
      },
      feedbackHistory: feedbackHistoryRef.current,
      errorEvents: eventsRef.current,
      phaseTimeline: [],
      stabilityTrend: stabilityTrendRef.current,
      pathSamples: pathSamplesRef.current,
      attemptNumber: progress.pegTransferAttempts + 1,
      weakestPhase: phaseLabel,
    });

    saveSession(report);
    router.push(`/laparoscopic/report/${report.id}`);
  }, [elapsed, mode, router, taskId, subPhase, phaseLabel]);

  const enterGuidedPractice = useCallback(() => {
    setSubPhase("guided");
    stepStartedRef.current = Date.now();
    const progress = loadGuidedProgress(taskId);
    setGuided(progress);
    setFeedback(PEG_GUIDED_STEPS[progress.currentStep].instruction);
    setPhaseLabel(PEG_GUIDED_STEPS[progress.currentStep].title);
  }, [taskId]);

  const enterFreeOrAssessment = useCallback(() => {
    setSubPhase("free");
    if (mode === "assessment") {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      setPhaseLabel("Assessment in progress");
    } else {
      setPhaseLabel("Free practice");
    }
  }, [mode]);

  const advanceFromPositioning = useCallback(() => {
    if (advancedFromPositioningRef.current) return;
    advancedFromPositioningRef.current = true;
    positioningHoldRef.current = 0;

    if (
      mode === "training" &&
      taskId === "peg-transfer" &&
      !guided.guidedComplete
    ) {
      enterGuidedPractice();
      setFeedback(
        "Tracking stable. Follow the guided steps below to complete the transfer sequence."
      );
      return;
    }

    enterFreeOrAssessment();
    setFeedback(
      mode === "assessment"
        ? "Tracking stable. Assessment timer is running — complete the task within the FLS time limit."
        : "Tracking stable. Continue free practice with both hands in frame."
    );
  }, [
    mode,
    taskId,
    guided.guidedComplete,
    enterGuidedPractice,
    enterFreeOrAssessment,
  ]);

  const advanceGuidedStep = useCallback(() => {
    if (stepAdvanceLockRef.current) return;
    stepAdvanceLockRef.current = true;
    setTimeout(() => {
      stepAdvanceLockRef.current = false;
    }, 800);
    setStepFlash(1);
    setTimeout(() => setStepFlash(0), 300);
    setGuided((g) => {
      const next = { ...g };
      next.completedSteps[next.currentStep] = true;
      if (next.currentStep < 5) {
        next.currentStep += 1;
        stepStartedRef.current = Date.now();
        setFeedback(
          `Step complete — proceeding. ${PEG_GUIDED_STEPS[next.currentStep].instruction}`
        );
      } else {
        next.guidedComplete = true;
        setSubPhase("free");
        setSessionActive(true);
        setFeedback(
          "Guided steps complete for Ring 1. Continue free practice for remaining rings, then consider Assessment Mode."
        );
      }
      saveGuidedProgress(next);
      return next;
    });
  }, []);

  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    const webcamCanvas = webcamCanvasRef.current;
    const viewportCanvas = viewportCanvasRef.current;
    const ghostCanvas = ghostCanvasRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !webcamCanvas || !viewportCanvas || !landmarker) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const wv = webcamCanvas.width;
    const hv = webcamCanvas.height;
    const w = viewportCanvas.width;
    const h = viewportCanvas.height;
    const now = performance.now();
    pulseRef.current += 0.05;

    if (video.videoWidth < 1 || video.videoHeight < 1) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const wctx = webcamCanvas.getContext("2d");
    const vctx = viewportCanvas.getContext("2d");
    const gctx = ghostCanvas?.getContext("2d");

    if (!wctx || !vctx) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    if (video.readyState >= 2) {
      drawWebcamFeed(wctx, video, wv, hv);
      const session = trackingSessionRef.current;
      const hands = session
        ? session.detect(landmarker, video)
        : { left: null, right: null };

      const brightness = sampleFrameBrightness(wctx, wv, hv);
      if (subPhase === "positioning") {
        setCameraSetup(
          cameraSetupRef.current.evaluate({
            leftConfidence: hands.left?.confidence ?? 0,
            rightConfidence: hands.right?.confidence ?? 0,
            brightness,
            now,
          })
        );
      }

      const stabEarlyL = stabilityL.current.analyze(
        hands.left ? { x: hands.left.tipNorm.x, y: hands.left.tipNorm.y } : null,
        null
      ).score;
      const stabEarlyR = stabilityR.current.analyze(
        hands.right
          ? { x: hands.right.tipNorm.x, y: hands.right.tipNorm.y }
          : null,
        null
      ).score;
      const tremorEarly = Math.round((stabEarlyL + stabEarlyR) / 2);
      stabilityScoresRef.current.push(tremorEarly);
      if (stabilityScoresRef.current.length > 30) {
        stabilityScoresRef.current.shift();
      }

      const lowConf =
        (hands.left && hands.left.confidence < 0.6) ||
        (hands.right && hands.right.confidence < 0.6);
      const trackingUi: HandTrackingUiState = {
        left: hands.left
          ? {
              pinchDistance: hands.left.pinchDistance,
              isGrasping: hands.left.isGrasping,
              confidence: hands.left.confidence,
            }
          : null,
        right: hands.right
          ? {
              pinchDistance: hands.right.pinchDistance,
              isGrasping: hands.right.isGrasping,
              confidence: hands.right.confidence,
            }
          : null,
        stabilityBadge: stabilityBadgeFromScores(stabilityScoresRef.current),
        lowConfidenceMessage: lowConf
          ? "Improve hand visibility — ensure good lighting and keep hands fully in frame"
          : null,
      };

      const track = drawWebcamHandOverlay(
        wctx,
        hands,
        taskId,
        wv,
        hv,
        trackingUi
      );
      setTrackingOk(track.tracking);
      setBothHands(track.bothHands);

      if (subPhase === "positioning") {
        const leftOk =
          (hands.left?.confidence ?? 0) >= TRACKING_CONFIDENCE_MIN;
        const rightOk =
          (hands.right?.confidence ?? 0) >= TRACKING_CONFIDENCE_MIN;
        const trackingGood = track.bothHands && leftOk && rightOk;

        if (trackingGood) {
          positioningHoldRef.current += 1;
          if (positioningHoldRef.current >= POSITIONING_HOLD_FRAMES) {
            advanceFromPositioning();
          }
        } else {
          positioningHoldRef.current = 0;
        }
      }

      if (!track.bothHands && sessionActive && subPhase !== "demo") {
        drawWebcamNoHandsOverlay(wctx, wv, hv);
      }

      const geo = drawLaparoscopicFrame(vctx, w, h);
      const entryL = { x: geo.cx - geo.rx * 0.85, y: geo.cy + geo.ry * 0.9 };
      const entryR = { x: geo.cx + geo.rx * 0.85, y: geo.cy + geo.ry * 0.9 };
      const { left: leftInst, right: rightInst } = buildInstruments(hands, geo);

      if (leftInst) pathSamplesRef.current.push(leftInst.tip);
      if (rightInst) pathSamplesRef.current.push(rightInst.tip);
      if (pathSamplesRef.current.length > 600) pathSamplesRef.current.shift();

      const midlineY = geo.cy;
      let instL: "grasper" | "scissors" | "driver" = "grasper";
      let instR: "grasper" | "scissors" | "driver" = "grasper";
      if (taskId === "pattern-cutting") {
        instL = "grasper";
        instR = "scissors";
      } else if (taskId === "knot-tying") {
        instL = "grasper";
        instR = "driver";
      }

      const isAssessment = mode === "assessment";
      const showGhosts =
        mode === "training" &&
        (subPhase === "demo" || subPhase === "guided") &&
        taskId === "peg-transfer";

      if (taskId === "peg-transfer") {
        for (let i = 0; i < 6; i++) {
          const c = pegCoords(i, geo, w, h);
          drawPeg(vctx, c.x, c.y, geo);
        }
        syncRingPositions(pegStateRef.current, geo, w, h, leftInst, rightInst);
        for (const ring of pegStateRef.current.rings) {
          if (ring.heldBy) {
            vctx.shadowColor = "rgba(0, 212, 170, 0.6)";
            vctx.shadowBlur = 12;
          }
          drawRing(vctx, ring, geo);
          vctx.shadowBlur = 0;
        }
      } else if (taskId === "pattern-cutting") {
        drawCutCircle(vctx, geo, patternRef.current.cutProgress, patternRef.current.dominantPath);
      } else {
        const kp = getKnotPath(geo, w, h);
        if (kp.length) drawSuturePath(vctx, kp, knotRef.current.pathProgress);
      }

      if (subPhase === "demo" && taskId === "peg-transfer" && gctx) {
        gctx.clearRect(0, 0, w, h);
        const frame = getDemoFrame(geo, demoStart, now, w, h);
        drawGhostInstrument(gctx, frame.ghostRight, entryR, pulseRef.current);
        drawGhostInstrument(gctx, frame.ghostLeft, entryL, pulseRef.current);
        const ghosts = getPegGhostTargets(geo, frame.stepIndex, 0, 3, w, h);
        drawGhostPath(gctx, ghosts.path);
        setFeedback(frame.narration);
        setPhaseLabel(`Demonstration — Step ${frame.stepIndex + 1} of 6`);
        if (isDemoComplete(demoStart, now)) {
          setGuided((g) => {
            const n = { ...g, demoSeen: true };
            saveGuidedProgress(n);
            return n;
          });
        }
      } else if (
        showGhosts &&
        subPhase === "guided" &&
        gctx &&
        taskId === "peg-transfer"
      ) {
        gctx.clearRect(0, 0, w, h);
        const step = guided.currentStep;
        const ghosts = getPegGhostTargets(
          geo,
          step,
          guided.ringIndex,
          guided.ringIndex + 3,
          w,
          h
        );
        drawGhostPath(gctx, ghosts.path);
        for (const t of ghosts.ghostTips) {
          drawGhostInstrument(gctx, t, entryR, pulseRef.current);
        }
        if (
          shouldShowHint(stepStartedRef.current, now) &&
          ghosts.hintFrom &&
          ghosts.hintTo
        ) {
          drawHintArrow(gctx, ghosts.hintFrom, ghosts.hintTo, pulseRef.current);
        }
        drawStepCompleteFlash(gctx, w, h, stepFlash);

        const result = evaluateGuidedStep({
          step,
          ringIndex: guided.ringIndex,
          geo,
          width: w,
          height: h,
          left: leftInst,
          right: rightInst,
          rings: pegStateRef.current.rings,
          stepStartedAt: stepStartedRef.current,
          midlineY,
        });
        setFeedback(result.feedback);
        setPhaseLabel(PEG_GUIDED_STEPS[step].title);
        if (result.complete && sessionActive) {
          advanceGuidedStep();
        }
      } else if (gctx) {
        gctx.clearRect(0, 0, w, h);
      }

      if (leftInst) {
        if (hands.left && hands.left.confidence < 0.6) vctx.globalAlpha = 0.4;
        drawInstrument(vctx, leftInst, entryL.x, entryL.y, instL);
        vctx.globalAlpha = 1;
        drawViewportPinchRing(
          vctx,
          leftInst.tip,
          hands.left?.pinchDistance ?? 0.12,
          hands.left?.isGrasping ?? false
        );
      }
      if (rightInst) {
        if (hands.right && hands.right.confidence < 0.6) vctx.globalAlpha = 0.4;
        drawInstrument(vctx, rightInst, entryR.x, entryR.y, instR);
        vctx.globalAlpha = 1;
        drawViewportPinchRing(
          vctx,
          rightInst.tip,
          hands.right?.pinchDistance ?? 0.12,
          hands.right?.isGrasping ?? false
        );
      }

      const leftTip = leftInst?.tip ?? null;
      const rightTip = rightInst?.tip ?? null;
      const tremor = tremorEarly;

      if (sessionActive && isAssessment) {
        stabilityTrendRef.current.push({ t: elapsed, value: tremor });
        if (stabilityTrendRef.current.length > 120) stabilityTrendRef.current.shift();
      } else if (sessionActive) {
        historyRef.current.push("tremor", tremor);
      }

      const pathCm = pathRef.current.sample(leftTip, rightTip);
      const sync = syncRef.current.updatePositions(leftTip, rightTip);
      const motion = motionRef.current.analyze(rightTip ?? leftTip);

      if (sessionActive && subPhase === "free" && taskId === "peg-transfer") {
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
        setErrorCount(
          pegStateRef.current.drops + pegStateRef.current.transferHeightErrors
        );
        if (upd.state.completed) {
          if (isAssessment) finishSession();
          else {
            setShowReadyForAssessment(true);
            setFeedback(
              "Sequence complete. Review metrics, then switch to Assessment Mode when ready."
            );
          }
        }
      } else if (sessionActive && isAssessment && taskId === "peg-transfer") {
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
        eventsRef.current.push(...upd.events);
        setErrorCount(
          pegStateRef.current.drops + pegStateRef.current.transferHeightErrors
        );
        if (upd.state.completed) finishSession();
      } else if (sessionActive && taskId === "pattern-cutting") {
        const upd = updatePatternCutting(
          patternRef.current,
          rightInst?.tip ?? null,
          leftInst?.tip ?? null,
          leftInst?.graspClosed ?? false,
          getTargetCirclePath(geo),
          geo
        );
        patternRef.current = upd.state;
        setFeedback(upd.feedback);
        setPhaseLabel(upd.phaseLabel);
        if (upd.state.completed && isAssessment) finishSession();
      } else if (sessionActive && taskId === "knot-tying" && hands.right) {
        const upd = updateKnotTying(
          knotRef.current,
          rightInst?.tip ?? null,
          getKnotPath(geo, w, h),
          estimateWristRotation(hands.right.landmarks)
        );
        knotRef.current = upd.state;
        setFeedback(upd.feedback);
        setPhaseLabel(upd.phaseLabel);
        if (upd.state.completed && isAssessment) finishSession();
      }

      const trends: LapMetricTrend[] = [];
      if (taskId === "peg-transfer") {
        trends.push({
          label: "Economy of Movement",
          value: pathCm,
          unit: "cm",
          history: historyRef.current.push("path", pathCm),
          threshold: isAssessment
            ? FLS_BENCHMARKS["peg-transfer"].maxPathLengthCm
            : undefined,
          thresholdDirection: "below",
          format: (v) => `${Math.round(v)}cm`,
        });
        trends.push({
          label: "Instrument Tremor",
          value: tremor,
          unit: "/100",
          history: historyRef.current.push("tremor", tremor),
          threshold: isAssessment
            ? FLS_BENCHMARKS["peg-transfer"].minStability
            : undefined,
          thresholdDirection: "above",
        });
        trends.push({
          label: "Bimanual Sync",
          value: sync,
          unit: "/100",
          history: historyRef.current.push("sync", sync),
          threshold: isAssessment
            ? FLS_BENCHMARKS["peg-transfer"].minBimanualSync
            : undefined,
          thresholdDirection: "above",
        });
      } else if (taskId === "pattern-cutting") {
        trends.push({
          label: "Cutting Accuracy",
          value: patternRef.current.meanDeviation,
          unit: "mm",
          history: historyRef.current.push("dev", patternRef.current.meanDeviation),
          threshold: isAssessment
            ? FLS_BENCHMARKS["pattern-cutting"].maxMeanDeviationMm
            : undefined,
          thresholdDirection: "below",
          format: (v) => `${v.toFixed(1)}mm`,
        });
        trends.push({
          label: "Completion",
          value: patternRef.current.completionPct,
          unit: "%",
          history: historyRef.current.push("comp", patternRef.current.completionPct),
          threshold: isAssessment
            ? FLS_BENCHMARKS["pattern-cutting"].minCompletionPct
            : undefined,
          thresholdDirection: "above",
        });
      } else {
        trends.push({
          label: "Arc Adherence",
          value: Math.round(knotRef.current.pathProgress * 100),
          unit: "%",
          history: historyRef.current.push("arc", knotRef.current.pathProgress * 100),
        });
      }
      setMetrics(trends);
    }

    rafRef.current = requestAnimationFrame(renderLoop);
  }, [
    taskId,
    mode,
    subPhase,
    sessionActive,
    elapsed,
    guided,
    demoStart,
    stepFlash,
    advanceGuidedStep,
    advanceFromPositioning,
    finishSession,
  ]);

  useEffect(() => {
    if (ready) rafRef.current = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, renderLoop]);

  const resetEngines = () => {
    pegStateRef.current = createInitialPegState();
    patternRef.current = createPatternCuttingState();
    knotRef.current = createKnotTyingState();
    trackingSessionRef.current?.reset();
    cameraSetupRef.current.reset();
    stabilityScoresRef.current = [];
    stabilityL.current.reset();
    stabilityR.current.reset();
    motionRef.current.reset();
    syncRef.current.reset();
    pathRef.current.reset();
    historyRef.current.reset();
    eventsRef.current = [];
    pathSamplesRef.current = [];
    stabilityTrendRef.current = [];
    feedbackHistoryRef.current = [];
    completingRef.current = false;
    setElapsed(0);
    setErrorCount(0);
    setShowReadyForAssessment(false);
    stepAdvanceLockRef.current = false;
    positioningHoldRef.current = 0;
    advancedFromPositioningRef.current = false;
  };

  const startTrainingFlow = () => {
    resetEngines();
    setSessionActive(true);
    setSubPhase("positioning");
    setPhaseLabel("Hand positioning");
    setFeedback(
      "Task started. Position both hands in the camera frame with even front lighting. Guided steps begin once tracking is stable."
    );
  };

  const skipDemo = () => {
    setGuided((g) => {
      const n = { ...g, demoSeen: true };
      saveGuidedProgress(n);
      return n;
    });
    setSessionActive(true);
    if (taskId === "peg-transfer" && !guided.guidedComplete) {
      enterGuidedPractice();
    } else {
      enterFreeOrAssessment();
    }
  };

  const startDemonstration = () => {
    setSubPhase("demo");
    setDemoStart(performance.now());
    setSessionActive(false);
    setPhaseLabel("Demonstration");
    setFeedback("Observe the demonstration before guided practice.");
  };

  const severity =
    feedback.includes("deviat") ||
    feedback.includes("instability") ||
    feedback.includes("dropped")
      ? "warning"
      : feedback.includes("low") || feedback.includes("Elevate")
        ? "caution"
        : "info";

  const isAssessment = mode === "assessment";
  const showStepIndicator =
    mode === "training" && subPhase === "guided" && taskId === "peg-transfer";
  const showHandPositioning = subPhase === "positioning";

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E12] text-[#E8EDF2]">
      <header className="border-b border-[#1E2A35] px-4 py-3">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/laparoscopic"
              className="flex items-center gap-1 text-sm text-[#6B7F8F] hover:text-[#E8EDF2]"
            >
              <ChevronLeft className="h-4 w-4" />
              FLS
            </Link>
            <span className="text-[#1E2A35]">|</span>
            <div>
              <h1 className="text-sm font-semibold">{meta.name}</h1>
              <p className="text-xs text-[#6B7F8F]">{meta.clinicalPurpose}</p>
            </div>
          </div>
          <ModeToggle
            mode={mode}
            onChange={handleModeChange}
            disabled={sessionActive && isAssessment}
          />
          <div className="flex gap-2">
            {subPhase === "idle" ? (
              <button
                type="button"
                onClick={startTrainingFlow}
                disabled={!ready}
                className="inline-flex items-center gap-2 rounded-lg bg-[#00D4AA] px-4 py-2 text-sm font-medium text-[#0A0E12] disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {mode === "assessment" ? "Begin Assessment" : "Begin Task"}
              </button>
            ) : subPhase === "demo" ? (
              <button
                type="button"
                onClick={skipDemo}
                className="rounded-lg border border-[#1E2A35] px-4 py-2 text-sm"
              >
                Skip to Guided Practice
              </button>
            ) : (
              <button
                type="button"
                onClick={finishSession}
                className="inline-flex items-center gap-2 rounded-lg border border-[#1E2A35] px-4 py-2 text-sm"
              >
                <Square className="h-4 w-4" />
                End Session
              </button>
            )}
          </div>
        </div>
        {isAssessment && sessionActive && (
          <p className="mx-auto mt-2 max-w-[1800px] text-center text-[10px] font-medium uppercase tracking-widest text-[#F0A500]">
            Assessment in progress
          </p>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-4 p-4 2xl:flex-row">
        <div className="flex min-h-[420px] flex-1 flex-col gap-4 max-[1200px]:min-h-0 lg:flex-row">
          <div className="relative flex flex-[2] flex-col rounded-xl border border-[#1E2A35] bg-[#0D1117] lg:flex-1">
            <div className="flex items-center justify-between border-b border-[#1E2A35] px-3 py-2">
              <span className="text-[10px] font-medium uppercase tracking-widest text-[#6B7F8F]">
                Webcam — Hand Tracking
              </span>
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
                  ? "TRACKING ●"
                  : trackingOk
                    ? "PARTIAL ○"
                    : "NO HANDS ○"}
              </span>
            </div>
            <div className="relative aspect-video w-full">
              <video ref={videoRef} className="hidden" playsInline muted />
              <canvas ref={webcamCanvasRef} className="h-full w-full" />
              {showHandPositioning && (
                <CameraSetupPanel status={cameraSetup} />
              )}
            </div>
          </div>

          <div
            className={`relative flex flex-[3] flex-col rounded-xl border bg-[#0D1117] lg:flex-1 ${
              isAssessment && sessionActive
                ? "border-[#F0A500]/50"
                : "border-[#1E2A35]"
            }`}
          >
            <div className="border-b border-[#1E2A35] px-3 py-2">
              <span className="text-[10px] font-medium uppercase tracking-widest text-[#6B7F8F]">
                Laparoscopic Viewport
              </span>
            </div>
            <div className="relative aspect-video w-full">
              <canvas ref={viewportCanvasRef} className="h-full w-full" />
              <canvas
                ref={ghostCanvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
              {showStepIndicator && (
                <TrainingStepIndicator
                  current={guided.currentStep}
                  total={6}
                  title={PEG_GUIDED_STEPS[guided.currentStep].title}
                />
              )}
            </div>
          </div>
        </div>

        <div className="2xl:w-72 2xl:shrink-0">
          <LapMetricsPanel
            metrics={metrics}
            timeElapsed={elapsed}
            timeBenchmark={
              isAssessment && taskId === "peg-transfer"
                ? FLS_BENCHMARKS["peg-transfer"].maxTimeSeconds
                : undefined
            }
            phaseLabel={phaseLabel}
            errorCount={errorCount}
            mode={mode}
            layout="sidebar"
          />
        </div>
      </div>

      <div className="border-t border-[#1E2A35] px-4 py-3 2xl:hidden">
        <LapMetricsPanel
          metrics={metrics}
          timeElapsed={elapsed}
          timeBenchmark={
            isAssessment && taskId === "peg-transfer"
              ? FLS_BENCHMARKS["peg-transfer"].maxTimeSeconds
              : undefined
          }
          phaseLabel={phaseLabel}
          errorCount={errorCount}
          mode={mode}
          layout="bar"
        />
      </div>

      <div className="space-y-3 px-4 pb-6">
        {subPhase === "demo" && mode === "training" && (
          <InstructionCard
            title="Phase A — Demonstration"
            body="Observe correct instrument trajectories and transfer technique. When ready, begin guided step-by-step practice."
            action={{
              label: "Begin Guided Practice",
              onClick: skipDemo,
            }}
            secondary={
              isDemoComplete(demoStart, performance.now())
                ? undefined
                : { label: "Skip demonstration", onClick: skipDemo }
            }
          />
        )}
        {subPhase === "guided" && mode === "training" && taskId === "peg-transfer" && (
          <InstructionCard
            title={PEG_GUIDED_STEPS[guided.currentStep].title}
            body={PEG_GUIDED_STEPS[guided.currentStep].instruction}
          />
        )}
        {showReadyForAssessment && mode === "training" && (
          <InstructionCard
            title="Ready for Assessment?"
            body="Free practice sessions build procedural familiarity. Switch to Assessment Mode for timed FLS-standard evaluation and a formal performance report."
            action={{
              label: "Switch to Assessment Mode",
              onClick: () => handleModeChange("assessment"),
            }}
          />
        )}
        <LapFeedbackBar
          message={
            feedback ||
            (subPhase === "idle"
              ? "Select Begin Task to start. Hand tracking calibrates after you begin."
              : "Follow on-screen guidance.")
          }
          severity={severity}
        />
      </div>

      {error && (
        <p className="px-4 pb-4 text-center text-sm text-[#E84545]">{error}</p>
      )}
    </div>
  );
}
