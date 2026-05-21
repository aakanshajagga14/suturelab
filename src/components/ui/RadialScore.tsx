interface RadialScoreProps {
  value: number;
  label: string;
  size?: number;
  strokeWidth?: number;
}

export function RadialScore({
  value,
  label,
  size = 72,
  strokeWidth = 5,
}: RadialScoreProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, value));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-[var(--foreground)]">
          {Math.round(pct)}
        </span>
      </div>
      <span className="max-w-[80px] text-center text-xs font-medium text-[var(--muted)]">
        {label}
      </span>
    </div>
  );
}
