import type { Hint, HintLadder, Passage } from '../types';
import { Modal } from './Modal';

interface HintsModalProps {
  open: boolean;
  passages: Passage[];
  hints: Hint[];
  hintsUsedByPassage: Record<string, HintLadder>;
  onUseHint: (passageId: string) => void;
  onClose: () => void;
}

export function HintsModal({
  open,
  passages,
  hints: allHints,
  hintsUsedByPassage,
  onUseHint,
  onClose,
}: HintsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Hints">
      <p className="mb-4 text-sm text-ink-500 dark:text-ink-300">
        Each hint you reveal lowers your score a little. Reveal them one step at a time.
      </p>
      <div className="space-y-4">
        {passages.map((passage) => {
          const used = hintsUsedByPassage[passage.id] ?? 0;
          const hints = allHints
            .filter((h) => h.passageId === passage.id)
            .sort((a, b) => a.step - b.step);
          const canReveal = used < hints.length;
          return (
            <div key={passage.id} className="card p-3">
              <h3 className="mb-2 text-sm font-semibold">
                {passage.title ?? 'Passage'}
              </h3>
              <ol className="space-y-1 text-sm">
                {hints.slice(0, used).map((h) => (
                  <li key={h.step} className="text-ink-700 dark:text-ink-200">
                    <span className="mr-1 font-medium capitalize text-ink-400">
                      {h.kind}:
                    </span>
                    {h.text}
                  </li>
                ))}
              </ol>
              {canReveal ? (
                <button
                  type="button"
                  className="btn-outline mt-2"
                  onClick={() => onUseHint(passage.id)}
                >
                  {used === 0 ? 'Reveal a hint' : 'Reveal next hint'}
                </button>
              ) : (
                hints.length > 0 && (
                  <p className="mt-2 text-xs text-ink-400">All hints revealed.</p>
                )
              )}
              {hints.length === 0 && (
                <p className="text-xs text-ink-400">No hints for this passage.</p>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
