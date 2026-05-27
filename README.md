# The Rhetorical Garden

A single-player, static web app for adults that trains the habit of spotting
**fallacies** and broader reasoning problems in short passages. You read a
passage, mark the sentence / paragraph / whole-passage targets you think are
faulty, choose a fallacy label, set your confidence in a final review, submit,
and get a score with layered feedback.

The word "fallacy" is used broadly here — it covers weak evidence, framing and
bias, loaded language, emotional manipulation, causation errors, common
propaganda techniques, and classic logical fallacies.

**Repo:** <https://github.com/jacobpaine/rhetorical-garden>

```bash
git clone https://github.com/jacobpaine/rhetorical-garden.git
cd rhetorical-garden
pnpm install
pnpm dev   # http://localhost:5173
```

> Status: MVP engine with **placeholder content**. The taxonomy and the engine
> are fully wired (9 tiers, 18 fallacies, 34 lessons, 102 variants), and every
> sentence across every lesson is guaranteed unique. Hand-curated lessons that
> replace the generated placeholders are a separate later task. See
> [`SPEC.md`](./SPEC.md) for the full design.

## Tech stack

React · TypeScript · Vite · Tailwind CSS · Zustand · Vitest + React Testing
Library · Playwright. Package manager: **pnpm**. Routing is a tiny in-house
history router (no `react-router` dependency).

## Setup

Requires Node 20+ and pnpm 9+.

```bash
pnpm install
```

## Commands

| Command | What it does |
| ------- | ------------ |
| `pnpm dev` | Start the Vite dev server (http://localhost:5173). |
| `pnpm build` | Type-check (`tsc -b`) then build to `dist/`. |
| `pnpm preview` | Serve the production build (http://localhost:4173). |
| `pnpm test` | Run unit + component tests (Vitest) once. |
| `pnpm test:watch` | Run Vitest in watch mode. |
| `pnpm test:e2e` | Run Playwright smoke tests (auto-starts `preview`). |
| `pnpm test:e2e:install` | Install the Chromium browser Playwright needs. |
| `pnpm typecheck` | Type-check without emitting. |

### Test

```bash
pnpm test              # 62 unit + component tests
pnpm test:e2e:install  # first time only
pnpm test:e2e          # 7 functional smoke tests
```

The Vitest suite covers the scoring engine, content validation (including the
runtime checks for variant uniqueness, review-passage structure, and tier
gating), tier progression, the progress store + localStorage persistence,
export/import, the variant rotation guarantee, and the `nextChallenge`
sequencer. Component tests cover the fallacy picker and passage selection.
Playwright covers the main flow: home → tutorial → mark → review → confidence
→ submit → results → persistence, plus the guide drawer, lesson re-entry
serving a different variant, and a no-fallacy review level.

### Build

```bash
pnpm build      # outputs static files to dist/
pnpm preview    # sanity-check the build locally
```

## What it looks like

The home dashboard is a **radial bloom**: concentric rings of tier colors with
each lesson rendered as a small SVG plant or flower.

- **Center hub** = your **Next Challenge** shortcut. While the tutorial is
  unfinished, the hub pulses with a "Start · tutorial" affordance; once it's
  done the hub becomes "Next Challenge · <title>" with your cleared-lesson
  count.
- **Rings** = tiers. Hover any ring and it brightens; a tooltip appears showing
  the tier name, description, the fallacies it introduces, and the lesson
  count. Review-tier rings (3, 7, 9) are dashed and labelled "Always open."
- **Petals** = lessons, drawn as SVG plants whose state shows progress:
  - **closed dashed bud** — locked (tier not yet unlocked)
  - **colored bud on a stem** — pending (your turn hasn't reached it)
  - **opening 5-petal flower (pulsing, outlined)** — your next challenge
  - **filled bloom with a warm yellow center** — completed (clickable to replay)
  - **5-point star burst** — review-tier lesson (always clickable)
- A small "Replay the tutorial" link sits beneath the bloom once the tutorial
  has been completed.

The bloom shows at `md+` (≥ 768px). On phones, a clean **stacked tier-row
fallback** replaces it (every lesson stays a focusable link with accessible
labels in both layouts).

## Project structure

```
src/
  components/        Presentational + interactive UI
    BloomGarden.tsx     radial flower dashboard
    FallacyPicker.tsx   all-open, tier-gated picker
    FinalReview.tsx     per-mark confidence + edit
    GuideBrowser.tsx    guide w/ tier badges + filter
    PassageView.tsx     sentence/paragraph/whole-passage targets
    HintsModal.tsx, GuideDrawer.tsx, Modal.tsx, ScoreDial.tsx, ConfidenceSelector.tsx, BadgeChip.tsx
    tierColors.ts       9-color palette shared by bloom + guide
  data/              Static JSON content + content.ts loader/validator entry
  pages/             Route-level views (Home, Play, Guide, Results, Settings, About, NotFound)
  router/            Tiny history-aware router + <Link> + navId for variant rotation
  store/             Zustand stores (session, progress, settings, result)
  styles/            Tailwind entry + keyframes
  types/             Domain + scoring types
  utils/             Pure logic:
                       score.ts          per-mark scoring + confidence calibration
                       validateContent.ts tier gating + review structure + unique-ids
                       progression.ts    tier unlock chain
                       nextChallenge.ts  sequential play target
                       variants.ts       per-navigation idempotent variant rotation
                       targets.ts        single-paragraph canonicalization
                       badges.ts, storage.ts, transfer.ts
  tests/             Vitest unit + component tests
e2e/                 Playwright smoke tests
scripts/
  generate-levels.mjs   curated phrase bank + per-fallacy uniqueness self-check
  pinned/               hand-authored content used verbatim:
                          tutorial.json
                          review-tier3.json   "Review I"
                          review-tier7.json   "Review II"
                          review-tier9.json   "Final Review"
```

Design rule: **scoring, content validation, and persistence are pure modules in
`src/utils` / `src/store`, never buried inside React components.**

## Taxonomy

- **7 categories**: Personal Attack, Bad Evidence, Distorted Choices, Emotional
  Manipulation, Causation Errors, Framing & Bias, Bad Argument Form.
- **18 fallacies** total, each tagged with the tier at which it becomes
  selectable. Earlier tiers expose fewer fallacies; later tiers add new ones on
  top. The Guide shows a colored tier badge on every entry and offers a tier
  filter alongside the category filter.

```
Tier 1  Ad Hominem · False Dilemma · Straw Man · Anecdotal Evidence · Bandwagon
Tier 2  + Appeal to Fear · Post Hoc
Tier 3  Review I — always open
Tier 4  + Tu Quoque · Appeal to Pity
Tier 5  + Hasty Generalization · Correlation/Causation
Tier 6  + Loaded Language
Tier 7  Review II — always open
Tier 8  + Red Herring · Slippery Slope · Begging the Question
            · Appeal to Authority · Cherry-Picking · False Equivalence
Tier 9  Final Review — always open
```

## Content authoring

All game content lives in `src/data/` as JSON and is validated at runtime on
load (`src/data/content.ts` → `src/utils/validateContent.ts`). If content is
malformed, the app throws a friendly error listing every problem.

Files:

- `categories.json` — fallacy categories (`id`, `name`, `description`).
- `fallacies.json` — fallacy entries (`id`, `formalName`, `plainName`,
  `categoryId`, `tier`, `definition`, `example`, `lookFor[]`,
  `commonConfusions[]`).
- `tiers.json` — tiers (`id`, `index`, `name`, `description`, optional
  `isReview`). Indexes must be `1..N` with no gaps.
- `levels.json` — levels and their **variants** (each variant holds its own
  passages, answer key, and hints). Regenerated by the script (see below).

### Variants

Every lesson ships **3 variants** of similar difficulty. On each play one is
chosen at random; the choice is idempotent within a single navigation (so React
StrictMode's double-invoked effects can't corrupt the rotation) and always
excludes the variant served last for that level — so replays and re-entries
always feel fresh.

You can force a specific variant for review or deep-linking with the query
param `?v=<variantId>` (e.g. `/play/t1-l1?v=t1-l1-v2`).

### ID conventions

- IDs are stable, readable **kebab-case** (e.g. `ad-hominem`, `t1-l1`).
- Variant ids are unique within a level (e.g. `t1-l1-v1`).
- Passage/paragraph/sentence IDs are unique **within a variant**; prefixing
  them with the variant (e.g. `t1l1-v2-p1-s1`) keeps things collision-free.
- The whole-passage target ID is always `"<passageId>::whole"`.
- In a **single-paragraph** passage, `paragraph` and `whole-passage` are
  treated as the same target, so a player marking either matches an answer
  key written with either scope.

### Authoring a level

```jsonc
{
  "id": "t1-l1",
  "title": "Reading the Room",
  "tierId": "tier-1",
  "kind": "normal",              // "tutorial" | "normal" | "review"
  "showFallacyCount": true,       // beginner levels show "Find N fallacies."
  "tags": ["workplace"],          // freeform themes; shown on review intros
  "variants": [                    // author at least 3 similarly-hard variants
    {
      "id": "t1-l1-v1",
      "passages": [
        {
          "id": "t1l1-v1-p1",
          "title": "Ad Copy",
          "paragraphs": [
            {
              "id": "t1l1-v1-p1-para1",
              "sentences": [
                { "id": "t1l1-v1-p1-s1", "text": "..." }
              ]
            }
          ]
        }
      ],
      "expected": [
        {
          "passageId": "t1l1-v1-p1",
          "scope": "sentence",        // "sentence" | "paragraph" | "whole-passage"
          "targetId": "t1l1-v1-p1-s2",
          "fallacyId": "ad-hominem",
          "rationale": "Shown in feedback to explain why this is the answer."
        }
      ],
      "hints": [
        { "passageId": "t1l1-v1-p1", "step": 1, "kind": "category", "text": "..." },
        { "passageId": "t1l1-v1-p1", "step": 2, "kind": "location", "text": "..." },
        { "passageId": "t1l1-v1-p1", "step": 3, "kind": "label",    "text": "..." }
      ]
    }
    // ...two or more more variants with the same shape
  ]
}
```

Notes:

- **Review lessons** (`"kind": "review"`): each variant is a richer passage of
  **3+ paragraphs with 5+ related sentences each**, holding **0 to 8
  fallacies**. A variant with `"expected": []` is a no-fallacy passage —
  marking nothing scores 100% and any mark is a penalized false positive. The
  runtime validator enforces the paragraph / sentence / fallacy-count rules.
- **Review intro screen**: add `"intro": { "description": "...", "themes":
  [...] }` at the level (not variant) level.
- **Harder levels**: set `"showFallacyCount": false` to hide the count.
- **Tier gating** is enforced at load: a level may only reference fallacies
  whose `tier <= level.tier`.
- **Sentence uniqueness** is enforced: a unit test (and a build-time check in
  the generator) rejects any duplicate sentence text across the whole content
  set, including the pinned lessons.
- One correct fallacy label per expected answer (no alternates in MVP).

### Tiers & progression

There are **9 tiers**. Tiers **3, 7, 9** are **Review tiers** (one review
lesson each) and are **never locked**. The other 6 are normal tiers with 5
lessons each.

- Tier 1 (and the tutorial) is always unlocked.
- Review tiers are always unlocked.
- Each normal tier unlocks once the **previous normal tier** (review tiers are
  skipped when chaining) has **2** completed lessons.
- **Sequential play**: only the next-in-sequence lesson (the "next challenge")
  is the active play target on the dashboard. Completed lessons remain
  clickable for replay, and review-tier lessons are always clickable. The
  center hub of the bloom is a shortcut to whatever's next.

### Generating lesson content

Most lessons are assembled by a generator from a curated phrase bank so ids,
variants, and hints stay consistent across ~100 variants. The generator
consumes from per-fallacy and neutral-sentence pools **without reuse**, and a
self-check at the end refuses to write the file if any sentence text would
repeat anywhere across the whole content set (including the pinned lessons).

```bash
node scripts/generate-levels.mjs   # rewrites src/data/levels.json
```

The tutorial and the three review lessons (`review-tier3.json`,
`review-tier7.json`, `review-tier9.json`) are pinned in `scripts/pinned/`;
their text is referenced by e2e tests and hand-authored for coherence. You
can still hand-edit `levels.json` directly; the runtime validator checks
whatever ships.

## Manual deployment (S3 + CloudFront)

This is a static site — the contents of `dist/` are all you deploy. No
Terraform, no automated deploy script.

1. **Build:**

   ```bash
   pnpm build
   ```

2. **Sync to your S3 bucket.** Cache hashed assets aggressively and the HTML
   entry point not at all (so deploys take effect immediately):

   ```bash
   # Hashed, immutable assets — long cache.
   aws s3 sync dist/ s3://YOUR_BUCKET/ \
     --delete \
     --exclude index.html \
     --cache-control "public,max-age=31536000,immutable"

   # The HTML shell — never cache.
   aws s3 cp dist/index.html s3://YOUR_BUCKET/index.html \
     --cache-control "no-cache"
   ```

3. **Invalidate the CloudFront cache** so visitors get the new HTML:

   ```bash
   aws cloudfront create-invalidation \
     --distribution-id YOUR_DISTRIBUTION_ID \
     --paths "/index.html" "/"
   ```

### SPA routing note

The app uses the History API (clean paths like `/play/tutorial-1`). For deep
links to work on refresh, configure CloudFront to serve `index.html` for 403
and 404 responses (custom error responses returning `/index.html` with a `200`
response code).

## CI

`.github/workflows/build.yml` runs `pnpm install` + `pnpm build` on pushes to
`main` and on pull requests. Full test automation in CI is intentionally not
set up yet.

## Known limitations

- Placeholder content: 6 normal tiers × 5 lessons + 3 review tiers + 1
  tutorial, **3 variants** each (≈ 102 variants). Lesson passages are
  templated; the writing is intentionally formulaic. Hand-curated lessons are
  the natural follow-up — the engine, taxonomy, validators, and uniqueness
  invariants are all in place.
- One correct fallacy label per expected answer; no accepted alternates.
- In-progress answers are not saved — only submitted results persist.
- Keyboard support covers tab navigation and accessible controls; full
  keyboard-driven sentence selection is a later enhancement.
- No reduced-motion handling, no audio/TTS.
- The bloom dashboard shows at `md+` (≥ 768px); narrower viewports use the
  stacked tier-row fallback.

## Suggested next step

**Curated content generation**: replace the templated lessons with bespoke,
coherent passages drawn from real (non-political, non-controversial) example
domains. The schema, validators, and uniqueness invariants documented above are
the contract; the existing `scripts/pinned/` is the model for fully-authored
levels.
