interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md";
  variant?: "default" | "accent" | "success";
}

const variantColors = {
  default: "bg-[var(--clinical-blue)]",
  accent: "bg-[var(--accent)]",
  success: "bg-[var(--success)]",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  size = "md",
  variant = "accent",
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && (
            <span className="text-xs font-medium text-[var(--muted)]">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-xs font-semibold text-[var(--foreground)]">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div
        className={`w-full overflow-hidden rounded-full bg-[var(--border)] ${size === "sm" ? "h-1.5" : "h-2"}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${variantColors[variant]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
