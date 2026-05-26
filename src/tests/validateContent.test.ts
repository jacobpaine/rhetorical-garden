import { describe, it, expect } from 'vitest';
import {
  validateContent,
  ContentValidationError,
  wholePassageTargetId,
} from '../utils/validateContent';
import { content } from '../data/content';
import type { Content } from '../types';

function baseContent(): Content {
  return {
    schemaVersion: 1,
    categories: [{ id: 'cat-a', name: 'Cat A', description: '' }],
    fallacies: [
      {
        id: 'f-a',
        formalName: 'F A',
        plainName: 'f a',
        categoryId: 'cat-a',
        tier: 1,
        definition: '',
        example: '',
        lookFor: [],
        commonConfusions: [],
      },
    ],
    tiers: [{ id: 'tier-1', index: 1, name: 'Tier 1', description: '' }],
    levels: [
      {
        id: 'lvl-1',
        title: 'L1',
        tierId: 'tier-1',
        kind: 'normal',
        showFallacyCount: true,
        tags: [],
        variants: [
          {
            id: 'lvl-1-v1',
            passages: [
              {
                id: 'pa',
                paragraphs: [{ id: 'pa-para', sentences: [{ id: 'pa-s1', text: 'x' }] }],
              },
            ],
            expected: [
              {
                passageId: 'pa',
                scope: 'sentence',
                targetId: 'pa-s1',
                fallacyId: 'f-a',
                rationale: 'r',
              },
            ],
            hints: [],
          },
        ],
      },
    ],
  };
}

describe('validateContent', () => {
  it('accepts the shipped content', () => {
    expect(() => validateContent(content)).not.toThrow();
  });

  it('accepts a well-formed minimal content object', () => {
    expect(() => validateContent(baseContent())).not.toThrow();
  });

  it('rejects an unknown fallacy reference in an expected answer', () => {
    const c = baseContent();
    c.levels[0].variants[0].expected[0].fallacyId = 'does-not-exist';
    expect(() => validateContent(c)).toThrow(ContentValidationError);
  });

  it('rejects an expected answer pointing at a non-existent target', () => {
    const c = baseContent();
    c.levels[0].variants[0].expected[0].targetId = 'nope';
    expect(() => validateContent(c)).toThrow(ContentValidationError);
  });

  it('rejects a fallacy with an unknown category', () => {
    const c = baseContent();
    c.fallacies[0].categoryId = 'ghost';
    expect(() => validateContent(c)).toThrow(/unknown categoryId/);
  });

  it('rejects expectedNoFallacies levels that still have expected answers', () => {
    const c = baseContent();
    c.levels[0].expectedNoFallacies = true;
    expect(() => validateContent(c)).toThrow(/expectedNoFallacies/);
  });

  it('rejects a level with no variants', () => {
    const c = baseContent();
    c.levels[0].variants = [];
    expect(() => validateContent(c)).toThrow(/no variants/);
  });

  it('rejects an expected fallacy introduced above the level tier', () => {
    const c = baseContent();
    // f-a becomes a tier-2 fallacy, but the level is tier 1.
    c.fallacies[0].tier = 2;
    expect(() => validateContent(c)).toThrow(/not be selectable/);
  });

  it('accepts a whole-passage target using the id convention', () => {
    const c = baseContent();
    c.levels[0].variants[0].expected[0] = {
      passageId: 'pa',
      scope: 'whole-passage',
      targetId: wholePassageTargetId('pa'),
      fallacyId: 'f-a',
      rationale: 'r',
    };
    expect(() => validateContent(c)).not.toThrow();
  });

  it('reports duplicate ids', () => {
    const c = baseContent();
    c.fallacies.push({ ...c.fallacies[0] });
    expect(() => validateContent(c)).toThrow(/Duplicate fallacy/);
  });
});
