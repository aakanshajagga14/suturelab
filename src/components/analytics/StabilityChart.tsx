"use client";

import type { StabilityTrendPoint } from "@/lib/types";

interface StabilityChartProps {
  data: StabilityTrendPoint[];
  width?: number;
  height?: number;
}

export function StabilityChart({
  data,
  width = 480,
  height = 140,
}: StabilityChartProps) {
  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-[var(--muted)]">
        Insufficient stability data recorded for trend visualization.
      </p>
    );
  }

  const padding = { top: 12, right: 12, bottom: 24, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxT = Math.max(...data.map((d) => d.t), 1);
  const points = data
    .map((d) => {
      const x = padding.left + (d.t / maxT) * chartW;
      const y = padding.top + chartH - (d.value / 100) * chartH;
      return `${x},${y}`;
    })
    .join(" ");

  const yTicks = [0, 50, 100];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-full"
      role="img"
      aria-label="Stability trend over session duration"
    >
      {yTicks.map((tick) => {
        const y = padding.top + chartH - (tick / 100) * chartH;
        return (
          <g key={tick}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-[var(--muted)] text-[10px]"
            >
              {tick}
            </text>
          </g>
        );
      })}
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x={width / 2}
        y={height - 4}
        textAnchor="middle"
        className="fill-[var(--muted)] text-[10px]"
      >
        Session time (seconds)
      </text>
    </svg>
  );
}
