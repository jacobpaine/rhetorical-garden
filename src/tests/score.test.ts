import { describe, it, expect } from 'vitest';
import { score, buildSubmission, rankFor, hintsPenaltyFor } from '../utils/score';
import type { Scorable, MarkedAnswer } from '../types';

const LEVEL_ID = 'test-level';

// score() takes a Scorable (a variant's passages + expected); these helpers
// build one with two sentences in a single paragraph.
function makeLevel(expectedNo = false): Scorable {
  return {
    passages: [
      {
        id: 'p1',
        paragraphs: [
          {
            id: 'p1-para1',
            sentences: [
              { id: 'p1-s1', text: 'Sentence one.' },
              { id: 'p1-s2', text: 'Sentence two.' },
            ],
          },
        ],
      },
    ],
    expected: expectedNo
      ? []
      : [
          {
            passageId: 'p1',
            scope: 'sentence',
            targetId: 'p1-s1',
            fallacyId: 'ad-hominem',
            rationale: 'because',
          },
        ],
  };
}

const mark = (over: Partial<MarkedAnswer> = {}): MarkedAnswer => ({
  passageId: 'p1',
  scope: 'sentence',
  targetId: 'p1-s1',
  fallacyId: 'ad-hominem',
  confidence: 'medium',
  ...over,
});

describe('rankFor', () => {
  it('maps percentages to neutral labels', () => {
    expect(rankFor(95)).toBe('Excellent');
    expect(rankFor(80)).toBe('Good');
    expect(rankFor(60)).toBe('Needs Review');
    expect(rankFor(10)).toBe('Try Again');
  });
});

describe('hintsPenaltyFor', () => {
  it('accumulates ladder steps per passage', () => {
    expect(hintsPenaltyFor({ p1: 0 })).toEqual({ penalty: 0, total: 0 });
    expect(hintsPenaltyFor({ p1: 1 })).toEqual({ penalty: 2, total: 1 });
    expect(hintsPenaltyFor({ p1: 3 })).toEqual({ penalty: 10, total: 3 });
    expect(hintsPenaltyFor({ p1: 2, p2: 1 })).toEqual({ penalty: 7, total: 3 });
  });
});

describe('score', () => {
  it('gives full credit for correct target + correct fallacy', () => {
    const level = makeLevel();
    const r = score(buildSubmission(LEVEL_ID, [mark()], {}), level);
    expect(r.rawScore).toBe(10);
    expect(r.percent).toBe(100);
    expect(r.rank).toBe('Excellent');
    expect(r.subscores.correctCount).toBe(1);
    expect(r.subscores.falsePositives).toBe(0);
  });

  it('applies high-confidence bonus to a correct mark', () => {
    const level = makeLevel();
    const r = score(buildSubmission(LEVEL_ID, [mark({ confidence: 'high' })], {}), level);
    // 10 * 1.3 = 13, clamped to 100% against a max of 10
    expect(r.rawScore).toBe(13);
    expect(r.percent).toBe(100);
  });

  it('gives partial credit for correct target + wrong fallacy', () => {
    const level = makeLevel();
    const r = score(
      buildSubmission(LEVEL_ID, [mark({ fallacyId: 'straw-man' })], {}),
      level,
    );
    expect(r.rawScore).toBe(3);
    expect(r.percent).toBe(30);
    expect(r.markResults[0].outcome).toBe('partial');
    expect(r.markResults[0].expectedFallacyId).toBe('ad-hominem');
  });

  it('penalizes false positives and clamps at zero', () => {
    const level = makeLevel();
    const r = score(
      buildSubmission(LEVEL_ID, [mark({ targetId: 'p1-s2' })], {}),
      level,
    );
    expect(r.rawScore).toBe(-6);
    expect(r.percent).toBe(0);
    expect(r.subscores.falsePositives).toBe(1);
    expect(r.missed).toHaveLength(1);
  });

  it('hits false positives harder at high confidence', () => {
    const level = makeLevel();
    const r = score(
      buildSubmission(LEVEL_ID, [mark({ targetId: 'p1-s2', confidence: 'high' })], {}),
      level,
    );
    // -6 * 1.5 = -9
    expect(r.rawScore).toBe(-9);
  });

  it('subtracts hint penalties from the raw score', () => {
    const level = makeLevel();
    const r = score(buildSubmission(LEVEL_ID, [mark()], { p1: 1 }), level);
    expect(r.hintsPenalty).toBe(2);
    expect(r.rawScore).toBe(8);
    expect(r.percent).toBe(80);
    expect(r.hintsUsedTotal).toBe(1);
  });

  it('marks a missed expected answer', () => {
    const level = makeLevel();
    const r = score(buildSubmission(LEVEL_ID, [], {}), level);
    expect(r.percent).toBe(0);
    expect(r.missed).toHaveLength(1);
  });

  it('awards 100% on a no-fallacy level when nothing is marked', () => {
    const level = makeLevel(true);
    const r = score(buildSubmission(LEVEL_ID, [], {}), level);
    expect(r.percent).toBe(100);
    expect(r.rank).toBe('Excellent');
    expect(r.subscores.falsePositives).toBe(0);
  });

  it('penalizes any mark on a no-fallacy level', () => {
    const level = makeLevel(true);
    const r = score(buildSubmission(LEVEL_ID, [mark({ targetId: 'p1-s2' })], {}), level);
    // baseline 10 - 6 = 4 -> 40%
    expect(r.rawScore).toBe(4);
    expect(r.percent).toBe(40);
    expect(r.subscores.falsePositives).toBe(1);
  });

  it('treats a paragraph mark as a whole-passage mark on a single-paragraph passage', () => {
    const level = makeLevel();
    // Expected answer is whole-passage; player marks the single paragraph.
    level.expected = [
      {
        passageId: 'p1',
        scope: 'whole-passage',
        targetId: 'p1::whole',
        fallacyId: 'ad-hominem',
        rationale: 'because',
      },
    ];
    const r = score(
      buildSubmission(
        LEVEL_ID,
        [mark({ scope: 'paragraph', targetId: 'p1-para1' })],
        {},
      ),
      level,
    );
    expect(r.markResults[0].outcome).toBe('correct');
    expect(r.percent).toBe(100);
    expect(r.missed).toHaveLength(0);
  });

  it('treats a whole-passage mark as a paragraph mark on a single-paragraph passage', () => {
    const level = makeLevel();
    level.expected = [
      {
        passageId: 'p1',
        scope: 'paragraph',
        targetId: 'p1-para1',
        fallacyId: 'ad-hominem',
        rationale: 'because',
      },
    ];
    const r = score(
      buildSubmission(
        LEVEL_ID,
        [mark({ scope: 'whole-passage', targetId: 'p1::whole' })],
        {},
      ),
      level,
    );
    expect(r.markResults[0].outcome).toBe('correct');
    expect(r.percent).toBe(100);
  });

  it('labels overconfident wrong answers in calibration', () => {
    const level = makeLevel();
    const r = score(
      buildSubmission(LEVEL_ID, [mark({ targetId: 'p1-s2', confidence: 'high' })], {}),
      level,
    );
    expect(r.subscores.confidenceCalibration.label).toBe('Overconfident');
  });
});
