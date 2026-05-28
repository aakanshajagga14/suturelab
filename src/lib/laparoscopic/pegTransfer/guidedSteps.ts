export interface PegGuidedStep {
  id: number;
  title: string;
  instruction: string;
}

export const PEG_GUIDED_STEPS: PegGuidedStep[] = [
  {
    id: 0,
    title: "Right Instrument Approach",
    instruction:
      "Move your right instrument (dominant hand) toward Ring 1 on the leftmost peg. Approach from above in a direct arc — avoid unnecessary repositioning.",
  },
  {
    id: 1,
    title: "Grasp",
    instruction:
      "Close your right instrument by bringing your thumb and index finger together. The ring will highlight teal when grasped.",
  },
  {
    id: 2,
    title: "Lift and Approach Centre",
    instruction:
      "Lift the ring clear of the peg and move toward the centre of the viewport. Keep the ring above the midline — low transfers risk instrument collision.",
  },
  {
    id: 3,
    title: "Mid-Air Transfer",
    instruction:
      "Bring your left instrument to meet the right at centre. Open your right instrument and simultaneously close your left to receive the ring. The exchange must occur in the air.",
  },
  {
    id: 4,
    title: "Move to Target Peg",
    instruction:
      "With the ring held in your left instrument, move toward the target peg on the right side. Maintain height to avoid dragging the ring.",
  },
  {
    id: 5,
    title: "Place and Release",
    instruction:
      "Lower the ring onto the target peg and open your left instrument to release. Ensure the ring is fully seated before releasing.",
  },
];

export const PEG_DEMO_NARRATION: string[] = PEG_GUIDED_STEPS.map(
  (s) => `Demonstration — ${s.title}: ${s.instruction}`
);
