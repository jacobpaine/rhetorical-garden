import { describe, it, expect } from 'vitest';
import { unlockedTierIds, isTierUnlocked } from '../utils/progression';
import type { Content } from '../types';

const content = {
  schemaVersion: 1,
  categories: [],
  fallacies: [],
  tiers: [
    { id: 'tier-1', index: 1, name: 'Tier 1', description: '' },
    { id: 'tier-2', index: 2, name: 'Tier 2', description: '' },
    { id: 'tier-3', index: 3, name: 'Review I', description: '', isReview: true },
    { id: 'tier-4', index: 4, name: 'Tier 4', description: '' },
    { id: 'tier-7', index: 5, name: 'Final Review', description: '', isReview: true },
  ],
  levels: [
    { id: 't1a', tierId: 'tier-1', kind: 'normal' },
    { id: 't1b', tierId: 'tier-1', kind: 'normal' },
    { id: 't1c', tierId: 'tier-1', kind: 'normal' },
    { id: 'tut', tierId: 'tier-1', kind: 'tutorial' },
    { id: 't2a', tierId: 'tier-2', kind: 'normal' },
    { id: 't2b', tierId: 'tier-2', kind: 'normal' },
    { id: 'rev', tierId: 'tier-3', kind: 'review' },
    { id: 't4a', tierId: 'tier-4', kind: 'normal' },
  ],
} as unknown as Content;

describe('tier unlocking', () => {
  it('always unlocks tier 1 and every review tier', () => {
    const u = unlockedTierIds([], content);
    expect(u.has('tier-1')).toBe(true);
    expect(u.has('tier-3')).toBe(true); // review — never locked
    expect(u.has('tier-7')).toBe(true); // review — never locked
    expect(u.has('tier-2')).toBe(false);
  });

  it('does not count the tutorial toward unlocking the next tier', () => {
    expect(unlockedTierIds(['tut', 't1a'], content).has('tier-2')).toBe(false);
  });

  it('unlocks tier 2 after two tier-1 lessons', () => {
    const u = unlockedTierIds(['t1a', 't1b'], content);
    expect(u.has('tier-2')).toBe(true);
    expect(u.has('tier-4')).toBe(false);
  });

  it('chains the normal tier after a review tier to the previous normal tier', () => {
    // tier-4 follows the review tier-3, but is gated by tier-2 (the previous normal tier).
    const u = unlockedTierIds(['t1a', 't1b', 't2a', 't2b'], content);
    expect(u.has('tier-4')).toBe(true);
  });

  it('keeps a later normal tier locked until its previous normal tier is cleared', () => {
    const u = unlockedTierIds(['t1a', 't1b', 't2a'], content);
    expect(u.has('tier-4')).toBe(false);
  });

  it('isTierUnlocked matches the set', () => {
    const tier2 = content.tiers[1];
    expect(isTierUnlocked(tier2, ['t1a', 't1b'], content)).toBe(true);
    expect(isTierUnlocked(tier2, ['t1a'], content)).toBe(false);
  });
});
