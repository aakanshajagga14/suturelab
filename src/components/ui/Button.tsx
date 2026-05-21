import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary:
    "bg-[var(--accent)] text-white hover:opacity-90 shadow-sm disabled:opacity-50",
  secondary:
    "bg-[var(--clinical-blue-light)] text-[var(--clinical-blue)] hover:opacity-90",
  ghost: "text-[var(--muted)] hover:bg-[var(--border)]/50",
  outline:
    "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:ring-offset-2 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
