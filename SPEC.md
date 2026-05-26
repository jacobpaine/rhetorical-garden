# The Rhetorical Garden — SPEC

## 1. Product Summary

**The Rhetorical Garden** is a single-player static web app that trains adults to identify fallacies and broader reasoning problems in short passages. The user picks a target (sentence / paragraph / whole passage), assigns a fallacy label, reviews answers, sets confidence per marked fallacy, submits, and gets a score with layered feedback.

The taxonomy is hybrid: each entry has a formal name (`Ad Hominem`), a plain-English label (`Attacking the Person`), and a category (`Personal Attack`). The user-facing word is always **fallacy**, even though the taxonomy also covers framing, bias, emotional manipulation, loaded language, propaganda techniques, and weak/missing evidence.

**Constraints**

- Adult, minimal, clean game UI.
- Not childish; not detective/noir; not courseware.
- Static front-end. No accounts, no backend.
- Browser back/forward should work for major screens.

## 2. Tech Stack

| Concern        | Choice                                                   |
| -------------- | -------------------------------------------------------- |
| Build / dev    | Vite                                                     |
| Language       | TypeScript (strict)                                      |
| UI             | React 18                                                 |
| Styling        | Tailwind CSS                                             |
| State          | Zustand (with localStorage persistence)                  |
| Unit tests     | Vitest + React Testing Library                           |
| E2E smoke      | Playwright                                               |
| Package mgr    | pnpm                                                     |
| Routing        | Tiny in-house history router (no `react-router` dep)     |
| Content        | Static JSON + runtime validator (no Zod)                 |
| CI             | GitHub Actions (build check only)                        |
| Deploy target  | S3 + CloudFront (manual)                                 |

No additional dependencies are added without asking.

## 3. Architecture

```
[ index.html ]
      │
      ▼
[ React root ─ AppShell ]
      │            │
      │            ├── Header / Nav
      │            └── Route outlet
      │
      ├── Router (history-aware, hash-free)
      ├── Stores (Zustand: progress, settings, session)
      └── Content layer
            ├── data/*.json
            ├── content/validate.ts
            └── content/loader.ts
```

Pure logic — scoring, validation, persistence — lives in `src/utils/` and `src/store/`, never inside React components.

### Source layout

```
src/
  components/    # Presentational + small interactive UI
  data/          # Static JSON (fallacies, tiers, levels)
  pages/         # Route-level views (Home, Play, Guide, …)
  router/        # History router + Link
  store/         # Zustand stores + persistence
  styles/        # global CSS / tailwind entry
  types/         # Domain types
  utils/         # Pure logic (scoring, validation, …)
  tests/         # Unit tests (some colocated)
e2e/             # Playwright smoke tests
```

## 4. Data Model

All IDs are stable, readable, kebab-case (e.g. `ad-hominem`, `tier-1`, `tutorial-1`).

### 4.1 Fallacy categories

```ts
type FallacyCategory = {
  id: string;            // 'personal-attack'
  name: string;          // 'Personal Attack'
  description: string;   // short paragraph
}
```

### 4.2 Fallacy entries

```ts
type Fallacy = {
  id: string;                 // 'ad-hominem'
  formalName: string;         // 'Ad Hominem'
  plainName: string;          // 'Attacking the Person'
  categoryId: string;         // 'personal-attack'
  tier: number;               // tier at which it becomes selectable (1-based)
  definition: string;
  example: string;
  lookFor: string[];          // bullet clues
  commonConfusions: string[]; // bullet items
}
```

Fallacies are **tier-gated**: a level only offers fallacies whose `tier` is at or
below the level's tier. Earlier tiers expose fewer fallacies; later tiers add new
ones. The fallacy picker opens with every (available) category expanded and the
fallacies indented beneath each category heading.

### 4.3 Passages, sentences, paragraphs

```ts
type Sentence = { id: string; text: string };

type Paragraph = {
  id: string;
  sentences: Sentence[];
};

type Passage = {
  id: string;
  title?: string;
  paragraphs: Paragraph[];
  // Whole-passage target id is implicit: `${passageId}::whole`
};
```

### 4.4 Targets, answer keys, hints

```ts
type TargetScope = 'sentence' | 'paragraph' | 'whole-passage';

type ExpectedAnswer = {
  passageId: string;
  scope: TargetScope;
  targetId: string;     // sentence id, paragraph id, or `${passageId}::whole`
  fallacyId: string;    // expected fallacy
  rationale: string;    // explanation shown in feedback
};

type Hint =
  | { passageId: string; step: 1; kind: 'category'; text: string }
  | { passageId: string; step: 2; kind: 'location'; text: string }
  | { passageId: string; step: 3; kind: 'label';    text: string };
```

### 4.5 Levels, tiers

Each lesson ships **multiple variants** of similar difficulty. One variant is
chosen at random per play (an immediate replay avoids repeating the variant just
served), so retries stay fresh while testing the same skill. A variant is
self-contained — it owns its passages, answer key, and hints. Selection lives in
`utils/variants.ts`; a `?v=<variantId>` query param can force a specific variant.

```ts
type LevelVariant = {
  id: string;                    // 't1-l1-shortcut-v1'
  passages: Passage[];
  expected: ExpectedAnswer[];    // empty for no-fallacy levels
  hints: Hint[];
};

type Level = {
  id: string;
  title: string;
  tierId: string;
  kind: 'tutorial' | 'normal' | 'review';
  showFallacyCount: boolean;     // beginner=true; harder=false
  expectedNoFallacies?: boolean; // review only
  tags: string[];                // 'advertising','politics',...
  variants: LevelVariant[];      // >= 3 similarly-hard variants
  intro?: { description: string; themes: string[] }; // review only
};

// The scorer takes just a variant's answer key:
type Scorable = { passages: Passage[]; expected: ExpectedAnswer[] };

type Tier = {
  id: string;          // 'tier-1'
  index: number;       // 1..7
  name: string;        // 'Tier 1'
  description: string;
  isReview?: boolean;  // review tiers hold one lesson and are never locked
};

type Content = {
  schemaVersion: number;
  categories: FallacyCategory[];
  fallacies: Fallacy[];
  tiers: Tier[];
  levels: Level[];
};
```

Runtime validator (`utils/validateContent.ts`) verifies:

- unique ids per collection,
- every level has at least one variant; variant ids unique within a level,
- ids unique within each variant,
- referenced ids exist,
- each expected answer targets a real sentence/paragraph/whole-passage in its variant,
- hints reference real passages,
- `expectedNoFallacies` levels have empty `expected` in every variant,
- tiers ordered.

## 5. Scoring Model

Pure function `score(submission, scorable): ScoreReport`, where `scorable` is the
played variant's `{ passages, expected }`.

### 5.1 Inputs

```ts
type MarkedAnswer = {
  passageId: string;
  scope: TargetScope;
  targetId: string;
  fallacyId: string;
  confidence: 'low' | 'medium' | 'high';
};

type Submission = {
  levelId: string;
  marks: MarkedAnswer[];
  hintsUsed: 0 | 1 | 2 | 3; // per-passage; we keep max ladder reached, summed across passages later
};
```

### 5.2 Base points per expected answer

- **Correct target + correct fallacy**: `+10` (full credit).
- **Correct target + wrong fallacy**: `+3` (partial credit).
- **Missed expected answer**: `0`.

### 5.3 False positive penalty

- A mark that does not align with any expected answer's target (or there are no expected answers at all): `-6`.

### 5.4 Confidence multiplier

Applied to each marked answer's point delta:

| Confidence | Correct (+10) | Partial (+3) | False positive (-6) |
| ---------- | ------------- | ------------ | ------------------- |
| Low        | x0.7          | x0.7         | x0.5                |
| Medium     | x1.0          | x1.0         | x1.0                |
| High       | x1.3          | x1.0         | x1.5                |

Confidence multiplies only the *marked* item's delta — not missed-answer zeros.

### 5.5 Hints penalty

Per passage hint ladder step used:

- Step 1 (category): `-2`
- Step 2 (location): `-3`
- Step 3 (label):    `-5`

Total hint penalty subtracted from the raw score.

### 5.6 Final score

```
rawScore = sum(per-mark deltas) - hintsPenalty
maxScore = expected.length * 10
percent  = clamp(rawScore / max(1, maxScore), 0, 1) * 100
```

For no-fallacy levels, `maxScore = 10` baseline. Marking nothing yields percent = 100; each false positive drops the percent through the standard penalty.

### 5.7 Rank label (neutral)

| Percent | Label         |
| ------- | ------------- |
| ≥ 90    | Excellent     |
| ≥ 75    | Good          |
| ≥ 50    | Needs Review  |
| < 50    | Try Again     |

### 5.8 Subscores tracked

- Accuracy (correct / expected)
- False positives count
- Hints used
- Confidence calibration: of correct marks, share marked at high confidence; of wrong marks, share marked at high confidence (overconfident wrongs hurt calibration).

## 6. Screens & Wireframes

### 6.1 Home / Tier Grid

```
+-----------------------------------------------------------+
|  The Rhetorical Garden           Guide   Settings   About |
+-----------------------------------------------------------+
|                                                           |
|  Welcome back. Pick a level.                              |
|                                                           |
|  Tutorial                                                 |
|  +-------------------+                                     |
|  | Spotting an attack |  badge: Done                       |
|  | on the person      |                                    |
|  +-------------------+                                     |
|                                                           |
|  Tier 1 ─────── 2/4 complete                              |
|  +--------+ +--------+ +--------+ +--------+              |
|  | Lvl 1  | | Lvl 2  | | Lvl 3  | | Lvl 4  |              |
|  | done   | | done   | | new    | | new    |              |
|  +--------+ +--------+ +--------+ +--------+              |
|                                                           |
|  Tier 2 ─────── Locked: finish 2 tier-1 levels            |
|  +--------+ +--------+   (cards greyed)                   |
|                                                           |
+-----------------------------------------------------------+
```

### 6.2 Level Play

```
+-----------------------------------------------------------+
|  ← Exit            Lvl: Workplace Brief        Hint  Guide |
+-----------------------------------------------------------+
|  [passage header]  ▢ Mark whole passage                   |
|                                                           |
|  Paragraph 1  [⌐ mark paragraph]                          |
|  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔                            |
|  Sentence one. (clickable)  [badge: Ad Hominem ✕]         |
|  Sentence two. Sentence three. (selected: highlighted)    |
|                                                           |
|  Paragraph 2  [⌐ mark paragraph]                          |
|  Sentence four. Sentence five.                            |
|                                                           |
|                                                           |
|                                Review ▸                   |
+-----------------------------------------------------------+
```

Clicking a sentence opens the fallacy picker; the picker writes back the chosen fallacy as a badge on the selected unit.

### 6.3 Fallacy Picker (modal)

```
+----------------------------------------------------+
|  Choose a fallacy                              ✕   |
+----------------------------------------------------+
|  [ search ____________ ]      relevant only ▢      |
|                                                    |
|  ▼ Personal Attack                                 |
|     • Ad Hominem      (Attacking the Person)       |
|     • Tu Quoque       (Whataboutism)               |
|                                                    |
|  ▶ Bad Evidence                                    |
|  ▶ Distorted Choices                               |
|  ▶ Emotional Manipulation                          |
|                                                    |
|                              [Remove mark] [Apply] |
+----------------------------------------------------+
```

Read-only Guide entries can be peeked from here but cannot answer the question directly.

### 6.4 In-Level Guide Drawer

Slide-in panel on the right (full-screen on mobile):

```
+--------------------------------+
|  Guide                    ✕    |
+--------------------------------+
| [search __________]            |
| Category: [ All ▾ ]            |
|                                |
| Personal Attack                |
|  • Ad Hominem                  |
|  • Tu Quoque                   |
|                                |
| Bad Evidence                   |
|  • Hasty Generalization        |
|  • Anecdotal Evidence          |
|                                |
|  (click → entry detail)        |
+--------------------------------+
```

Entry detail shows: Formal name • Plain name • Category • Definition • Example • Look for • Common confusions.

### 6.5 Final Review

```
+-----------------------------------------------------------+
|  Review your marks                          [Back to play]|
+-----------------------------------------------------------+
|  Mark 1 — Sentence in Paragraph 1                         |
|   "Of course she'd say that, she works for them."         |
|   Fallacy: [ Ad Hominem ▾ ]                               |
|   Confidence:  ( ) Low  (•) Med  ( ) High                  |
|                                              [ Remove ]   |
|                                                           |
|  Mark 2 — Paragraph 2                                     |
|   Fallacy: [ Straw Man ▾ ]                                 |
|   Confidence:  ( ) Low  ( ) Med  (•) High                  |
|                                              [ Remove ]   |
|                                                           |
|                       Submit ▸                            |
+-----------------------------------------------------------+
```

No “you may be missing answers” warning.
Submit with zero marks is allowed.

### 6.6 Results / Report

```
+-----------------------------------------------------------+
|  Results — Workplace Brief                                |
+-----------------------------------------------------------+
|                                                           |
|         ╔══════════════╗                                  |
|         ║     82%      ║   Rank: Good                     |
|         ╚══════════════╝                                  |
|                                                           |
|  Accuracy        2 / 3 expected                           |
|  False positives 0                                        |
|  Hints used      1                                        |
|  Confidence      Calibrated                               |
|                                                           |
|  ▼ Your marks                                             |
|     Mark 1  Ad Hominem  ✓ correct  high                   |
|     Mark 2  Straw Man   ✗ expected: False Dilemma         |
|        » why: …                                           |
|                                                           |
|  ▼ Missed                                                 |
|     Sentence "Everyone agrees…": Bandwagon                |
|                                                           |
|  [ Replay ]   [ Home ]                                    |
+-----------------------------------------------------------+
```

Simple result first; details expandable.

### 6.7 Settings

```
+-----------------------------------------------------------+
|  Settings                                                 |
+-----------------------------------------------------------+
|  Theme    [ System  / Light  / Dark ]                     |
|                                                           |
|  Progress                                                 |
|    [ Export progress (JSON) ]                             |
|    [ Import progress  …    ]                              |
|    [ Reset progress …      ]                              |
|                                                           |
|  About this app                                           |
|    Version  …                                             |
|                                                           |
+-----------------------------------------------------------+
```

Reset confirms in a dialog. Import validates JSON shape.

### 6.8 About

Static page explaining: purpose of the app; what fallacies are; the app uses “fallacy” broadly to include reasoning problems; scoring philosophy; why false positives matter; why confidence calibration matters.

## 7. State Model (Zustand)

Three stores, each persisted (where appropriate) to `localStorage`:

### 7.1 `useSessionStore` — *not persisted*

```ts
{
  levelId: string | null;
  marks: MarkedAnswer[];
  hintsUsedByPassage: Record<string, 0|1|2|3>;
  guideOpen: boolean;
  pickerTarget: { passageId; scope; targetId } | null;
  // actions: startLevel, addOrUpdateMark, removeMark, setConfidence,
  //          useHint, openGuide, closeGuide, openPicker, closePicker
}
```

Session is wiped on Submit or Exit. Unfinished marks are **not** persisted.

### 7.2 `useProgressStore` — persisted

```ts
{
  completedLevelIds: string[];
  bestScoreByLevel: Record<string, number>;
  attemptsByLevel: Record<string, number>;
  hintsUsedTotal: number;
  confidenceStats: { correctHigh:number; correctTotal:number; wrongHigh:number; wrongTotal:number };
  fallacyStats: Record<string, { correct:number; wrong:number }>;
  badges: string[];
  // computed: tierUnlockState() — derived from completedLevelIds & tiers
  // actions: recordResult, resetAll, importAll, exportAll
}
```

Tier unlock rule (`utils/progression.ts`): there are 7 tiers; tiers 3 and 7 are
**review tiers** that are always unlocked. Each normal tier unlocks when the
previous *normal* tier (review tiers skipped when chaining) has at least 2
completed lessons. Tier 1 and the tutorial are always unlocked.

**Sequential play** (`utils/nextChallenge.ts`): only the next-in-sequence lesson
is active on the dashboard — tutorial first, then normal lessons in
tier-by-tier / authored order. Completed lessons stay clickable for replay;
review-tier lessons are always clickable. The bloom's center hub is a
"Next Challenge" shortcut to whatever's next.

### 7.3 `useSettingsStore` — persisted

```ts
{ theme: 'system' | 'light' | 'dark'; }
```

Exported progress JSON:

```json
{
  "version": 1,
  "exportedAt": "2026-…",
  "progress": { … },
  "settings": { … }
}
```

## 8. Selection & Picker Mechanics

- A click on sentence text → open picker with `scope='sentence'`.
- A click on a paragraph’s “mark paragraph” button → picker `scope='paragraph'`.
- A click on the passage’s “mark whole passage” button → picker `scope='whole-passage'`.
- Closing the picker without a choice does not mutate state.
- Existing marks are editable: clicking the badge re-opens picker pre-filled with current selection (with a Remove option).
- Visual styles:
  - sentence selection → soft inline background highlight
  - paragraph selection → left border + tint
  - whole-passage selection → header chip next to passage title

## 9. Tutorial

`tutorial-1` is built from one short passage with one obvious Ad Hominem sentence. The flow walks the player through: select sentence → choose fallacy → review → confidence → submit → see report. UI nudges are contextual hint chips (no modal lecture).

## 10. Tier & Level Progression (placeholder content)

Seven tiers, generated by `scripts/generate-levels.mjs` (see README):

| Tier   | Kind   | Lessons | Notes                                             |
| ------ | ------ | ------- | ------------------------------------------------- |
| tier-1 | normal | 5       | count shown; tutorial sits in "Start Here"        |
| tier-2 | normal | 5       | count hidden; a sound distractor sentence appears |
| tier-3 | review | 1       | `boss-no-fallacy`, always unlocked                |
| tier-4 | normal | 5       | adds Tu Quoque, Appeal to Pity                     |
| tier-5 | normal | 5       | adds Hasty Generalization, Correlation/Causation  |
| tier-6 | normal | 5       | adds Loaded Language (full taxonomy)              |
| tier-7 | review | 1       | `final-review`, full-taxonomy capstone, always open |

Each normal lesson ships 3 variants of a single short passage. **Review lessons**
are richer: each variant is a coherent passage of **3+ paragraphs with 5+ related
sentences each**, holding **between 0 and 8 fallacies** (one variant has none, so
the correct move there is to mark nothing). Reviews are hand-authored and pinned
in `scripts/pinned/` (the tutorial too); a build-time self-check guarantees no
sentence is reused anywhere across the whole content set.

## 11. Implementation Plan

1. SPEC.md + tasks ✅
2. Scaffold Vite + TS + Tailwind + Zustand. Wire pnpm scripts. No router dep.
3. Domain types, content JSON, content validator, content loader.
4. Stores: settings, progress, session.
5. Scoring `utils/score.ts` with unit tests.
6. Tiny history router (`router/`): pushState + popstate.
7. Pages: Home, About, Settings, Guide, Play, Review, Results.
8. Components: Passage, SentenceText, Paragraph block, FallacyPicker, GuideDrawer, ScoreCard, BadgeChip.
9. Tutorial polish and replay.
10. Vitest unit tests for scoring/validation/store.
11. RTL component tests for the picker and selection.
12. Playwright smoke test for the main flow.
13. GitHub Actions: pnpm install + build.
14. README with run/build/test/deploy/content-authoring sections.

## 12. Out of Scope (this build)

- Backend, auth, classroom mode, dashboards.
- Real political examples.
- Full curated 5-tier content set (separate later task).
- Detective/noir labels and theming.
- Accessibility beyond semantic markup + tab navigation.
- Reduced-motion handling.
- TTS, audio.
