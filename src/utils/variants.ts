import type { Level, LevelVariant } from '../types';

// Tracks the variant most recently served for each level, plus the navigation
// token it was chosen under. Keying by navId makes selection idempotent within
// a single navigation (so React StrictMode's double-invoked effects don't
// advance the rotation twice), while still rotating to a different variant on
// the next real navigation.
interface Served {
  navId: number;
  variantId: string;
}
const served = new Map<string, Served>();

export function getVariant(
  level: Level,
  variantId: string | null | undefined,
): LevelVariant {
  if (variantId) {
    const found = level.variants.find((v) => v.id === variantId);
    if (found) return found;
  }
  return level.variants[0];
}

/**
 * Picks a variant for a play. Given the same navId it returns the same choice
 * (idempotent per navigation); on a new navId it picks a random variant that
 * differs from the one shown last, so every replay or re-entry changes.
 */
export function chooseVariantId(
  level: Level,
  navId: number,
  rng: () => number = Math.random,
): string {
  const variants = level.variants;
  const prior = served.get(level.id);
  if (prior && prior.navId === navId) return prior.variantId;

  const previousId = prior?.variantId;
  const pool =
    variants.length > 1 && previousId
      ? variants.filter((v) => v.id !== previousId)
      : variants;
  const choice = pool[Math.floor(rng() * pool.length)] ?? variants[0];
  served.set(level.id, { navId, variantId: choice.id });
  return choice.id;
}

/** Records a variant chosen by other means (e.g. a forced ?v= deep link) so the
 *  next random pick rotates away from it. */
export function noteServedVariant(
  level: Level,
  navId: number,
  variantId: string,
): void {
  served.set(level.id, { navId, variantId });
}
