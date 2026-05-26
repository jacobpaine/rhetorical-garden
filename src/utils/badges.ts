import type { Content, Level, ProgressState, ScoreReport } from '../types';

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
}

export const BADGE_DEFS: Record<string, BadgeDef> = {
  'first-clear': {
    id: 'first-clear',
    name: 'First Clear',
    description: 'Completed your first level.',
  },
  'no-hint-clear': {
    id: 'no-hint-clear',
    name: 'Unassisted',
    description: 'Cleared a level with no hints and a strong score.',
  },
  'accurate-confidence': {
    id: 'accurate-confidence',
    name: 'Well Calibrated',
    description: 'Your confidence matched your accuracy on a level.',
  },
  'review-cleared': {
    id: 'review-cleared',
    name: 'Review Cleared',
    description: 'Passed a review.',
  },
};

const CATEGORY_MASTERY_THRESHOLD = 3;

export function categoryMasteryBadgeId(categoryId: string): string {
  return `mastery-${categoryId}`;
}

/** Ensure a mastery badge def exists for a category (lazy, content-driven). */
export function badgeDefFor(badgeId: string, content: Content): BadgeDef {
  if (BADGE_DEFS[badgeId]) return BADGE_DEFS[badgeId];
  if (badgeId.startsWith('mastery-')) {
    const categoryId = badgeId.slice('mastery-'.length);
    const cat = content.categories.find((c) => c.id === categoryId);
    return {
      id: badgeId,
      name: `${cat?.name ?? categoryId} Mastery`,
      description: `Identified ${CATEGORY_MASTERY_THRESHOLD}+ ${cat?.name ?? categoryId} fallacies correctly.`,
    };
  }
  return { id: badgeId, name: badgeId, description: '' };
}

/**
 * Pure: compute the full set of badge ids the player has earned, given their
 * (already updated) progress state, the latest report/level, and content.
 */
export function computeEarnedBadges(
  progress: ProgressState,
  report: ScoreReport,
  level: Level,
  content: Content,
): string[] {
  const earned = new Set<string>(progress.badges);

  if (progress.completedLevelIds.length >= 1) earned.add('first-clear');

  if (report.hintsUsedTotal === 0 && report.percent >= 75) {
    earned.add('no-hint-clear');
  }

  if (
    report.subscores.confidenceCalibration.label === 'Calibrated' &&
    report.subscores.correctCount > 0
  ) {
    earned.add('accurate-confidence');
  }

  if (level.kind === 'review' && report.percent >= 75) {
    earned.add('review-cleared');
  }

  // Category mastery from cumulative correct counts.
  const correctByCategory = new Map<string, number>();
  for (const [fallacyId, stat] of Object.entries(progress.fallacyStats)) {
    const fallacy = content.fallacies.find((f) => f.id === fallacyId);
    if (!fallacy) continue;
    correctByCategory.set(
      fallacy.categoryId,
      (correctByCategory.get(fallacy.categoryId) ?? 0) + stat.correct,
    );
  }
  for (const [categoryId, correct] of correctByCategory) {
    if (correct >= CATEGORY_MASTERY_THRESHOLD) {
      earned.add(categoryMasteryBadgeId(categoryId));
    }
  }

  return [...earned];
}
