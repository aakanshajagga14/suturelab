import type { ProceduralPhaseId, ProceduralPhaseInfo } from "@/lib/types";

export const PROCEDURAL_PHASES: ProceduralPhaseInfo[] = [
  {
    id: "needle_positioning",
    label: "Needle Positioning",
    description: "Align instrument approach with entry landmark",
    progressStart: 0,
    progressEnd: 0.15,
  },
  {
    id: "entry_alignment",
    label: "Entry Alignment",
    description: "Establish correct entry angle and tissue contact",
    progressStart: 0.15,
    progressEnd: 0.35,
  },
  {
    id: "stitch_trajectory",
    label: "Curved Stitch Trajectory",
    description: "Execute controlled curved passage along guide path",
    progressStart: 0.35,
    progressEnd: 0.75,
  },
  {
    id: "exit_stabilization",
    label: "Exit Stabilization",
    description: "Complete exit with steady instrument control",
    progressStart: 0.75,
    progressEnd: 1,
  },
];

export function getPhaseForProgress(progress: number): ProceduralPhaseInfo {
  const p = Math.min(0.999, Math.max(0, progress));
  return (
    PROCEDURAL_PHASES.find(
      (phase) => p >= phase.progressStart && p < phase.progressEnd
    ) ?? PROCEDURAL_PHASES[PROCEDURAL_PHASES.length - 1]
  );
}

export function getPhaseLocalProgress(
  progress: number,
  phase: ProceduralPhaseInfo
): number {
  const span = phase.progressEnd - phase.progressStart;
  if (span <= 0) return 0;
  return Math.min(
    1,
    Math.max(0, (progress - phase.progressStart) / span)
  );
}
