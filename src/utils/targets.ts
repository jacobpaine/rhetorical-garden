import type { Passage, TargetScope } from '../types';
import { wholePassageTargetId } from './validateContent';

export interface CanonicalTarget {
  scope: TargetScope;
  targetId: string;
}

export function isSingleParagraph(passage: Passage): boolean {
  return passage.paragraphs.length === 1;
}

/**
 * In a single-paragraph passage, "the paragraph" and "the whole passage" are
 * the same span of text, so we collapse both to one canonical target
 * (whole-passage). This keeps marking and scoring consistent no matter which
 * control the player used or which scope a content author wrote.
 */
export function canonicalizeTarget(
  passage: Passage,
  scope: TargetScope,
  targetId: string,
): CanonicalTarget {
  if (isSingleParagraph(passage) && (scope === 'paragraph' || scope === 'whole-passage')) {
    return { scope: 'whole-passage', targetId: wholePassageTargetId(passage.id) };
  }
  return { scope, targetId };
}
