import type { Content, Tier } from '../types';

export const LEVELS_TO_UNLOCK_NEXT_TIER = 2;

function completedInTier(
  tierId: string,
  completedSet: Set<string>,
  content: Content,
): number {
  return content.levels.filter(
    (l) => l.tierId === tierId && l.kind !== 'tutorial' && completedSet.has(l.id),
  ).length;
}

/**
 * Returns the set of unlocked tier ids given completed levels.
 *
 * - Review tiers are never locked.
 * - The first normal tier is always unlocked.
 * - Each subsequent normal tier unlocks once the previous *normal* tier is
 *   unlocked and has at least LEVELS_TO_UNLOCK_NEXT_TIER completed lessons.
 *   Review tiers are skipped when chaining (they are bonus checkpoints).
 */
export function unlockedTierIds(
  completedLevelIds: string[],
  content: Content,
): Set<string> {
  const completed = new Set(completedLevelIds);
  const tiers = [...content.tiers].sort((a, b) => a.index - b.index);
  const unlocked = new Set<string>();

  let prevNormalId: string | null = null;
  for (const tier of tiers) {
    if (tier.isReview) {
      unlocked.add(tier.id);
      continue;
    }
    if (prevNormalId === null) {
      unlocked.add(tier.id);
    } else if (
      unlocked.has(prevNormalId) &&
      completedInTier(prevNormalId, completed, content) >= LEVELS_TO_UNLOCK_NEXT_TIER
    ) {
      unlocked.add(tier.id);
    }
    prevNormalId = tier.id;
  }
  return unlocked;
}

export function isTierUnlocked(
  tier: Tier,
  completedLevelIds: string[],
  content: Content,
): boolean {
  return unlockedTierIds(completedLevelIds, content).has(tier.id);
}

/** The previous normal (non-review) tier before the given tier, if any. */
function previousNormalTier(tier: Tier, content: Content): Tier | undefined {
  const earlier = content.tiers
    .filter((t) => !t.isReview && t.index < tier.index)
    .sort((a, b) => b.index - a.index);
  return earlier[0];
}

export function nextTierRequirementText(tier: Tier, content: Content): string {
  if (tier.isReview) return '';
  const prev = previousNormalTier(tier, content);
  if (!prev) return '';
  return `Finish ${LEVELS_TO_UNLOCK_NEXT_TIER} ${prev.name} lessons to unlock.`;
}
