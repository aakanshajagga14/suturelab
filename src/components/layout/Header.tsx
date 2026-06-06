"use client";

import Link from "next/link";
import { Activity, Moon, Sun } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  showNav?: boolean;
}

export function Header({ showNav = true }: HeaderProps) {
  const { theme, toggleTheme } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-light)]">
            <Activity
              className="h-4 w-4 text-[var(--accent)]"
              strokeWidth={2}
            />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
              LaparoSim
            </span>
            <span className="ml-2 hidden text-xs text-[var(--muted)] sm:inline">
              Surgical Simulation
            </span>
          </div>
        </Link>

        {showNav && (
          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--border)]/50"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>
            <Link href="/training">
              <Button size="sm" variant="secondary">
                Training
              </Button>
            </Link>
            <Link href="/assessment">
              <Button size="sm" variant="primary">
                Assessment
              </Button>
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
