import { describe, it, expect, beforeEach } from 'vitest';
import { useProgressStore, PROGRESS_KEY } from '../store/progress';
import { content } from '../data/content';
import { score, buildSubmission } from '../utils/score';
import { levelsById } from '../data/content';
import { buildExportBundle, parseImportBundle, ImportError } from '../utils/transfer';
import type { MarkedAnswer } from '../types';

const tutorial = levelsById.get('tutorial-1')!;
const tutorialVariant = tutorial.variants[0];

const correctMark: MarkedAnswer = {
  passageId: 'tut1-v1-p1',
  scope: 'sentence',
  targetId: 'tut1-v1-p1-s2',
  fallacyId: 'ad-hominem',
  confidence: 'medium',
};

describe('progress store', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    useProgressStore.getState().resetAll();
  });

  it('records a completed result and persists to localStorage', () => {
    const report = score(buildSubmission(tutorial.id, [correctMark], {}), tutorialVariant);
    useProgressStore.getState().recordResult(report, tutorial, content);

    const s = useProgressStore.getState();
    expect(s.completedLevelIds).toContain('tutorial-1');
    expect(s.bestScoreByLevel['tutorial-1']).toBe(100);
    expect(s.attemptsByLevel['tutorial-1']).toBe(1);
    expect(s.fallacyStats['ad-hominem'].correct).toBe(1);

    const stored = JSON.parse(globalThis.localStorage.getItem(PROGRESS_KEY)!);
    expect(stored.completedLevelIds).toContain('tutorial-1');
  });

  it('keeps the best score across attempts and counts attempts', () => {
    const good = score(buildSubmission(tutorial.id, [correctMark], {}), tutorialVariant);
    const bad = score(buildSubmission(tutorial.id, [], {}), tutorialVariant);
    useProgressStore.getState().recordResult(good, tutorial, content);
    useProgressStore.getState().recordResult(bad, tutorial, content);

    const s = useProgressStore.getState();
    expect(s.bestScoreByLevel['tutorial-1']).toBe(100);
    expect(s.attemptsByLevel['tutorial-1']).toBe(2);
  });

  it('awards the first-clear badge', () => {
    const report = score(buildSubmission(tutorial.id, [correctMark], {}), tutorialVariant);
    const newBadges = useProgressStore.getState().recordResult(report, tutorial, content);
    expect(newBadges).toContain('first-clear');
    expect(useProgressStore.getState().badges).toContain('first-clear');
  });

  it('resets all progress', () => {
    const report = score(buildSubmission(tutorial.id, [correctMark], {}), tutorialVariant);
    useProgressStore.getState().recordResult(report, tutorial, content);
    useProgressStore.getState().resetAll();
    expect(useProgressStore.getState().completedLevelIds).toHaveLength(0);
  });
});

describe('transfer (export/import)', () => {
  it('round-trips a bundle', () => {
    const report = score(buildSubmission(tutorial.id, [correctMark], {}), tutorialVariant);
    useProgressStore.getState().resetAll();
    useProgressStore.getState().recordResult(report, tutorial, content);
    const snap = useProgressStore.getState().snapshot();

    const bundle = buildExportBundle(snap, { theme: 'dark' });
    const text = JSON.stringify(bundle);
    const parsed = parseImportBundle(text);

    expect(parsed.progress.completedLevelIds).toContain('tutorial-1');
    expect(parsed.settings.theme).toBe('dark');
  });

  it('fills defaults for a partial bundle', () => {
    const parsed = parseImportBundle(JSON.stringify({ progress: {} }));
    expect(parsed.progress.completedLevelIds).toEqual([]);
    expect(parsed.settings.theme).toBe('system');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseImportBundle('not json')).toThrow(ImportError);
  });

  it('throws when the progress section is missing', () => {
    expect(() => parseImportBundle(JSON.stringify({ settings: {} }))).toThrow(ImportError);
  });
});
