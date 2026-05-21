import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SummaryReport } from "@/components/summary/SummaryReport";

export const metadata = {
  title: "Session Summary | SutureLab",
};

export default function SummaryPage() {
  return (
    <>
      <Header showNav={false} />
      <main className="flex-1 bg-[var(--background)]">
        <SummaryReport />
      </main>
      <Footer />
    </>
  );
}
