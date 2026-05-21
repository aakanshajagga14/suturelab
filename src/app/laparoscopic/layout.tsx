import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FLS Laparoscopic Training | SutureLab",
  description:
    "Fundamentals of Laparoscopic Surgery training module with real-time instrument tracking.",
};

export default function LaparoscopicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${dmSans.variable} ${jetbrains.variable} min-h-screen bg-[#0A0E12] font-[family-name:var(--font-dm-sans)] text-[#E8EDF2]`}
    >
      {children}
    </div>
  );
}
