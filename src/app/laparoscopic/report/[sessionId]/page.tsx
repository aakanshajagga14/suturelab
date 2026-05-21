import { LapSessionReportView } from "@/components/laparoscopic/LapSessionReport";

export default async function LapReportPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LapSessionReportView sessionId={sessionId} />;
}
