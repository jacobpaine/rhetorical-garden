import { create } from 'zustand';
import type {
  Content,
  Level,
  ProgressState,
  ScoreReport,
} from '../types';
import { loadJSON, saveJSON } from '../utils/storage';
import { computeEarnedBadges } from '../utils/badges';

export const PROGRESS_KEY = 'rg.progress.v1';

export const emptyProgress: ProgressState = {
  completedLevelIds: [],
  bestScoreByLevel: {},
  attemptsByLevel: {},
  hintsUsedTotal: 0,
  confidenceStats: { correctHigh: 0, correctTotal: 0, wrongHigh: 0, wrongTotal: 0 },
  fallacyStats: {},
  badges: [],
};

interface ProgressStore extends ProgressState {
  recordResult: (report: ScoreReport, level: Level, content: Content) => string[];
  resetAll: () => void;
  replaceProgress: (p: ProgressState) => void;
  snapshot: () => ProgressState;
}

function snapshotOf(s: ProgressState): ProgressState {
  return {
    completedLevelIds: s.completedLevelIds,
    bestScoreByLevel: s.bestScoreByLevel,
    attemptsByLevel: s.attemptsByLevel,
    hintsUsedTotal: s.hintsUsedTotal,
    confidenceStats: s.confidenceStats,
    fallacyStats: s.fallacyStats,
    badges: s.badges,
  };
}

export const useProgressStore = create<ProgressStore>((set, get) => ({
  ...(loadJSON<ProgressState>(PROGRESS_KEY) ?? emptyProgress),

  snapshot: () => snapshotOf(get()),

  /**
   * Records a completed level result. Returns the list of newly earned badge ids
   * so the UI can celebrate them. Only completed/submitted results are stored.
   */
  recordResult: (report, level, content) => {
    const s = get();

    const completedLevelIds = s.completedLevelIds.includes(level.id)
      ? s.completedLevelIds
      : [...s.completedLevelIds, level.id];

    const prevBest = s.bestScoreByLevel[level.id] ?? -Infinity;
    const bestScoreByLevel = {
      ...s.bestScoreByLevel,
      [level.id]: Math.max(prevBest, report.percent),
    };

    const attemptsByLevel = {
      ...s.attemptsByLevel,
      [level.id]: (s.attemptsByLevel[level.id] ?? 0) + 1,
    };

    const calib = report.subscores.confidenceCalibration;
    const confidenceStats = {
      correctHigh: s.confidenceStats.correctHigh + calib.correctHigh,
      correctTotal: s.confidenceStats.correctTotal + calib.correctTotal,
      wrongHigh: s.confidenceStats.wrongHigh + calib.wrongHigh,
      wrongTotal: s.confidenceStats.wrongTotal + calib.wrongTotal,
    };

    const fallacyStats = { ...s.fallacyStats };
    for (const mr of report.markResults) {
      const id = mr.mark.fallacyId;
      const cur = fallacyStats[id] ?? { correct: 0, wrong: 0 };
      fallacyStats[id] =
        mr.outcome === 'correct'
          ? { correct: cur.correct + 1, wrong: cur.wrong }
          : { correct: cur.correct, wrong: cur.wrong + 1 };
    }

    const partial: ProgressState = {
      completedLevelIds,
      bestScoreByLevel,
      attemptsByLevel,
      hintsUsedTotal: s.hintsUsedTotal + report.hintsUsedTotal,
      confidenceStats,
      fallacyStats,
      badges: s.badges,
    };

    const beforeBadges = new Set(s.badges);
    const badges = computeEarnedBadges(partial, report, level, content);
    const newlyEarned = badges.filter((b) => !beforeBadges.has(b));

    const next: ProgressState = { ...partial, badges };
    set(next);
    saveJSON(PROGRESS_KEY, snapshotOf(next as ProgressState));
    return newlyEarned;
  },

  resetAll: () => {
    set({ ...emptyProgress });
    saveJSON(PROGRESS_KEY, emptyProgress);
  },

  replaceProgress: (p) => {
    set({ ...p });
    saveJSON(PROGRESS_KEY, p);
  },
}));
