import type { Fallacy, MarkedAnswer } from '../types';
import { fallaciesById } from '../data/content';
import { ConfidenceSelector } from './ConfidenceSelector';
import type { PickerTarget } from '../store/session';

interface FinalReviewProps {
  marks: MarkedAnswer[];
  availableFallacies: Fallacy[];
  onSetConfidence: (target: PickerTarget, c: MarkedAnswer['confidence']) => void;
  onSetFallacy: (target: PickerTarget, fallacyId: string) => void;
  onRemove: (target: PickerTarget) => void;
  onBack: () => void;
  onSubmit: () => void;
}

function scopeLabel(scope: MarkedAnswer['scope']): string {
  if (scope === 'whole-passage') return 'Whole passage';
  if (scope === 'paragraph') return 'Paragraph';
  return 'Sentence';
}

export function FinalReview({
  marks,
  availableFallacies,
  onSetConfidence,
  onSetFallacy,
  onRemove,
  onBack,
  onSubmit,
}: FinalReviewProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Review your marks</h2>
        <button type="button" className="btn-ghost" onClick={onBack}>
          ← Back to play
        </button>
      </div>

      {marks.length === 0 ? (
        <div className="card p-6 text-center text-ink-500 dark:text-ink-300">
          <p className="mb-1 font-medium">You haven't marked anything.</p>
          <p className="text-sm">
            That can be the right call on advanced levels. Submit if you're confident
            nothing here is fallacious.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {marks.map((m, i) => {
            const target: PickerTarget = {
              passageId: m.passageId,
              scope: m.scope,
              targetId: m.targetId,
            };
            const fallacy = fallaciesById.get(m.fallacyId);
            return (
              <li key={`${m.passageId}-${m.scope}-${m.targetId}`} className="card p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="pill">
                    Mark {i + 1} · {scopeLabel(m.scope)}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-danger-500 hover:underline"
                    onClick={() => onRemove(target)}
                  >
                    Remove
                  </button>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-sm">
                    <span className="mr-2 text-ink-400">Fallacy:</span>
                    <select
                      value={m.fallacyId}
                      onChange={(e) => onSetFallacy(target, e.target.value)}
                      className="rounded-md border border-ink-300 bg-white px-2 py-1 text-sm dark:border-ink-600 dark:bg-ink-900"
                      aria-label={`Fallacy for mark ${i + 1}`}
                    >
                      {availableFallacies.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.formalName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-400">Confidence</span>
                    <ConfidenceSelector
                      value={m.confidence}
                      idPrefix={`conf-${i}`}
                      onChange={(c) => onSetConfidence(target, c)}
                    />
                  </div>
                </div>
                {fallacy && (
                  <p className="mt-2 text-xs text-ink-400">{fallacy.plainName}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-6 flex justify-end">
        <button type="button" className="btn-primary px-6" onClick={onSubmit}>
          Submit
        </button>
      </div>
    </div>
  );
}
