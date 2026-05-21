import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function DashboardStats() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Training Modules" subtitle="Available procedures">
          <ul className="space-y-3">
            <li className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3">
              <div>
                <p className="text-sm font-medium">FLS Laparoscopic Module</p>
                <p className="text-xs text-[var(--muted)]">Peg transfer · Pattern cut · Knot tying</p>
              </div>
              <Link
                href="/laparoscopic"
                className="rounded-md bg-[var(--clinical-blue-light)] px-2 py-0.5 text-xs font-medium text-[var(--clinical-blue)]"
              >
                Open
              </Link>
            </li>
            <li className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Simple Interrupted Suture</p>
                <p className="text-xs text-[var(--muted)]">Beginner · 8–12 min</p>
              </div>
              <span className="rounded-md bg-[var(--accent-light)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                Active
              </span>
            </li>
            <li className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3 opacity-50">
              <p className="text-sm text-[var(--muted)]">Continuous Suture</p>
              <span className="text-xs text-[var(--muted)]">Soon</span>
            </li>
          </ul>
        </Card>

        <Card title="Session Overview" subtitle="Your progress this week">
          <div className="space-y-4">
            <ProgressBar label="Path adherence" value={0} variant="accent" />
            <ProgressBar label="Hand stability" value={0} variant="default" />
            <p className="text-xs text-[var(--muted)]">
              Complete your first session to populate performance metrics.
            </p>
          </div>
        </Card>

        <Card title="Platform" subtitle="Institution features">
          <div className="space-y-3 text-sm text-[var(--muted)]">
            <p>Multi-session tracking and cohort analytics available for institutional licenses.</p>
            <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs">
              Future: Multilingual AI assistant for procedural guidance
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}
