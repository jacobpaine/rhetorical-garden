import type {
  CalibrationSummary,
  Confidence,
  ExpectedAnswer,
  HintLadder,
  MarkResult,
  MarkedAnswer,
  MissedAnswer,
  Passage,
  RankLabel,
  Scorable,
  ScoreReport,
  Submission,
  TargetScope,
} from '../types';
import { canonicalizeTarget } from './targets';

// ---- Tunable scoring constants (intentionally not shown to the player) ----

export const POINTS = {
  correct: 10,
  partial: 3,
  falsePositive: -6,
} as const;

export const CONFIDENCE_MULTIPLIER: Record<
  Confidence,
  { correct: number; partial: number; falsePositive: number }
> = {
  low: { correct: 0.7, partial: 0.7, falsePositive: 0.5 },
  medium: { correct: 1.0, partial: 1.0, falsePositive: 1.0 },
  high: { correct: 1.3, partial: 1.0, falsePositive: 1.5 },
};

export const HINT_STEP_PENALTY: Record<1 | 2 | 3, number> = {
  1: 2,
  2: 3,
  3: 5,
};

function targetKeyFor(
  passagesById: Map<string, Passage>,
  m: { passageId: string; scope: TargetScope; targetId: string },
): string {
  const passage = passagesById.get(m.passageId);
  const c = passage
    ? canonicalizeTarget(passage, m.scope, m.targetId)
    : { scope: m.scope, targetId: m.targetId };
  return `${m.passageId}|${c.scope}|${c.targetId}`;
}

function roundHalf(n: number): number {
  return Math.round(n * 100) / 100;
}

export function rankFor(percent: number): RankLabel {
  if (percent >= 90) return 'Excellent';
  if (percent >= 75) return 'Good';
  if (percent >= 50) return 'Needs Review';
  return 'Try Again';
}

export function hintsPenaltyFor(
  hintsUsedByPassage: Record<string, HintLadder>,
): { penalty: number; total: number } {
  let penalty = 0;
  let total = 0;
  for (const ladder of Object.values(hintsUsedByPassage)) {
    for (let step = 1 as 1 | 2 | 3; step <= ladder; step++) {
      penalty += HINT_STEP_PENALTY[step as 1 | 2 | 3];
      total += 1;
    }
  }
  return { penalty, total };
}

function calibrationLabel(s: {
  correctHigh: number;
  correctTotal: number;
  wrongHigh: number;
  wrongTotal: number;
}): CalibrationSummary['label'] {
  if (s.correctTotal === 0 && s.wrongTotal === 0) return 'n/a';
  const overconfident = s.wrongTotal > 0 && s.wrongHigh / s.wrongTotal >= 0.5;
  const wellPlaced = s.correctTotal > 0 && s.correctHigh / s.correctTotal >= 0.5;
  const tooCautious = s.correctTotal > 0 && s.correctHigh / s.correctTotal === 0;

  if (overconfident && !wellPlaced) return 'Overconfident';
  if (overconfident) return 'Mixed';
  if (tooCautious) return 'Cautious';
  return 'Calibrated';
}

/**
 * Pure scoring function. Given a submission and the played variant's answer
 * key, returns a full report. No React, no I/O. See SPEC.md §5 for the model.
 */
export function score(submission: Submission, scorable: Scorable): ScoreReport {
  const passagesById = new Map(scorable.passages.map((p) => [p.id, p]));

  const expectedByKey = new Map<string, ExpectedAnswer>();
  for (const exp of scorable.expected) {
    expectedByKey.set(targetKeyFor(passagesById, exp), exp);
  }

  const markedKeys = new Set<string>();
  const markResults: MarkResult[] = [];

  let rawFromMarks = 0;
  let correctCount = 0;
  let falsePositives = 0;

  const calib = { correctHigh: 0, correctTotal: 0, wrongHigh: 0, wrongTotal: 0 };

  for (const mark of submission.marks) {
    const key = targetKeyFor(passagesById, mark);
    markedKeys.add(key);
    const mult = CONFIDENCE_MULTIPLIER[mark.confidence];
    const exp = expectedByKey.get(key);

    if (exp) {
      if (exp.fallacyId === mark.fallacyId) {
        const points = roundHalf(POINTS.correct * mult.correct);
        rawFromMarks += points;
        correctCount += 1;
        calib.correctTotal += 1;
        if (mark.confidence === 'high') calib.correctHigh += 1;
        markResults.push({
          mark,
          outcome: 'correct',
          points,
          expectedFallacyId: exp.fallacyId,
          rationale: exp.rationale,
        });
      } else {
        const points = roundHalf(POINTS.partial * mult.partial);
        rawFromMarks += points;
        calib.wrongTotal += 1;
        if (mark.confidence === 'high') calib.wrongHigh += 1;
        markResults.push({
          mark,
          outcome: 'partial',
          points,
          expectedFallacyId: exp.fallacyId,
          rationale: exp.rationale,
        });
      }
    } else {
      const points = roundHalf(POINTS.falsePositive * mult.falsePositive);
      rawFromMarks += points;
      falsePositives += 1;
      calib.wrongTotal += 1;
      if (mark.confidence === 'high') calib.wrongHigh += 1;
      markResults.push({ mark, outcome: 'false-positive', points });
    }
  }

  const missed: MissedAnswer[] = scorable.expected
    .filter((exp) => !markedKeys.has(targetKeyFor(passagesById, exp)))
    .map((exp) => ({ expected: exp }));

  const { penalty: hintsPenalty, total: hintsUsedTotal } = hintsPenaltyFor(
    submission.hintsUsedByPassage,
  );

  const maxScore = Math.max(scorable.expected.length * POINTS.correct, POINTS.correct);
  // No-fallacy levels start at full credit: marking nothing scores 100%, while
  // each false positive (and any hint) chips away from the baseline.
  const baseline = scorable.expected.length === 0 ? maxScore : 0;
  const rawScore = roundHalf(baseline + rawFromMarks - hintsPenalty);
  const percent = Math.round(
    Math.min(1, Math.max(0, rawScore / maxScore)) * 100,
  );

  return {
    levelId: submission.levelId,
    rawScore,
    maxScore,
    percent,
    rank: rankFor(percent),
    markResults,
    missed,
    hintsPenalty,
    hintsUsedTotal,
    subscores: {
      correctCount,
      expectedCount: scorable.expected.length,
      falsePositives,
      confidenceCalibration: { ...calib, label: calibrationLabel(calib) },
    },
  };
}

/** Convenience: build a Submission directly from session-shaped data. */
export function buildSubmission(
  levelId: string,
  marks: MarkedAnswer[],
  hintsUsedByPassage: Record<string, HintLadder>,
): Submission {
  return { levelId, marks, hintsUsedByPassage };
}
