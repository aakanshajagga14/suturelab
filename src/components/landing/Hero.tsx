import Link from "next/link";
import { ArrowRight, Shield, Video, LineChart } from "lucide-react";
import { Button } from "@/components/ui/Button";

const features = [
  {
    icon: Video,
    title: "Webcam Hand Tracking",
    desc: "MediaPipe-powered landmark detection for precise movement analysis.",
  },
  {
    icon: LineChart,
    title: "Real-Time Feedback",
    desc: "Rule-based precision scoring and trajectory guidance during practice.",
  },
  {
    icon: Shield,
    title: "Clinical-Grade UX",
    desc: "Professional interface aligned with healthcare education standards.",
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center animate-fade-in">
          <p className="mb-4 inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
            Medical Education Technology
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
            SutureLab
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[var(--muted)]">
            Accessible surgical skill training through browser-based simulation.
          </p>
          <p className="mt-4 text-base text-[var(--muted)]">
            Practice guided suturing exercises with real-time hand tracking and
            structured feedback — designed for medical students and clinical
            training programs.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/session">
              <Button size="lg" variant="primary">
                Start Session
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" disabled>
              Institution Login
              <span className="ml-1 text-xs text-[var(--muted)]">(Coming soon)</span>
            </Button>
          </div>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {features.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
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
