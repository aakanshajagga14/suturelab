import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";

const workflow = [
  "Select a laparoscopic task",
  "Calibrate webcam tracking",
  "Run a training or assessment session",
  "Review metrics and improvement guidance",
];

export function DashboardStats() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Supported Tasks" subtitle="Laparoscopic curriculum">
          <ul className="space-y-3">
            <li className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Peg Transfer</p>
                <p className="text-xs text-[var(--muted)]">
                  Bimanual transfer control
                </p>
              </div>
              <Link
                href="/training"
                className="rounded-md bg-[var(--clinical-blue-light)] px-2 py-0.5 text-xs font-medium text-[var(--clinical-blue)]"
              >
                Open
              </Link>
            </li>
            <li className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Pattern Cutting</p>
                <p className="text-xs text-[var(--muted)]">
                  Precision under traction
                </p>
              </div>
              <span className="rounded-md bg-[var(--accent-light)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                Active
              </span>
            </li>
            <li className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3 opacity-70">
              <p className="text-sm text-[var(--muted)]">Knot Tying</p>
              <span className="text-xs text-[var(--muted)]">
                Progress gated
              </span>
            </li>
          </ul>
        </Card>

        <Card title="Metrics and Analytics" subtitle="Assessment driven">
          <div className="space-y-4">
            <ProgressBar
              label="Instrument stability"
              value={0}
              variant="accent"
            />
            <ProgressBar
              label="Economy of motion"
              value={0}
              variant="default"
            />
            <p className="text-xs text-[var(--muted)]">
              Reports track path efficiency, tremor, smoothness, idle time, and
              dual-hand coordination.
            </p>
          </div>
        </Card>

        <Card title="Demo Workflow" subtitle="How it works">
          <ol className="space-y-3 text-sm text-[var(--muted)]">
            {workflow.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="font-mono text-xs text-[var(--accent)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </section>
  );
}
