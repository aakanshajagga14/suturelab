"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Camera, CameraOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  initHandLandmarker,
  detectHands,
  drawHandSkeleton,
  drawStitchPath,
  normalizedToCanvas,
  LANDMARK,
} from "@/lib/mediapipe/handTracker";
import { generateStitchPath } from "@/lib/suturing/stitchPath";
import { PerformancePipeline } from "@/lib/engines/performancePipeline";
import type { LivePerformanceMetrics, SessionAnalytics } from "@/lib/types";
import type { HandLandmarker } from "@mediapipe/tasks-vision";

export interface WebcamCanvasHandle {
  startSession: () => void;
  endSession: () => void;
  isSessionActive: boolean;
}

export type WebcamMetrics = LivePerformanceMetrics;

interface WebcamCanvasProps {
  onMetricsUpdate: (metrics: WebcamMetrics) => void;
  onSessionComplete: (analytics: SessionAnalytics) => void;
  sessionActive: boolean;
}

export const WebcamCanvas = forwardRef<WebcamCanvasHandle, WebcamCanvasProps>(
  function WebcamCanvas(
    { onMetricsUpdate, onSessionComplete, sessionActive },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const landmarkerRef = useRef<HandLandmarker | null>(null);
    const pipelineRef = useRef(new PerformancePipeline());
    const rafRef = useRef<number>(0);
    const lastTimestampRef = useRef<number>(0);
    const fpsFramesRef = useRef<number[]>([]);
    const pathRef = useRef<ReturnType<typeof generateStitchPath>>([]);
    const lastPathProgressRef = useRef(0);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const elapsedRef = useRef(0);

    const [cameraReady, setCameraReady] = useState(false);
    const [trackingReady, setTrackingReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [fps, setFps] = useState(0);
    const [isTracking, setIsTracking] = useState(false);

    const initCamera = useCallback(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();

        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          pathRef.current = generateStitchPath(canvas.width, canvas.height);
        }

        setCameraReady(true);
        setError(null);
      } catch {
        setError(
          "Camera access denied. Please enable webcam permissions to continue."
        );
      }
    }, []);

    const initTracking = useCallback(async () => {
      try {
        landmarkerRef.current = await initHandLandmarker();
        setTrackingReady(true);
      } catch {
        setError("Failed to initialize hand tracking. Please refresh the page.");
      }
    }, []);

    useEffect(() => {
      initCamera();
      initTracking();
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        const video = videoRef.current;
        if (video?.srcObject) {
          (video.srcObject as MediaStream)
            .getTracks()
            .forEach((t) => t.stop());
        }
      };
    }, [initCamera, initTracking]);

    const completeSession = useCallback(() => {
      pipelineRef.current.endSession();
      const analytics = pipelineRef.current.analyticsRecorder.toAnalytics(true);
      onSessionComplete(analytics);
      setIsSessionActive(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }, [onSessionComplete]);

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

      ctx.save();
      ctx.clearRect(0, 0, w, h);
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      const path = pathRef.current;
      const pipeline = pipelineRef.current;
      const now = performance.now();
      let liveMetrics: LivePerformanceMetrics | null = null;

      if (trackingReady) {
        try {
          const hand = detectHands(landmarker, video, Math.floor(now));
          if (hand) {
            setIsTracking(true);
            drawHandSkeleton(ctx, hand.landmarks, w, h, true);

            const finger = normalizedToCanvas(
              hand.landmarks[LANDMARK.INDEX_FINGER_TIP],
              w,
              h,
              true
            );
            const wrist = normalizedToCanvas(
              hand.landmarks[LANDMARK.WRIST],
              w,
              h,
              true
            );

            if (path.length > 0) {
              const progress = pipeline.processFrame({
                fingerTip: finger,
                wrist,
                path,
                pathProgress: 0,
                canvasWidth: w,
                canvasHeight: h,
                timestamp: now,
              });

              if (progress) {
                liveMetrics = progress;
                lastPathProgressRef.current = progress.pathProgress;
                if (path.length > 0) {
                  drawStitchPath(ctx, path, progress.pathProgress);
                }

                if (
                  isSessionActive &&
                  progress.pathProgress >= 0.95
                ) {
                  completeSession();
                }
              }
            }
          } else {
            setIsTracking(false);
          }
        } catch {
          setIsTracking(false);
        }
      }

      if (path.length > 0 && !liveMetrics) {
        drawStitchPath(ctx, path, lastPathProgressRef.current);
      }

      const frameDelta = now - lastTimestampRef.current;
      if (frameDelta > 0) {
        fpsFramesRef.current.push(1000 / frameDelta);
        if (fpsFramesRef.current.length > 30) fpsFramesRef.current.shift();
        setFps(
          Math.round(
            fpsFramesRef.current.reduce((a, b) => a + b, 0) /
              fpsFramesRef.current.length
          )
        );
      }
      lastTimestampRef.current = now;

      if (liveMetrics && (isSessionActive || isTracking)) {
        const avgFps =
          fpsFramesRef.current.length > 0
            ? Math.round(
                fpsFramesRef.current.reduce((a, b) => a + b, 0) /
                  fpsFramesRef.current.length
              )
            : 0;

        onMetricsUpdate({
          ...liveMetrics,
          fps: avgFps,
          elapsedSeconds: elapsedRef.current,
        });
      }

      rafRef.current = requestAnimationFrame(renderLoop);
    }, [
      trackingReady,
      isSessionActive,
      isTracking,
      onMetricsUpdate,
      completeSession,
    ]);

    useEffect(() => {
      if (cameraReady && trackingReady) {
        rafRef.current = requestAnimationFrame(renderLoop);
      }
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, [cameraReady, trackingReady, renderLoop]);

    useImperativeHandle(ref, () => ({
      startSession: () => {
        pipelineRef.current.resetSession();
        lastPathProgressRef.current = 0;
        elapsedRef.current = 0;
        setIsSessionActive(true);

        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
          elapsedRef.current += 1;
        }, 1000);
      },
      endSession: () => {
        pipelineRef.current.endSession();
        const analytics =
          pipelineRef.current.analyticsRecorder.toAnalytics(false);
        onSessionComplete(analytics);
        setIsSessionActive(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      },
      isSessionActive,
    }));

    return (
      <div className="relative flex flex-col">
        <div className="relative aspect-video overflow-hidden rounded-xl border border-[var(--border)] bg-slate-900">
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={canvasRef} className="h-full w-full object-cover" />

          {!cameraReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
              <p className="text-sm text-slate-300 animate-pulse-subtle">
                Initializing clinical tracking systems…
              </p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/95 p-6 text-center">
              <AlertCircle className="h-8 w-8 text-amber-400" />
              <p className="text-sm text-slate-200">{error}</p>
              <Button variant="secondary" size="sm" onClick={initCamera}>
                Retry Camera
              </Button>
            </div>
          )}

          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/50 px-2.5 py-1.5 backdrop-blur-sm">
            {isTracking ? (
              <Camera className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <CameraOff className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span className="text-xs text-slate-200">
              {isTracking ? `Tracking · ${fps} FPS` : "Awaiting hand detection"}
            </span>
          </div>

          {sessionActive && (
            <div className="absolute top-3 right-3 rounded-lg bg-[var(--accent)]/90 px-2.5 py-1 text-xs font-medium text-white">
              Session Active
            </div>
          )}
        </div>
      </div>
    );
  }
);
