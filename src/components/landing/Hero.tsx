import Link from "next/link";
import { ArrowRight, LineChart, Shield, Video } from "lucide-react";
import { Button } from "@/components/ui/Button";

const features = [
  {
    icon: Video,
    title: "Webcam Instrument Control",
    desc: "MediaPipe-powered hand tracking maps motion into laparoscopic instrument behavior.",
  },
  {
    icon: LineChart,
    title: "Assessment Metrics",
    desc: "Stability, economy of motion, smoothness, idle time, and dual-hand coordination.",
  },
  {
    icon: Shield,
    title: "Simulator Workflow",
    desc: "Focused training and timed assessment for laparoscopic skills practice.",
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center animate-fade-in">
          <p className="mb-4 inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
            AI-powered laparoscopic simulation using only a webcam
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
            LaparoSim
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--muted)]">
            Deliberate practice for minimally invasive surgery in the browser.
          </p>
          <p className="mt-4 text-base text-[var(--muted)]">
            Train peg transfer, pattern cutting, and knot tying with real-time
            instrument analytics and actionable simulator feedback.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/training">
              <Button size="lg" variant="primary">
                Start Training
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/assessment">
              <Button size="lg" variant="outline">
                Open Assessment
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {features.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"
            >
              <item.icon
                className="h-5 w-5 text-[var(--accent)]"
                strokeWidth={1.75}
              />
              <h3 className="mt-4 text-sm font-semibold text-[var(--foreground)]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
