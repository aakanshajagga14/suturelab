interface TrainingStepIndicatorProps {
  current: number;
  total: number;
  title: string;
  /** When true, renders without absolute positioning (for sidebar use). */
  inline?: boolean;
}

export function TrainingStepIndicator({
  current,
  total,
  title,
  inline = false,
}: TrainingStepIndicatorProps) {
  const content = (
    <>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full ${
              i < current
                ? "bg-[#00D4AA]"
                : i === current
                  ? "animate-pulse-subtle bg-[#00D4AA]"
                  : "border border-[#6B7F8F] bg-transparent"
            }`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-[#6B7F8F]">
        Step {current + 1} of {total}
      </p>
      <p className="text-sm font-medium text-[#E8EDF2]">{title}</p>
    </>
  );

  if (inline) return content;

  return (
    <div className="absolute left-3 right-3 top-3 z-10 rounded-lg border border-[#1E2A35]/80 bg-[#0D1117]/90 px-3 py-2 backdrop-blur-sm">
      {content}
    </div>
  );
}
