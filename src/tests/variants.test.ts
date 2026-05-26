import { describe, it, expect } from 'vitest';
import { getVariant, chooseVariantId } from '../utils/variants';
import { levelsById, content, levelsForTier } from '../data/content';
import type { Level } from '../types';

const tutorial = levelsById.get('tutorial-1')!;

describe('content structure', () => {
  it('every lesson ships at least 3 variants', () => {
    for (const level of [...levelsById.values()]) {
      expect(level.variants.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('every normal tier has at least 5 lessons; review tiers have exactly 1', () => {
    for (const tier of content.tiers) {
      const lessons = levelsForTier(tier.id);
      if (tier.isReview) {
        expect(lessons.length).toBe(1);
      } else {
        expect(lessons.length).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it('review lessons have >= 3 paragraphs of >= 5 sentences and 0-8 fallacies', () => {
    const reviewTierIds = new Set(content.tiers.filter((t) => t.isReview).map((t) => t.id));
    const reviews = content.levels.filter((l) => reviewTierIds.has(l.tierId));
    expect(reviews.length).toBeGreaterThan(0);
    for (const level of reviews) {
      expect(level.kind).toBe('review');
      for (const variant of level.variants) {
        const paragraphs = variant.passages.flatMap((p) => p.paragraphs);
        expect(paragraphs.length).toBeGreaterThanOrEqual(3);
        for (const para of paragraphs) {
          expect(para.sentences.length).toBeGreaterThan(4);
        }
        expect(variant.expected.length).toBeGreaterThanOrEqual(0);
        expect(variant.expected.length).toBeLessThanOrEqual(8);
      }
    }
  });

  it('never reuses a sentence anywhere across all lessons and variants', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const level of content.levels) {
      for (const variant of level.variants) {
        for (const passage of variant.passages) {
          for (const para of passage.paragraphs) {
            for (const s of para.sentences) {
              const key = s.text.trim();
              if (seen.has(key)) dupes.push(`"${key}" (${variant.id} & ${seen.get(key)})`);
              else seen.set(key, variant.id);
            }
          }
        }
      }
    }
    expect(dupes).toEqual([]);
  });
});

describe('variant selection', () => {

  it('getVariant returns the requested variant', () => {
    const v = getVariant(tutorial, 'tutorial-1-v2');
    expect(v.id).toBe('tutorial-1-v2');
  });

  it('getVariant falls back to the first variant for an unknown id', () => {
    expect(getVariant(tutorial, 'nope').id).toBe(tutorial.variants[0].id);
    expect(getVariant(tutorial, null).id).toBe(tutorial.variants[0].id);
  });

  it('returns the same variant for the same navId (idempotent per navigation)', () => {
    const a = chooseVariantId(tutorial, 100);
    const b = chooseVariantId(tutorial, 100);
    expect(b).toBe(a);
  });

  it('rotates to a different variant on a new navId', () => {
    // Deterministic rng that always picks the first item of the candidate pool.
    const first = () => 0;
    const a = chooseVariantId(tutorial, 200, first);
    const b = chooseVariantId(tutorial, 201, first); // pool excludes `a`
    const c = chooseVariantId(tutorial, 202, first); // pool excludes `b`
    expect(b).not.toBe(a);
    expect(c).not.toBe(b);
  });

  it('returns the only variant when a level has just one', () => {
    const single: Level = {
      ...tutorial,
      id: 'solo-level',
      variants: [tutorial.variants[0]],
    };
    expect(chooseVariantId(single, 1)).toBe(tutorial.variants[0].id);
  });
});
