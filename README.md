# The Rhetorical Garden

A single-player, static web app for adults that trains the habit of spotting
**fallacies** and broader reasoning problems in short passages. You read a
passage, mark the sentence / paragraph / whole-passage targets you think are
faulty, choose a fallacy label, set your confidence in a final review, submit,
and get a score with layered feedback.

The word "fallacy" is used broadly here — it covers weak evidence, framing and
bias, loaded language, emotional manipulation, causation errors, and common
propaganda techniques, as well as classic logical fallacies.

> Status: MVP engine with **placeholder content**. The full curated content set
> (tutorial + tiers + review tiers) is a separate later task. See
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

### Run locally

```bash
pnpm install
pnpm dev
# open http://localhost:5173
```

### Test

```bash
pnpm test            # unit + component
pnpm test:e2e:install  # first time only
pnpm test:e2e        # functional smoke tests
```

Unit tests cover the scoring engine, content validation, tier progression, the
progress store + localStorage persistence, and export/import. Component tests
cover the fallacy picker and passage selection. Playwright covers the main
flow: home → tutorial → mark → review → confidence → submit → results →
persistence, plus the guide drawer and a no-fallacy review level.

### Build

```bash
pnpm build      # outputs static files to dist/
pnpm preview    # sanity-check the build locally
```

## Project structure

```
src/
  components/   # Presentational + interactive UI (PassageView, FallacyPicker, …)
  data/         # Static JSON content + content.ts loader/validator entry
  pages/        # Route-level views (Home, Play, Guide, Results, Settings, About)
  router/       # Tiny history-aware router + <Link>
  store/        # Zustand stores (session, progress, settings, result)
  styles/       # Tailwind entry + keyframes
  types/        # Domain + scoring types
  utils/        # Pure logic: score, validateContent, progression, badges, storage, transfer
  tests/        # Vitest unit + component tests
e2e/            # Playwright smoke tests
```

Design rule: **scoring, content validation, and persistence are pure modules in
`src/utils` / `src/store`, never buried inside React components.**

## Content authoring basics

All game content lives in `src/data/` as JSON and is validated at runtime on
load (`src/data/content.ts` → `src/utils/validateContent.ts`). If content is
malformed, the app throws a friendly error listing every problem.

Files:

- `categories.json` — fallacy categories (`id`, `name`, `description`).
- `fallacies.json` — fallacy entries (`id`, `formalName`, `plainName`,
  `categoryId`, `definition`, `example`, `lookFor[]`, `commonConfusions[]`).
- `tiers.json` — tiers (`id`, `index`, `name`, `description`). Indexes must be
  `1..N` with no gaps.
- `levels.json` — levels and their **variants** (each variant holds its own
  passages, answer key, and hints).

### Variants

Every lesson ships **multiple variants** of similar difficulty. When a lesson is
played, one variant is chosen at random (an immediate replay avoids repeating the
one just served), so retries stay fresh while testing the same skill. Author at
least **3 variants per lesson**. A variant is self-contained: its own passages,
`expected` answer key, and `hints`.

You can force a specific variant for review or deep-linking with the query
param `?v=<variantId>` (e.g. `/play/t1-l1-shortcut?v=t1-l1-shortcut-v2`).

### ID conventions

- IDs are stable, readable **kebab-case** (e.g. `ad-hominem`, `t1-l1-shortcut`).
- Variant ids must be unique within a level (e.g. `t1-l1-shortcut-v1`).
- Passage/paragraph/sentence IDs must be unique **within a variant**; prefixing
  them with the variant (e.g. `t1l1-v2-p1-s1`) keeps things collision-free.
- The whole-passage target ID is always `"<passageId>::whole"`.
- In a **single-paragraph** passage, `paragraph` and `whole-passage` are treated
  as the same target, so a player marking either matches an answer key written
  with either scope.

### Authoring a level

```jsonc
{
  "id": "t1-l1-shortcut",
  "title": "The Shortcut Pitch",
  "tierId": "tier-1",
  "kind": "normal",              // "tutorial" | "normal" | "review"
  "showFallacyCount": true,       // beginner levels show "Find N fallacies."
  "tags": ["advertising"],        // freeform themes; shown on review intros
  "variants": [                    // author at least 3 similarly-hard variants
    {
      "id": "t1-l1-shortcut-v1",
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
          "targetId": "t1l1-v1-p1-s2", // a real sentence/paragraph id, or "<passageId>::whole"
          "fallacyId": "anecdotal-evidence",
          "rationale": "Shown in feedback to explain why this is the answer."
        }
      ],
      "hints": [
        { "passageId": "t1l1-v1-p1", "step": 1, "kind": "category", "text": "..." },
        { "passageId": "t1l1-v1-p1", "step": 2, "kind": "location", "text": "..." },
        { "passageId": "t1l1-v1-p1", "step": 3, "kind": "label", "text": "..." }
      ]
    }
    // ...two or more more variants with the same shape
  ]
}
```

Notes:

- **Review lessons** (`"kind": "review"`): each variant is a richer passage of
  **3+ paragraphs with 5+ related sentences each**, holding **0 to 8 fallacies**.
  A variant with `"expected": []` is a no-fallacy passage — marking nothing scores
  100% and any mark is a penalized false positive. The runtime validator enforces
  the paragraph/sentence/fallacy-count rules for review lessons.
- **No-fallacy variants**: simply give that variant `"expected": []` (you don't
  need a level-wide `expectedNoFallacies` flag; scoring keys off the variant).
- **Review intro screen**: add `"intro": { "description": "...", "themes": [...] }`
  at the level (not variant) level.
- **Harder levels**: set `"showFallacyCount": false` to hide the count.
- One correct fallacy label per expected answer (no alternates in MVP).

### Tiers & progression

There are 7 tiers. Tiers 3 and 7 are **Review tiers** (one review lesson each,
often a no-fallacy passage) and are **never locked**. The other tiers are normal
tiers with at least 5 lessons each.

- Tier 1 (and the tutorial) is always unlocked.
- Review tiers are always unlocked.
- Each normal tier unlocks once the **previous normal tier** (review tiers are
  skipped when chaining) has **2** completed lessons.
- **Sequential play**: only the next-in-sequence lesson (the "next challenge")
  is the active play target on the dashboard. Completed lessons remain
  clickable for replay, and review-tier lessons are always clickable. The
  center hub of the bloom is a shortcut to whatever's next.

Fallacies are gated by tier: a level only lets you pick fallacies introduced at
or before its tier (`fallacy.tier`). Earlier tiers expose fewer fallacies; later
tiers add new ones on top. The validator rejects any answer key that references a
fallacy above its level's tier.

### Generating lesson content

Most lesson content is assembled by a generator from a curated phrase bank so
ids, variants, and hints stay consistent across ~80 variants:

```bash
node scripts/generate-levels.mjs   # rewrites src/data/levels.json
```

The tutorial and the tier-3 review lesson are pinned (their text is referenced by
e2e tests) in `scripts/pinned/`. You can still hand-edit `levels.json` directly;
the runtime validator checks whatever ships. The schema below is what the
generator emits and what you'd author by hand.

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
links to work on refresh, configure CloudFront to serve `index.html` for 403/404
responses (set the custom error responses for codes 403 and 404 to return
`/index.html` with a `200` response code).

## CI

`.github/workflows/build.yml` runs `pnpm install` + `pnpm build` on pushes to
`main` and on pull requests. Full test automation in CI is intentionally not set
up yet.

## Known limitations

- Placeholder content: 7 tiers (5 normal tiers with 5 lessons each + 2 review
  tiers), every lesson with 3 randomized variants, assembled from a phrase bank.
  The writing is intentionally formulaic — hand-curated lessons are a later task.
- One correct fallacy label per expected answer; no accepted alternates.
- In-progress answers are not saved — only submitted results persist.
- Keyboard support covers tab navigation and accessible controls; full
  keyboard-driven sentence selection is a later enhancement.
- No reduced-motion handling, no audio/TTS.
- The fallacy picker expands the category of the current selection (or the first
  category) by default rather than a tier-specific "relevant" category, to avoid
  leaking answers on hidden-count levels.

## Suggested next step

**Curated content generation** as a separate task: a tutorial, 5 tiers with 4–6
levels each, review tiers after every 2–3 tiers, realistic distractors, and
non-fallacy passages — authored against the schema documented above and
validated by the existing runtime validator.
