import { create } from 'zustand';
import type { ScoreReport } from '../types';

// Holds the most recent score report so the Results page can render it after
// the session is cleared. In-memory only; not persisted.
interface ResultStore {
  lastReport: ScoreReport | null;
  newBadges: string[];
  setResult: (report: ScoreReport, newBadges: string[]) => void;
  clear: () => void;
}

export const useResultStore = create<ResultStore>((set) => ({
  lastReport: null,
  newBadges: [],
  setResult: (report, newBadges) => set({ lastReport: report, newBadges }),
  clear: () => set({ lastReport: null, newBadges: [] }),
}));
