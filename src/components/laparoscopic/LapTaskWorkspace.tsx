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
  type CameraSetupStatus,
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
import { LapSessionSidebar } from "@/components/laparoscopic/LapSessionSidebar";
import { ModeToggle } from "@/components/laparoscopic/ModeToggle";
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
  setFlsSessionMode,
  loadGuidedProgress,
  saveGuidedProgress,
  createDefaultGuidedProgress,
  type FlsSessionMode,
  type TrainingSubPhase,
  type GuidedProgressStore,
} from "@/lib/laparoscopic/trainingMode";
import { useGuidedProgress } from "@/hooks/use-client-storage";
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
import { drawInstrumentGuidePath } from "@/lib/laparoscopic/canvasGuides";

interface LapTaskWorkspaceProps {
  taskId: FlsTaskId;
  initialMode?: FlsSessionMode;
}

const INITIAL_CAMERA_SETUP: CameraSetupStatus = {
  handDetection: "waiting",
  lighting: "waiting",
  bothHandsVisible: "waiting",
  readyToBegin: false,
  holdProgress: 0,
};

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
      false
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

export function LapTaskWorkspace({
  taskId,
  initialMode = "training",
}: LapTaskWorkspaceProps) {
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

  const [mode, setMode] = useState<FlsSessionMode>(initialMode);
  const [subPhase, setSubPhase] = useState<TrainingSubPhase>("idle");
  const persistedGuided = useGuidedProgress(taskId);
  const [guidedOverride, setGuidedOverride] =
    useState<GuidedProgressStore | null>(null);
  const guided = guidedOverride ?? persistedGuided;

  const setGuided = useCallback(
    (action: GuidedProgressStore | ((prev: GuidedProgressStore) => GuidedProgressStore)) => {
      setGuidedOverride((prev) => {
        const base = prev ?? persistedGuided;
        const next = typeof action === "function" ? action(base) : action;
        saveGuidedProgress(next);
        return next;
      });
    },
    [persistedGuided]
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
  const demoStartRef = useRef(0);
  const [showReadyForAssessment, setShowReadyForAssessment] = useState(false);
  const [cameraSetup, setCameraSetup] =
    useState<CameraSetupStatus>(INITIAL_CAMERA_SETUP);

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
  const stepStartedRef = useRef(0);
  const completingRef = useRef(false);
  const stepAdvanceLockRef = useRef(false);
  const positioningHoldRef = useRef(0);
  const advancedFromPositioningRef = useRef(false);
  const stepCompleteHandledRef = useRef(false);
  const demoMarkedRef = useRef(false);
  const pegCompleteHandledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseRef = useRef(0);
  const loopRef = useRef({
    subPhase: "idle" as TrainingSubPhase,
    sessionActive: false,
    mode: initialMode as FlsSessionMode,
    guided: createDefaultGuidedProgress(taskId),
    elapsed: 0,
    demoStart: 0,
    stepFlash: 0,
    taskId,
  });
  const lastFeedbackRef = useRef("");
  const lastPhaseRef = useRef("");
  const lastUiSyncRef = useRef(0);
  const lastErrorCountRef = useRef(0);

  useEffect(() => {
    loopRef.current = {
      subPhase,
      sessionActive,
      mode,
      guided,
      elapsed,
      demoStart: demoStartRef.current,
      stepFlash,
      taskId,
    };
  }, [subPhase, sessionActive, mode, guided, elapsed, stepFlash, taskId]);

  const setFeedbackIfChanged = (msg: string) => {
    if (msg !== lastFeedbackRef.current) {
      lastFeedbackRef.current = msg;
      setFeedback(msg);
    }
  };

  const setPhaseIfChanged = (label: string) => {
    if (label !== lastPhaseRef.current) {
      lastPhaseRef.current = label;
      setPhaseLabel(label);
    }
  };
  const TRACKING_CONFIDENCE_MIN = 0.45;
  const POSITIONING_HOLD_FRAMES = 12;
  const UI_SYNC_MS = 120;

  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 24 },
        },
        audio: false,
      });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
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
        trackingSessionRef.current = new DualHandTrackingSession(initialMode);
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setError("Hand tracking initialization failed.");
      }
    })();
    const video = videoRef.current;
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, [initCamera, initialMode]);

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
    router.push(`/report/${report.id}`);
  }, [elapsed, mode, router, taskId, phaseLabel]);

  const enterGuidedPractice = useCallback(() => {
    setSubPhase("guided");
    stepStartedRef.current = Date.now();
    const progress = loadGuidedProgress(taskId);
    setGuided(progress);
    setFeedback(PEG_GUIDED_STEPS[progress.currentStep].instruction);
    lastFeedbackRef.current = PEG_GUIDED_STEPS[progress.currentStep].instruction;
    setPhaseLabel(PEG_GUIDED_STEPS[progress.currentStep].title);
    lastPhaseRef.current = PEG_GUIDED_STEPS[progress.currentStep].title;
  }, [taskId, setGuided]);

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
    stepCompleteHandledRef.current = true;
    setTimeout(() => {
      stepAdvanceLockRef.current = false;
      stepCompleteHandledRef.current = false;
    }, 900);
    setStepFlash(1);
    setTimeout(() => setStepFlash(0), 300);
    setGuided((g) => {
      const next = { ...g };
      next.completedSteps[next.currentStep] = true;
      if (next.currentStep < 5) {
        next.currentStep += 1;
        stepStartedRef.current = Date.now();
        const msg = `Step complete — proceeding. ${PEG_GUIDED_STEPS[next.currentStep].instruction}`;
        lastFeedbackRef.current = msg;
        setFeedback(msg);
        setPhaseLabel(PEG_GUIDED_STEPS[next.currentStep].title);
        lastPhaseRef.current = PEG_GUIDED_STEPS[next.currentStep].title;
      } else {
        next.guidedComplete = true;
        setSubPhase("free");
        setSessionActive(true);
        const msg =
          "Guided steps complete for Ring 1. Continue free practice for remaining rings.";
        lastFeedbackRef.current = msg;
        setFeedback(msg);
      }
      return next;
    });
  }, [setGuided]);

  const handlersRef = useRef({
    advanceGuidedStep,
    advanceFromPositioning,
    finishSession,
    setFeedbackIfChanged,
    setPhaseIfChanged,
  });

  useEffect(() => {
    handlersRef.current = {
      advanceGuidedStep,
      advanceFromPositioning,
      finishSession,
      setFeedbackIfChanged,
      setPhaseIfChanged,
    };
  });

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const tick = () => {
      if (!active) return;

      const {
        subPhase: phase,
        sessionActive: sessionOn,
        mode: sessionMode,
        guided: guidedState,
        elapsed: elapsedSec,
        demoStart: demoT,
        stepFlash: flash,
        taskId: activeTask,
      } = loopRef.current;

      const {
        advanceGuidedStep: onAdvanceGuided,
        advanceFromPositioning: onAdvancePositioning,
        finishSession: onFinishSession,
        setFeedbackIfChanged: onFeedback,
        setPhaseIfChanged: onPhase,
      } = handlersRef.current;

      const video = videoRef.current;
      const webcamCanvas = webcamCanvasRef.current;
      const viewportCanvas = viewportCanvasRef.current;
      const ghostCanvas = ghostCanvasRef.current;
      const landmarker = landmarkerRef.current;

      if (!video || !webcamCanvas || !viewportCanvas || !landmarker) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const wv = webcamCanvas.width;
      const hv = webcamCanvas.height;
      const w = viewportCanvas.width;
      const h = viewportCanvas.height;
      const now = performance.now();
      pulseRef.current += 0.05;

      if (video.videoWidth < 1 || video.videoHeight < 1) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const wctx = webcamCanvas.getContext("2d");
      const vctx = viewportCanvas.getContext("2d");
      const gctx = ghostCanvas?.getContext("2d");

      if (!wctx || !vctx) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (video.readyState >= 2) {
        drawWebcamFeed(wctx, video, wv, hv);
        const session = trackingSessionRef.current;
        const hands = session
          ? session.detect(landmarker, video)
          : { left: null, right: null };

        const brightness = sampleFrameBrightness(wctx, wv, hv);
        let nextCameraSetup: CameraSetupStatus | null = null;
        if (phase === "positioning") {
          nextCameraSetup = cameraSetupRef.current.evaluate({
            leftConfidence: hands.left?.confidence ?? 0,
            rightConfidence: hands.right?.confidence ?? 0,
            brightness,
            now,
          });
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
          (hands.left && hands.left.confidence < 0.45) ||
          (hands.right && hands.right.confidence < 0.45);
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
          activeTask,
          wv,
          hv,
          trackingUi
        );

        if (phase === "positioning") {
          const leftOk =
            (hands.left?.confidence ?? 0) >= TRACKING_CONFIDENCE_MIN;
          const rightOk =
            (hands.right?.confidence ?? 0) >= TRACKING_CONFIDENCE_MIN;
          const trackingGood = track.bothHands && leftOk && rightOk;

          if (trackingGood) {
            positioningHoldRef.current += 1;
            if (
              positioningHoldRef.current >= POSITIONING_HOLD_FRAMES &&
              !advancedFromPositioningRef.current
            ) {
              onAdvancePositioning();
            }
          } else {
            positioningHoldRef.current = 0;
          }
        }

        if (!track.bothHands && sessionOn && phase !== "demo") {
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
        if (activeTask === "pattern-cutting") {
          instL = "grasper";
          instR = "scissors";
        } else if (activeTask === "knot-tying") {
          instL = "grasper";
          instR = "driver";
        }

        const isAssessment = sessionMode === "assessment";
        const showGhosts =
          sessionMode === "training" &&
          (phase === "demo" || phase === "guided") &&
          activeTask === "peg-transfer";

        if (activeTask === "peg-transfer") {
          for (let i = 0; i < 6; i++) {
            const c = pegCoords(i, geo);
            drawPeg(vctx, c.x, c.y);
          }
          syncRingPositions(pegStateRef.current, geo, leftInst, rightInst);
          for (const ring of pegStateRef.current.rings) {
            if (ring.heldBy) {
              vctx.shadowColor = "rgba(0, 212, 170, 0.6)";
              vctx.shadowBlur = 12;
            }
            drawRing(vctx, ring);
            vctx.shadowBlur = 0;
          }
        } else if (activeTask === "pattern-cutting") {
          drawCutCircle(
            vctx,
            geo,
            patternRef.current.cutProgress,
            patternRef.current.dominantPath
          );
        } else {
          const kp = getKnotPath(geo);
          if (kp.length) {
            drawInstrumentGuidePath(vctx, kp, knotRef.current.pathProgress);
          }
        }

        if (phase === "demo" && activeTask === "peg-transfer" && gctx) {
          gctx.clearRect(0, 0, w, h);
          const frame = getDemoFrame(geo, demoT, now);
          drawGhostInstrument(gctx, frame.ghostRight, entryR, pulseRef.current);
          drawGhostInstrument(gctx, frame.ghostLeft, entryL, pulseRef.current);
          const ghosts = getPegGhostTargets(geo, frame.stepIndex, 0, 3);
          drawGhostPath(gctx, ghosts.path);
          onFeedback(frame.narration);
          onPhase(`Demonstration — Step ${frame.stepIndex + 1} of 6`);
          if (isDemoComplete(demoT, now) && !demoMarkedRef.current) {
            demoMarkedRef.current = true;
            setGuided((g) => ({ ...g, demoSeen: true }));
          }
        } else if (
          showGhosts &&
          phase === "guided" &&
          gctx &&
          activeTask === "peg-transfer"
        ) {
          gctx.clearRect(0, 0, w, h);
          const step = guidedState.currentStep;
          const ghosts = getPegGhostTargets(
            geo,
            step,
            guidedState.ringIndex,
            guidedState.ringIndex + 3
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
          drawStepCompleteFlash(gctx, w, h, flash);

          const result = evaluateGuidedStep({
            step,
            ringIndex: guidedState.ringIndex,
            geo,
            width: w,
            height: h,
            left: leftInst,
            right: rightInst,
            rings: pegStateRef.current.rings,
            stepStartedAt: stepStartedRef.current,
            midlineY,
          });
          onFeedback(result.feedback);
          onPhase(PEG_GUIDED_STEPS[step].title);
          if (result.complete && sessionOn && !stepCompleteHandledRef.current) {
            onAdvanceGuided();
          } else if (!result.complete) {
            stepCompleteHandledRef.current = false;
          }
        } else if (gctx) {
          gctx.clearRect(0, 0, w, h);
        }

        if (leftInst) {
          if (hands.left && hands.left.confidence < 0.45) vctx.globalAlpha = 0.4;
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
          if (hands.right && hands.right.confidence < 0.45) vctx.globalAlpha = 0.4;
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

        if (sessionOn && isAssessment) {
          stabilityTrendRef.current.push({ t: elapsedSec, value: tremor });
          if (stabilityTrendRef.current.length > 120) {
            stabilityTrendRef.current.shift();
          }
        } else if (sessionOn) {
          historyRef.current.push("tremor", tremor);
        }

        const pathCm = pathRef.current.sample(leftTip, rightTip);
        const sync = syncRef.current.updatePositions(leftTip, rightTip);
        motionRef.current.analyze(rightTip ?? leftTip);

        let nextErrorCount = lastErrorCountRef.current;

        if (sessionOn && phase === "free" && activeTask === "peg-transfer") {
          const upd = updatePegTransfer(
            pegStateRef.current,
            leftInst,
            rightInst,
            geo,
            elapsedSec
          );
          pegStateRef.current = upd.state;
          if (isAssessment) eventsRef.current.push(...upd.events);
          onFeedback(upd.feedback);
          onPhase(upd.phaseLabel);
          nextErrorCount =
            pegStateRef.current.drops + pegStateRef.current.transferHeightErrors;
          if (upd.state.completed && !pegCompleteHandledRef.current) {
            pegCompleteHandledRef.current = true;
            if (isAssessment) onFinishSession();
            else {
              setShowReadyForAssessment(true);
              onFeedback(
                "Sequence complete. Review metrics, then switch to Assessment Mode when ready."
              );
            }
          }
        } else if (sessionOn && activeTask === "pattern-cutting") {
          const upd = updatePatternCutting(
            patternRef.current,
            rightInst?.tip ?? null,
            leftInst?.tip ?? null,
            leftInst?.graspClosed ?? false,
            getTargetCirclePath(geo)
          );
          patternRef.current = upd.state;
          onFeedback(upd.feedback);
          onPhase(upd.phaseLabel);
          if (
            upd.state.completed &&
            isAssessment &&
            !pegCompleteHandledRef.current
          ) {
            pegCompleteHandledRef.current = true;
            onFinishSession();
          }
        } else if (sessionOn && activeTask === "knot-tying" && hands.right) {
          const upd = updateKnotTying(
            knotRef.current,
            rightInst?.tip ?? null,
            getKnotPath(geo),
            estimateWristRotation(hands.right.landmarks)
          );
          knotRef.current = upd.state;
          onFeedback(upd.feedback);
          onPhase(upd.phaseLabel);
          if (
            upd.state.completed &&
            isAssessment &&
            !pegCompleteHandledRef.current
          ) {
            pegCompleteHandledRef.current = true;
            onFinishSession();
          }
        }

        const trends: LapMetricTrend[] = [];
        if (activeTask === "peg-transfer") {
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
        } else if (activeTask === "pattern-cutting") {
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
        if (now - lastUiSyncRef.current >= UI_SYNC_MS) {
          lastUiSyncRef.current = now;
          setMetrics(trends);
          setTrackingOk(track.tracking);
          setBothHands(track.bothHands);
          if (nextCameraSetup) setCameraSetup(nextCameraSetup);
          if (nextErrorCount !== lastErrorCountRef.current) {
            lastErrorCountRef.current = nextErrorCount;
            setErrorCount(nextErrorCount);
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [ready, setGuided]);

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
    lastErrorCountRef.current = 0;
    lastFeedbackRef.current = "";
    lastPhaseRef.current = "";
    lastUiSyncRef.current = 0;
    stepAdvanceLockRef.current = false;
    positioningHoldRef.current = 0;
    advancedFromPositioningRef.current = false;
    stepCompleteHandledRef.current = false;
    demoMarkedRef.current = false;
    pegCompleteHandledRef.current = false;
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
    setGuided((g) => ({ ...g, demoSeen: true }));
    setSessionActive(true);
    if (taskId === "peg-transfer" && !guided.guidedComplete) {
      enterGuidedPractice();
    } else {
      enterFreeOrAssessment();
    }
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
  const showHandPositioning = subPhase === "positioning";
  const guidedStepInfo =
    subPhase === "guided" && taskId === "peg-transfer"
      ? {
          current: guided.currentStep,
          total: 6,
          title: PEG_GUIDED_STEPS[guided.currentStep].title,
          instruction: PEG_GUIDED_STEPS[guided.currentStep].instruction,
        }
      : undefined;

  const sidebarFeedback =
    showReadyForAssessment && mode === "training"
      ? "Guided sequence complete. Switch to Assessment Mode for timed evaluation."
      : feedback ||
        (subPhase === "idle"
          ? "Select Begin Task to start. Hand tracking calibrates after you begin."
          : subPhase === "positioning"
            ? "Position both hands in frame. Guided steps begin once tracking is stable."
            : "Follow simulator feedback.");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0A0E12] text-[#E8EDF2]">
      <header className="shrink-0 border-b border-[#1E2A35] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={mode === "assessment" ? "/assessment" : "/training"}
              className="flex shrink-0 items-center gap-1 text-sm text-[#6B7F8F] hover:text-[#E8EDF2]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Link>
            <span className="text-[#1E2A35]">|</span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold">{meta.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle
              mode={mode}
              onChange={handleModeChange}
              disabled={sessionActive && isAssessment}
            />
            {subPhase === "idle" ? (
              <button
                type="button"
                onClick={startTrainingFlow}
                disabled={!ready}
                className="inline-flex items-center gap-2 rounded-lg bg-[#00D4AA] px-3 py-1.5 text-sm font-medium text-[#0A0E12] disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {mode === "assessment" ? "Begin Assessment" : "Begin Task"}
              </button>
            ) : subPhase === "demo" ? (
              <button
                type="button"
                onClick={skipDemo}
                className="rounded-lg border border-[#1E2A35] px-3 py-1.5 text-sm"
              >
                Skip Demo
              </button>
            ) : (
              <button
                type="button"
                onClick={finishSession}
                className="inline-flex items-center gap-2 rounded-lg border border-[#1E2A35] px-3 py-1.5 text-sm"
              >
                <Square className="h-4 w-4" />
                End
              </button>
            )}
          </div>
        </div>
        {isAssessment && sessionActive && (
          <p className="mt-1 text-center text-[10px] font-medium uppercase tracking-widest text-[#F0A500]">
            Assessment in progress
          </p>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 lg:flex-row lg:p-3">
        <div className="flex min-h-0 flex-[2] flex-col gap-2 lg:flex-row">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#1E2A35] bg-[#0D1117]">
            <div className="shrink-0 border-b border-[#1E2A35] px-2 py-1.5">
              <span className="text-[10px] font-medium uppercase tracking-widest text-[#6B7F8F]">
                Webcam
              </span>
            </div>
            <div className="relative min-h-0 flex-1">
              <video ref={videoRef} className="hidden" playsInline muted />
              <canvas ref={webcamCanvasRef} className="h-full w-full object-contain" />
              {showHandPositioning && (
                <CameraSetupPanel
                  status={cameraSetup}
                  onSkip={advanceFromPositioning}
                />
              )}
            </div>
          </div>

          <div
            className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-[#0D1117] ${
              isAssessment && sessionActive
                ? "border-[#F0A500]/50"
                : "border-[#1E2A35]"
            }`}
          >
            <div className="shrink-0 border-b border-[#1E2A35] px-2 py-1.5">
              <span className="text-[10px] font-medium uppercase tracking-widest text-[#6B7F8F]">
                Laparoscopic Viewport
              </span>
            </div>
            <div className="relative min-h-0 flex-1">
              <canvas ref={viewportCanvasRef} className="h-full w-full object-contain" />
              <canvas
                ref={ghostCanvasRef}
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />
            </div>
          </div>
        </div>

        <LapSessionSidebar
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
          feedback={sidebarFeedback}
          feedbackSeverity={severity}
          subPhase={subPhase}
          guidedStep={guidedStepInfo}
          trackingOk={trackingOk}
          bothHands={bothHands}
        />
      </div>

      {error && (
        <p className="shrink-0 px-3 pb-2 text-center text-xs text-[#E84545]">
          {error}
        </p>
      )}
    </div>
  );
}
