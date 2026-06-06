import { notFound } from "next/navigation";
import { RouteTaskWorkspace } from "@/components/laparoscopic/RouteTaskWorkspace";
import { LAPAROSCOPIC_TASKS } from "@/lib/laparoscopic/tasks";
import type { FlsTaskId } from "@/lib/laparoscopic/types";

export default async function AssessmentTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  if (!(taskId in LAPAROSCOPIC_TASKS)) notFound();

  return <RouteTaskWorkspace taskId={taskId as FlsTaskId} mode="assessment" />;
}
