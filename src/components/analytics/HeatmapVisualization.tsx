"use client";

import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { renderHeatmapFromData } from "@/lib/engines/heatmapRenderer";
import type { HeatmapData } from "@/lib/types";

interface HeatmapVisualizationProps {
  data: HeatmapData;
}

export function HeatmapVisualization({ data }: HeatmapVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 480;
    canvas.height = 270;
    renderHeatmapFromData(canvas, data);
  }, [data]);

  const hasData = data.cells.some((c) => c > 0.08);

  return (
    <Card
      title="Deviation Heatmap"
      subtitle="Regions of elevated path deviation and movement instability"
    >
      {!hasData ? (
        <p className="py-6 text-center text-sm text-[var(--muted)]">
          Minimal deviation recorded — trajectory remained within acceptable
          tolerance throughout the session.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-[var(--border)]">
            <canvas
              ref={canvasRef}
              className="h-auto w-full"
              aria-label="Session deviation heatmap"
            />
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded-sm bg-teal-100" />
              Low deviation
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded-sm bg-orange-300/70" />
              Moderate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded-sm bg-red-400/70" />
              Elevated
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
