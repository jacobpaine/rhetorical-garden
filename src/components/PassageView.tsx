import type { MarkedAnswer, Passage, TargetScope } from '../types';
import type { PickerTarget } from '../store/session';
import { fallacyName } from '../data/content';
import { wholePassageTargetId } from '../utils/validateContent';
import { canonicalizeTarget, isSingleParagraph } from '../utils/targets';

interface PassageViewProps {
  passage: Passage;
  marks: MarkedAnswer[];
  onOpenTarget: (target: PickerTarget) => void;
}

function markFor(
  marks: MarkedAnswer[],
  passageId: string,
  scope: TargetScope,
  targetId: string,
): MarkedAnswer | undefined {
  return marks.find(
    (m) => m.passageId === passageId && m.scope === scope && m.targetId === targetId,
  );
}

function InlineBadge({ fallacyId }: { fallacyId: string }) {
  return <span className="badge ml-1 align-middle">{fallacyName(fallacyId)}</span>;
}

export function PassageView({ passage, marks, onOpenTarget }: PassageViewProps) {
  const single = isSingleParagraph(passage);
  const wholeId = wholePassageTargetId(passage.id);
  const wholeMark = markFor(marks, passage.id, 'whole-passage', wholeId);

  // Open a target, collapsing paragraph/whole-passage to one canonical target
  // when the passage has a single paragraph.
  const open = (scope: TargetScope, targetId: string) => {
    const c = canonicalizeTarget(passage, scope, targetId);
    onOpenTarget({ passageId: passage.id, scope: c.scope, targetId: c.targetId });
  };

  return (
    <article className="card p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-ink-200 pb-3 dark:border-ink-700">
        <h3 className="font-serif text-lg font-semibold">
          {passage.title ?? 'Passage'}
          {wholeMark && <InlineBadge fallacyId={wholeMark.fallacyId} />}
        </h3>
        <button
          type="button"
          className={`pill transition ${
            wholeMark
              ? 'border-accent-500 text-accent-600 dark:text-accent-400'
              : 'hover:bg-ink-100 dark:hover:bg-ink-700'
          }`}
          onClick={() => open('whole-passage', wholeId)}
        >
          {wholeMark ? 'Whole passage marked' : 'Mark whole passage'}
        </button>
      </header>

      <div className="space-y-4">
        {passage.paragraphs.map((para, idx) => {
          // In a single-paragraph passage the paragraph control shares the
          // whole-passage mark, so both controls reflect the same state.
          const paraMark = single
            ? wholeMark
            : markFor(marks, passage.id, 'paragraph', para.id);
          return (
            <div
              key={para.id}
              className={`rounded-md pl-3 transition ${
                paraMark
                  ? 'border-l-4 border-accent-500 bg-accent-500/5'
                  : 'border-l-4 border-transparent'
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  Paragraph {idx + 1}
                </span>
                <button
                  type="button"
                  className="pill text-[11px] hover:bg-ink-100 dark:hover:bg-ink-700"
                  onClick={() => open('paragraph', para.id)}
                >
                  {paraMark ? 'Edit paragraph mark' : 'Mark paragraph'}
                </button>
                {/* Skip the duplicate badge when single-paragraph: the header chip already shows it. */}
                {paraMark && !single && <InlineBadge fallacyId={paraMark.fallacyId} />}
              </div>
              <p className="font-serif text-[17px] leading-relaxed">
                {para.sentences.map((s) => {
                  const sMark = markFor(marks, passage.id, 'sentence', s.id);
                  return (
                    <span key={s.id}>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenTarget({
                            passageId: passage.id,
                            scope: 'sentence',
                            targetId: s.id,
                          })
                        }
                        className={`cursor-pointer rounded px-0.5 text-left transition hover:bg-accent-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                          sMark ? 'bg-accent-500/15' : ''
                        }`}
                        aria-label={`Mark sentence: ${s.text}`}
                      >
                        {s.text}
                      </button>
                      {sMark && <InlineBadge fallacyId={sMark.fallacyId} />}{' '}
                    </span>
                  );
                })}
              </p>
            </div>
          );
        })}
      </div>
    </article>
  );
}
