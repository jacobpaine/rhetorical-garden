import { describe, it, expect } from 'vitest';
import { nextChallenge } from '../utils/nextChallenge';
import { content, levelsForTier } from '../data/content';

function firstTierLessonId(tierId: string): string {
  return levelsForTier(tierId)[0].id;
}

describe('nextChallenge', () => {
  it('returns the tutorial when it has not been completed', () => {
    const next = nextChallenge(content, new Set());
    expect(next?.kind).toBe('tutorial');
  });

  it('moves on to tier-1 lesson 1 once the tutorial is done', () => {
    const next = nextChallenge(content, new Set(['tutorial-1']));
    expect(next?.id).toBe(firstTierLessonId('tier-1'));
  });

  it('walks lessons in authored order within a tier before moving on', () => {
    const t1 = levelsForTier('tier-1');
    const completed = new Set(['tutorial-1', t1[0].id, t1[1].id]);
    expect(nextChallenge(content, completed)?.id).toBe(t1[2].id);
  });

  it('skips review tiers when picking the next normal challenge', () => {
    const done = new Set<string>(['tutorial-1']);
    for (const lvl of levelsForTier('tier-1')) done.add(lvl.id);
    expect(nextChallenge(content, done)?.tierId).toBe('tier-2');
  });

  it('falls back to the first unfinished review once all normal lessons are done', () => {
    const done = new Set<string>(['tutorial-1']);
    for (const tier of content.tiers) {
      if (tier.isReview) continue;
      for (const lvl of levelsForTier(tier.id)) done.add(lvl.id);
    }
    const next = nextChallenge(content, done);
    expect(next?.tierId === 'tier-3' || next?.tierId === 'tier-7').toBe(true);
  });

  it('returns null when the entire garden is in bloom', () => {
    const done = new Set(content.levels.map((l) => l.id));
    expect(nextChallenge(content, done)).toBeNull();
  });
});
