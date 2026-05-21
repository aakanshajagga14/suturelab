import { Header } from "@/components/layout/Header";
import { TrainingWorkspace } from "@/components/training/TrainingWorkspace";

export const metadata = {
  title: "Training Session | SutureLab",
};

export default function SessionPage() {
  return (
    <>
      <Header showNav={false} />
      <main className="flex-1 bg-[var(--background)]">
        <TrainingWorkspace />
      </main>
    </>
  );
}
