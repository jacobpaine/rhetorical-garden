import type { Content, Level } from '../types';

/**
 * Returns the lesson the player should tackle next:
 *  1. The tutorial, if not yet completed.
 *  2. Otherwise the first incomplete lesson, walking normal tiers in index
 *     order and lessons in their authored order. Review tiers are skipped
 *     here — they are always available as bonus checkpoints.
 *  3. If every normal lesson is done, the first incomplete review lesson.
 *  4. `null` once the entire garden is in bloom.
 */
export function nextChallenge(
  content: Content,
  completed: Set<string>,
): Level | null {
  const tutorial = content.levels.find((l) => l.kind === 'tutorial');
  if (tutorial && !completed.has(tutorial.id)) return tutorial;

  const tiers = [...content.tiers].sort((a, b) => a.index - b.index);

  for (const tier of tiers) {
    if (tier.isReview) continue;
    const lessons = content.levels.filter(
      (l) => l.tierId === tier.id && l.kind === 'normal',
    );
    for (const lesson of lessons) {
      if (!completed.has(lesson.id)) return lesson;
    }
  }

  for (const tier of tiers) {
    if (!tier.isReview) continue;
    const lessons = content.levels.filter((l) => l.tierId === tier.id);
    for (const lesson of lessons) {
      if (!completed.has(lesson.id)) return lesson;
    }
  }

  return null;
}
