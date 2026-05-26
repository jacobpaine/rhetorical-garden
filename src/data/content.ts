import type { Content, FallacyCategory, Fallacy, Tier, Level } from '../types';
import { validateContent } from '../utils/validateContent';
import categories from './categories.json';
import fallacies from './fallacies.json';
import tiers from './tiers.json';
import levels from './levels.json';

export const SCHEMA_VERSION = 1;

const raw: Content = {
  schemaVersion: SCHEMA_VERSION,
  categories: categories as FallacyCategory[],
  fallacies: fallacies as Fallacy[],
  tiers: tiers as Tier[],
  levels: levels as Level[],
};

// Validate once at module load. Throws a friendly error in dev if content is bad.
export const content: Content = validateContent(raw);

// ---- Convenience lookups (built once) ----

export const fallaciesById = new Map(content.fallacies.map((f) => [f.id, f]));
export const categoriesById = new Map(content.categories.map((c) => [c.id, c]));
export const levelsById = new Map(content.levels.map((l) => [l.id, l]));
export const tiersById = new Map(content.tiers.map((t) => [t.id, t]));

export const tiersByIndex = [...content.tiers].sort((a, b) => a.index - b.index);

export function levelsForTier(tierId: string): Level[] {
  return content.levels.filter((l) => l.tierId === tierId && l.kind !== 'tutorial');
}

export const tutorialLevels = content.levels.filter((l) => l.kind === 'tutorial');

export function fallacyName(fallacyId: string): string {
  return fallaciesById.get(fallacyId)?.formalName ?? fallacyId;
}
