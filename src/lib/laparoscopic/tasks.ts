import type { FlsTaskId, LaparoscopicTaskDefinition } from "./types";

export const LAPAROSCOPIC_TASKS: Record<
  FlsTaskId,
  LaparoscopicTaskDefinition
> = {
  "peg-transfer": {
    id: "peg-transfer",
    name: "Peg Transfer",
    description:
      "Transfer six rings between peg rows using bimanual instrument control.",
    clinicalPurpose:
      "Develops bimanual coordination, instrument stability, and ambidextrous dexterity.",
    configuration: {
      estimatedMinutes: 5,
      requiredHands: "dual",
      primaryInstruments: ["Left grasper", "Right grasper"],
      assessmentTimeLimitSeconds: 300,
    },
    scoring: {
      primaryMetrics: [
        "task completion time",
        "instrument stability",
        "path efficiency",
        "dual-hand coordination",
        "drop count",
      ],
      benchmarkLabels: [
        "FLS pass <300s",
        "0 drops",
        "Economy <165cm",
        "Stability >65",
      ],
    },
    successConditions: [
      "All rings transferred to the target pegs",
      "No dropped rings during handoff",
      "Both instruments remain inside the operative field",
    ],
    analyticsHooks: [
      "pathLengthCm",
      "bimanualSync",
      "idleTimeSeconds",
      "tremorIndex",
      "transferHeightErrors",
    ],
    instructions: [
      "Position both hands in the webcam frame.",
      "Close the dominant grasper on the active ring.",
      "Transfer the ring mid-field to the opposite grasper.",
      "Place the ring on the target peg with minimal excess motion.",
    ],
  },
  "pattern-cutting": {
    id: "pattern-cutting",
    name: "Pattern Cutting",
    description:
      "Cut along a marked circle while maintaining non-dominant traction.",
    clinicalPurpose:
      "Trains controlled dominant-hand cutting while the non-dominant instrument stabilizes tissue.",
    configuration: {
      estimatedMinutes: 6,
      requiredHands: "dual",
      primaryInstruments: ["Grasper", "Scissors"],
    },
    scoring: {
      primaryMetrics: [
        "procedural accuracy",
        "movement smoothness",
        "non-dominant stability",
        "economy of motion",
      ],
      benchmarkLabels: [">95% completion", "Within 2mm", "Smoothness >65"],
    },
    successConditions: [
      "Complete at least 95% of the marked pattern",
      "Maintain deviation within the accuracy threshold",
      "Keep traction stable while cutting",
    ],
    analyticsHooks: [
      "meanDeviationMm",
      "completionPct",
      "nonDominantStability",
      "simultaneousMovement",
      "smoothness",
    ],
    instructions: [
      "Use the non-dominant instrument to hold steady traction.",
      "Advance the cutting instrument along the marked boundary.",
      "Avoid dragging both instruments together.",
      "Prioritize accuracy before speed.",
    ],
  },
  "knot-tying": {
    id: "knot-tying",
    name: "Knot Tying",
    description:
      "Complete a two-throw intracorporeal square-knot sequence inside the laparoscopic field.",
    clinicalPurpose:
      "Builds confined-space instrument alignment, controlled wrapping, and knot security.",
    configuration: {
      estimatedMinutes: 8,
      requiredHands: "dual",
      primaryInstruments: ["Left grasper", "Right driver"],
    },
    scoring: {
      primaryMetrics: [
        "instrument alignment",
        "procedural accuracy",
        "movement smoothness",
        "excess movement",
        "knot security",
      ],
      benchmarkLabels: ["Precision >75", "Security >70", "2 correct throws"],
    },
    successConditions: [
      "Complete two controlled throws",
      "Maintain instrument alignment through tightening",
      "Avoid excessive movement during the wrap sequence",
    ],
    analyticsHooks: [
      "precision",
      "knotSecurity",
      "throws",
      "excessMovement",
      "shaftAlignment",
    ],
    instructions: [
      "Align the driver with the intended wrap path.",
      "Rotate the wrist to form the first throw.",
      "Reverse direction for the second throw.",
      "Tighten symmetrically without over-travel.",
    ],
  },
};

export const LAPAROSCOPIC_TASK_ORDER: FlsTaskId[] = [
  "peg-transfer",
  "pattern-cutting",
  "knot-tying",
];
