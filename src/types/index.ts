// Domain types for The Rhetorical Garden.
// IDs are stable, readable kebab-case strings.

export type TargetScope = 'sentence' | 'paragraph' | 'whole-passage';
export type Confidence = 'low' | 'medium' | 'high';
export type LevelKind = 'tutorial' | 'normal' | 'review';

export interface FallacyCategory {
  id: string;
  name: string;
  description: string;
}

export interface Fallacy {
  id: string;
  formalName: string;
  plainName: string;
  categoryId: string;
  /** Tier index (1-based) at which this fallacy becomes selectable. Lower tiers
   *  expose fewer fallacies; later tiers add new ones on top of the old. */
  tier: number;
  definition: string;
  example: string;
  lookFor: string[];
  commonConfusions: string[];
}

export interface Sentence {
  id: string;
  text: string;
}

export interface Paragraph {
  id: string;
  sentences: Sentence[];
}

export interface Passage {
  id: string;
  title?: string;
  paragraphs: Paragraph[];
}

export interface ExpectedAnswer {
  passageId: string;
  scope: TargetScope;
  targetId: string;
  fallacyId: string;
  rationale: string;
}

export type HintKind = 'category' | 'location' | 'label';

export interface Hint {
  passageId: string;
  step: 1 | 2 | 3;
  kind: HintKind;
  text: string;
}

export interface LevelIntro {
  description: string;
  themes: string[];
}

/**
 * A self-contained, playable version of a level. Each lesson ships several
 * variants of similar difficulty; one is chosen at random per play so replays
 * stay fresh. A variant owns its own passages, answer key, and hints.
 */
export interface LevelVariant {
  id: string;
  passages: Passage[];
  expected: ExpectedAnswer[];
  hints: Hint[];
}

export interface Level {
  id: string;
  title: string;
  tierId: string;
  kind: LevelKind;
  showFallacyCount: boolean;
  expectedNoFallacies?: boolean;
  tags: string[];
  variants: LevelVariant[];
  intro?: LevelIntro;
}

/** The minimal shape the scorer needs — satisfied by a LevelVariant. */
export interface Scorable {
  passages: Passage[];
  expected: ExpectedAnswer[];
}

export interface Tier {
  id: string;
  index: number;
  name: string;
  description: string;
  /** Review tiers hold a single review lesson and are never locked. */
  isReview?: boolean;
}

export interface Content {
  schemaVersion: number;
  categories: FallacyCategory[];
  fallacies: Fallacy[];
  tiers: Tier[];
  levels: Level[];
}

// ---- Gameplay / scoring shapes ----

export interface MarkedAnswer {
  passageId: string;
  scope: TargetScope;
  targetId: string;
  fallacyId: string;
  confidence: Confidence;
}

export type HintLadder = 0 | 1 | 2 | 3;

export interface Submission {
  levelId: string;
  marks: MarkedAnswer[];
  hintsUsedByPassage: Record<string, HintLadder>;
}

export type MarkOutcome = 'correct' | 'partial' | 'false-positive';

export interface MarkResult {
  mark: MarkedAnswer;
  outcome: MarkOutcome;
  points: number;
  expectedFallacyId?: string;
  rationale?: string;
}

export interface MissedAnswer {
  expected: ExpectedAnswer;
}

export type RankLabel = 'Excellent' | 'Good' | 'Needs Review' | 'Try Again';

export interface ScoreReport {
  levelId: string;
  rawScore: number;
  maxScore: number;
  percent: number;
  rank: RankLabel;
  markResults: MarkResult[];
  missed: MissedAnswer[];
  hintsPenalty: number;
  hintsUsedTotal: number;
  subscores: {
    correctCount: number;
    expectedCount: number;
    falsePositives: number;
    confidenceCalibration: CalibrationSummary;
  };
}

export interface CalibrationSummary {
  correctHigh: number;
  correctTotal: number;
  wrongHigh: number;
  wrongTotal: number;
  label: 'Calibrated' | 'Overconfident' | 'Cautious' | 'Mixed' | 'n/a';
}

// ---- Persistence shapes ----

export interface ConfidenceStats {
  correctHigh: number;
  correctTotal: number;
  wrongHigh: number;
  wrongTotal: number;
}

export interface FallacyStat {
  correct: number;
  wrong: number;
}

export interface ProgressState {
  completedLevelIds: string[];
  bestScoreByLevel: Record<string, number>;
  attemptsByLevel: Record<string, number>;
  hintsUsedTotal: number;
  confidenceStats: ConfidenceStats;
  fallacyStats: Record<string, FallacyStat>;
  badges: string[];
}

export type Theme = 'system' | 'light' | 'dark';

export interface SettingsState {
  theme: Theme;
}

export interface ExportBundle {
  version: number;
  exportedAt: string;
  progress: ProgressState;
  settings: SettingsState;
}
