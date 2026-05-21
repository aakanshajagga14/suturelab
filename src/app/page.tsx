import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { DashboardStats } from "@/components/landing/DashboardStats";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <DashboardStats />
      </main>
      <Footer />
    </>
  );
}
