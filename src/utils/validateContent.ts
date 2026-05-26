import type {
  Content,
  ExpectedAnswer,
  Level,
  LevelVariant,
  Passage,
  TargetScope,
} from '../types';

export class ContentValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(`Content validation failed:\n- ${issues.join('\n- ')}`);
    this.name = 'ContentValidationError';
    this.issues = issues;
  }
}

export const wholePassageTargetId = (passageId: string): string =>
  `${passageId}::whole`;

function findDuplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
}

/** Collect every valid target id for a passage at a given scope. */
function targetIdsForScope(passage: Passage, scope: TargetScope): Set<string> {
  if (scope === 'whole-passage') {
    return new Set([wholePassageTargetId(passage.id)]);
  }
  if (scope === 'paragraph') {
    return new Set(passage.paragraphs.map((p) => p.id));
  }
  return new Set(
    passage.paragraphs.flatMap((p) => p.sentences.map((s) => s.id)),
  );
}

function validateExpected(
  level: Level,
  variant: LevelVariant,
  passagesById: Map<string, Passage>,
  fallacyIds: Set<string>,
  fallacyTierById: Map<string, number>,
  levelTierIndex: number,
  issues: string[],
): void {
  if (level.expectedNoFallacies && variant.expected.length > 0) {
    issues.push(
      `Level "${level.id}" variant "${variant.id}" is marked expectedNoFallacies but has ${variant.expected.length} expected answer(s).`,
    );
  }

  variant.expected.forEach((exp: ExpectedAnswer, i) => {
    const where = `Level "${level.id}" variant "${variant.id}" expected[${i}]`;
    const passage = passagesById.get(exp.passageId);
    if (!passage) {
      issues.push(`${where}: unknown passageId "${exp.passageId}".`);
      return;
    }
    if (!fallacyIds.has(exp.fallacyId)) {
      issues.push(`${where}: unknown fallacyId "${exp.fallacyId}".`);
    } else {
      const fTier = fallacyTierById.get(exp.fallacyId) ?? 1;
      if (fTier > levelTierIndex) {
        issues.push(
          `${where}: fallacy "${exp.fallacyId}" is introduced at tier ${fTier} but the level is tier ${levelTierIndex}; it would not be selectable.`,
        );
      }
    }
    const valid = targetIdsForScope(passage, exp.scope);
    if (!valid.has(exp.targetId)) {
      issues.push(
        `${where}: targetId "${exp.targetId}" is not a valid ${exp.scope} target in passage "${exp.passageId}".`,
      );
    }
  });
}

/**
 * Validates a Content object at runtime. Throws ContentValidationError listing
 * every problem found, so authoring mistakes surface as friendly dev errors.
 */
export function validateContent(content: Content): Content {
  const issues: string[] = [];

  if (typeof content.schemaVersion !== 'number') {
    issues.push('Missing or non-numeric schemaVersion.');
  }

  const categoryIds = content.categories.map((c) => c.id);
  const fallacyIds = content.fallacies.map((f) => f.id);
  const tierIds = content.tiers.map((t) => t.id);
  const levelIds = content.levels.map((l) => l.id);

  for (const [label, ids] of [
    ['category', categoryIds],
    ['fallacy', fallacyIds],
    ['tier', tierIds],
    ['level', levelIds],
  ] as const) {
    const dupes = findDuplicates(ids);
    if (dupes.length) issues.push(`Duplicate ${label} id(s): ${dupes.join(', ')}.`);
  }

  const categoryIdSet = new Set(categoryIds);
  const fallacyIdSet = new Set(fallacyIds);
  const tierIdSet = new Set(tierIds);
  const fallacyTierById = new Map(content.fallacies.map((f) => [f.id, f.tier]));
  const tierIndexById = new Map(content.tiers.map((t) => [t.id, t.index]));

  for (const f of content.fallacies) {
    if (!categoryIdSet.has(f.categoryId)) {
      issues.push(`Fallacy "${f.id}" references unknown categoryId "${f.categoryId}".`);
    }
  }

  // Tiers should be a contiguous, ordered sequence by index.
  const sortedIdx = [...content.tiers].sort((a, b) => a.index - b.index).map((t) => t.index);
  sortedIdx.forEach((idx, i) => {
    if (idx !== i + 1) {
      issues.push(`Tier indexes should be 1..N with no gaps; found ${sortedIdx.join(', ')}.`);
    }
  });

  for (const level of content.levels) {
    if (!tierIdSet.has(level.tierId)) {
      issues.push(`Level "${level.id}" references unknown tierId "${level.tierId}".`);
    }

    if (!Array.isArray(level.variants) || level.variants.length === 0) {
      issues.push(`Level "${level.id}" has no variants.`);
      continue;
    }

    const variantDupes = findDuplicates(level.variants.map((v) => v.id));
    if (variantDupes.length) {
      issues.push(`Level "${level.id}" has duplicate variant id(s): ${variantDupes.join(', ')}.`);
    }

    for (const variant of level.variants) {
      const passagesById = new Map<string, Passage>();
      const sentenceIds: string[] = [];
      const paragraphIds: string[] = [];

      for (const passage of variant.passages) {
        passagesById.set(passage.id, passage);
        for (const para of passage.paragraphs) {
          paragraphIds.push(para.id);
          for (const s of para.sentences) sentenceIds.push(s.id);
        }
      }

      const localDupes = [
        ...findDuplicates(variant.passages.map((p) => p.id)).map((d) => `passage "${d}"`),
        ...findDuplicates(paragraphIds).map((d) => `paragraph "${d}"`),
        ...findDuplicates(sentenceIds).map((d) => `sentence "${d}"`),
      ];
      if (localDupes.length) {
        issues.push(
          `Level "${level.id}" variant "${variant.id}" has duplicate id(s): ${localDupes.join(', ')}.`,
        );
      }

      // Review lessons: substantial passages (>= 3 paragraphs, > 4 sentences
      // each) holding between 0 and 8 fallacies.
      if (level.kind === 'review') {
        const allParagraphs = variant.passages.flatMap((p) => p.paragraphs);
        if (allParagraphs.length < 3) {
          issues.push(
            `Level "${level.id}" variant "${variant.id}" is a review but has only ${allParagraphs.length} paragraph(s); needs at least 3.`,
          );
        }
        for (const para of allParagraphs) {
          if (para.sentences.length < 5) {
            issues.push(
              `Level "${level.id}" variant "${variant.id}" paragraph "${para.id}" has ${para.sentences.length} sentence(s); a review paragraph needs more than 4.`,
            );
          }
        }
        if (variant.expected.length > 8) {
          issues.push(
            `Level "${level.id}" variant "${variant.id}" has ${variant.expected.length} fallacies; a review allows between 0 and 8.`,
          );
        }
      }

      validateExpected(
        level,
        variant,
        passagesById,
        fallacyIdSet,
        fallacyTierById,
        tierIndexById.get(level.tierId) ?? 1,
        issues,
      );

      for (const hint of variant.hints) {
        if (!passagesById.has(hint.passageId)) {
          issues.push(
            `Level "${level.id}" variant "${variant.id}" hint references unknown passageId "${hint.passageId}".`,
          );
        }
      }
    }
  }

  if (issues.length) throw new ContentValidationError(issues);
  return content;
}
