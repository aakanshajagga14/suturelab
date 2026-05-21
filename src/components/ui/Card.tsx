import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function Card({ children, className = "", title, subtitle }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] ${className}`}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--muted)]">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
