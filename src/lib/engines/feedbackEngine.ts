import type {
  FeedbackMessage,
  PerformanceScores,
  ProceduralPhaseInfo,
} from "@/lib/types";
import type { PathMetrics } from "./scoringEngine";
import type { StabilityResult } from "./stabilityEngine";
import type { MotionQualityResult } from "./motionQualityEngine";
import { PATH_THRESHOLD_PX } from "@/lib/suturing/stitchPath";

const PATH_THRESHOLD = PATH_THRESHOLD_PX;

let messageCounter = 0;

function msg(
  type: FeedbackMessage["type"],
  text: string,
  category: FeedbackMessage["category"]
): FeedbackMessage {
  return {
    id: `fb-${++messageCounter}-${Date.now()}`,
    type,
    text,
    timestamp: Date.now(),
    category,
  };
}

export interface FeedbackContext {
  path: PathMetrics;
  scores: PerformanceScores;
  stability: StabilityResult;
  motion: MotionQualityResult;
  phase: ProceduralPhaseInfo;
  hasHand: boolean;
  prevPrecision: number;
}

export function generateClinicalFeedback(ctx: FeedbackContext): FeedbackMessage[] {
  if (!ctx.hasHand) {
    return [
      msg(
        "info",
        "Position instrument hand within the camera field of view",
        "phase"
      ),
    ];
  }

  const candidates: FeedbackMessage[] = [];
  const { path, scores, stability, motion, phase } = ctx;

  if (!path.onPath) {
    if (path.lateralOffset > 1.4) {
      candidates.push(
        msg("warning", "Trajectory deviating laterally", "path")
      );
    } else if (path.deviation > PATH_THRESHOLD * 2) {
      candidates.push(
        msg("warning", "Movement deviated from guide path", "path")
      );
    } else {
      candidates.push(
        msg("info", "Adjust trajectory toward the demonstrated guide path", "path")
      );
    }
  } else if (path.progress > 0.85) {
    candidates.push(
      msg(
        "success",
        "Controlled trajectory maintained — approaching procedural completion",
        "path"
      )
    );
  } else if (path.onPath && scores.precision > 78) {
    candidates.push(msg("success", "Needle alignment optimized", "path"));
  } else {
    candidates.push(msg("success", "Correct stitch trajectory", "path"));
  }

  if (stability.unstable) {
    candidates.push(
      msg("warning", "Movement instability detected", "stability")
    );
  } else if (stability.improved) {
    candidates.push(
      msg("success", "Wrist stabilization improved", "stability")
    );
  } else if (scores.stability > 82) {
    candidates.push(msg("success", "Stable control maintained", "stability"));
  } else if (scores.stability < 60) {
    candidates.push(
      msg("warning", "Reduce wrist micro-movements for improved control", "stability")
    );
  }

  if (motion.abruptDirection) {
    candidates.push(
      msg("warning", "Abrupt directional movement detected", "motion")
    );
  } else if (motion.accelerationSpike) {
    candidates.push(
      msg("info", "Reduce procedural speed", "pacing")
    );
  } else if (!motion.speedConsistent && motion.avgSpeed > 0.06) {
    candidates.push(msg("info", "Maintain consistent pacing", "pacing"));
  } else if (motion.smoothnessScore > 80) {
    candidates.push(
      msg("success", "Movement continuity optimized", "motion")
    );
  } else if (motion.smoothnessScore > 65) {
    candidates.push(
      msg("success", "Controlled trajectory maintained", "motion")
    );
  }

  if (scores.precision > ctx.prevPrecision + 5 && ctx.prevPrecision > 0) {
    candidates.push(msg("success", "Precision improving", "path"));
  }

  switch (phase.id) {
    case "needle_positioning":
      candidates.push(
        msg(
          "info",
          "Phase: Needle positioning — establish approach alignment",
          "phase"
        )
      );
      break;
    case "entry_alignment":
      candidates.push(
        msg("info", "Phase: Entry alignment — verify entry trajectory", "phase")
      );
      break;
    case "stitch_trajectory":
      if (path.progress > 0.35 && path.progress < 0.75) {
        candidates.push(
          msg(
            "info",
            "Phase: Curved trajectory — maintain uniform passage speed",
            "phase"
          )
        );
      }
      break;
    case "exit_stabilization":
      candidates.push(
        msg(
          "info",
          "Phase: Exit stabilization — control instrument through exit",
          "phase"
        )
      );
      break;
  }

  const priority: Record<string, number> = {
    warning: 0,
    error: 0,
    info: 1,
    success: 2,
  };

  const seen = new Set<string>();
  return candidates
    .sort((a, b) => priority[a.type] - priority[b.type])
    .filter((m) => {
      if (seen.has(m.text)) return false;
      seen.add(m.text);
      return true;
    })
    .slice(0, 3);
}
