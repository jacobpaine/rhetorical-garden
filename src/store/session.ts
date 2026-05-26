import { create } from 'zustand';
import type {
  Confidence,
  HintLadder,
  MarkedAnswer,
  TargetScope,
} from '../types';

export interface PickerTarget {
  passageId: string;
  scope: TargetScope;
  targetId: string;
}

interface SessionStore {
  levelId: string | null;
  variantId: string | null;
  marks: MarkedAnswer[];
  hintsUsedByPassage: Record<string, HintLadder>;
  guideOpen: boolean;
  picker: PickerTarget | null;

  startLevel: (levelId: string, variantId: string) => void;
  clearSession: () => void;

  openPicker: (target: PickerTarget) => void;
  closePicker: () => void;

  /** Add or update the mark at a target; default confidence is medium. */
  setMark: (target: PickerTarget, fallacyId: string) => void;
  removeMark: (target: PickerTarget) => void;
  setConfidence: (target: PickerTarget, confidence: Confidence) => void;
  setFallacy: (target: PickerTarget, fallacyId: string) => void;

  /** Advance a passage's hint ladder by one step (capped at 3). */
  useHint: (passageId: string) => void;

  openGuide: () => void;
  closeGuide: () => void;
}

const sameTarget = (a: PickerTarget, m: MarkedAnswer) =>
  a.passageId === m.passageId && a.scope === m.scope && a.targetId === m.targetId;

export const useSessionStore = create<SessionStore>((set) => ({
  levelId: null,
  variantId: null,
  marks: [],
  hintsUsedByPassage: {},
  guideOpen: false,
  picker: null,

  startLevel: (levelId, variantId) =>
    set({
      levelId,
      variantId,
      marks: [],
      hintsUsedByPassage: {},
      guideOpen: false,
      picker: null,
    }),

  clearSession: () =>
    set({
      levelId: null,
      variantId: null,
      marks: [],
      hintsUsedByPassage: {},
      guideOpen: false,
      picker: null,
    }),

  openPicker: (target) => set({ picker: target }),
  closePicker: () => set({ picker: null }),

  setMark: (target, fallacyId) =>
    set((s) => {
      const existing = s.marks.find((m) => sameTarget(target, m));
      if (existing) {
        return {
          marks: s.marks.map((m) =>
            sameTarget(target, m) ? { ...m, fallacyId } : m,
          ),
        };
      }
      const mark: MarkedAnswer = {
        passageId: target.passageId,
        scope: target.scope,
        targetId: target.targetId,
        fallacyId,
        confidence: 'medium',
      };
      return { marks: [...s.marks, mark] };
    }),

  setFallacy: (target, fallacyId) =>
    set((s) => ({
      marks: s.marks.map((m) =>
        sameTarget(target, m) ? { ...m, fallacyId } : m,
      ),
    })),

  removeMark: (target) =>
    set((s) => ({ marks: s.marks.filter((m) => !sameTarget(target, m)) })),

  setConfidence: (target, confidence) =>
    set((s) => ({
      marks: s.marks.map((m) =>
        sameTarget(target, m) ? { ...m, confidence } : m,
      ),
    })),

  useHint: (passageId) =>
    set((s) => {
      const current = s.hintsUsedByPassage[passageId] ?? 0;
      const next = Math.min(3, current + 1) as HintLadder;
      return {
        hintsUsedByPassage: { ...s.hintsUsedByPassage, [passageId]: next },
      };
    }),

  openGuide: () => set({ guideOpen: true }),
  closeGuide: () => set({ guideOpen: false }),
}));
