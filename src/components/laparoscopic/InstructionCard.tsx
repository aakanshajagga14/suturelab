interface InstructionCardProps {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}

export function InstructionCard({
  title,
  body,
  action,
  secondary,
}: InstructionCardProps) {
  return (
    <div className="rounded-lg border border-[#00D4AA]/25 bg-[#0D1117] p-4">
      <p className="text-[10px] font-medium uppercase tracking-widest text-[#00D4AA]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#E8EDF2]">{body}</p>
      {(action || secondary) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="rounded-lg bg-[#00D4AA] px-4 py-2 text-sm font-medium text-[#0A0E12]"
            >
              {action.label}
            </button>
          )}
          {secondary && (
            <button
              type="button"
              onClick={secondary.onClick}
              className="rounded-lg border border-[#1E2A35] px-4 py-2 text-sm text-[#6B7F8F]"
            >
              {secondary.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
