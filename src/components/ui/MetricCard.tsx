import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  icon?: LucideIcon;
}

export function MetricCard({
  label,
  value,
  unit = "%",
  icon: Icon,
}: MetricCardProps) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
        {Icon && (
          <Icon className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.75} />
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
        {typeof value === "number" ? Math.round(value) : value}
        <span className="ml-0.5 text-sm font-normal text-[var(--muted)]">
          {unit}
        </span>
      </p>
    </div>
  );
}
