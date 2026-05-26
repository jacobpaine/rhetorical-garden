import { useEffect, useState } from 'react';
import { levelsById, tiersById, content } from '../data/content';
import { useRouter, routes } from '../router/router';
import { useSessionStore, type PickerTarget } from '../store/session';
import { useProgressStore } from '../store/progress';
import { useResultStore } from '../store/result';
import { score, buildSubmission } from '../utils/score';
import { chooseVariantId, getVariant, noteServedVariant } from '../utils/variants';
import { PassageView } from '../components/PassageView';
import { FallacyPicker } from '../components/FallacyPicker';
import { HintsModal } from '../components/HintsModal';
import { GuideDrawer } from '../components/GuideDrawer';
import { FinalReview } from '../components/FinalReview';
import { NotFoundPage } from './NotFoundPage';

type Phase = 'intro' | 'play' | 'review';

export function PlayPage({ levelId }: { levelId: string }) {
  const level = levelsById.get(levelId);
  const { navigate, navId } = useRouter();

  const session = useSessionStore();
  const recordResult = useProgressStore((s) => s.recordResult);
  const setResult = useResultStore((s) => s.setResult);

  const [phase, setPhase] = useState<Phase>('play');
  const [hintsOpen, setHintsOpen] = useState(false);

  useEffect(() => {
    if (!level) return;
    // Allow forcing a specific variant via ?v=<variantId> (used for deep links
    // and deterministic tests); otherwise pick one at random.
    const forced = new URLSearchParams(window.location.search).get('v');
    let variantId: string;
    if (forced && level.variants.some((v) => v.id === forced)) {
      variantId = forced;
      noteServedVariant(level, navId, variantId);
    } else {
      variantId = chooseVariantId(level, navId);
    }
    useSessionStore.getState().startLevel(level.id, variantId);
    setPhase(level.kind === 'review' && level.intro ? 'intro' : 'play');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId, navId]);

  if (!level) return <NotFoundPage />;

  const activeForThisLevel = session.levelId === level.id;
  const variant = getVariant(level, activeForThisLevel ? session.variantId : null);
  const marksForThisLevel = activeForThisLevel ? session.marks : [];
  const hintsUsed = activeForThisLevel ? session.hintsUsedByPassage : {};

  // Only fallacies introduced at or before this level's tier are selectable.
  const tierIndex = tiersById.get(level.tierId)?.index ?? 1;
  const availableFallacies = content.fallacies.filter((f) => f.tier <= tierIndex);

  const currentMark = session.picker
    ? marksForThisLevel.find(
        (m) =>
          m.passageId === session.picker!.passageId &&
          m.scope === session.picker!.scope &&
          m.targetId === session.picker!.targetId,
      )
    : undefined;

  const handleOpenTarget = (target: PickerTarget) => session.openPicker(target);

  const handleApply = (fallacyId: string) => {
    if (!session.picker) return;
    session.setMark(session.picker, fallacyId);
    session.closePicker();
  };

  const handleRemove = () => {
    if (!session.picker) return;
    session.removeMark(session.picker);
    session.closePicker();
  };

  const handleSubmit = () => {
    const submission = buildSubmission(level.id, session.marks, session.hintsUsedByPassage);
    const report = score(submission, variant);
    const newBadges = recordResult(report, level, content);
    setResult(report, newBadges);
    session.clearSession();
    navigate(routes.results(level.id));
  };

  if (phase === 'intro' && level.intro) {
    return (
      <div className="mx-auto max-w-2xl">
        <button className="btn-ghost mb-4" onClick={() => navigate(routes.home())}>
          ← Exit
        </button>
        <div className="card p-6">
          <span className="pill mb-3">Review</span>
          <h1 className="mb-2 text-2xl font-semibold">{level.title}</h1>
          <p className="mb-4 text-ink-600 dark:text-ink-200">{level.intro.description}</p>
          <div className="mb-6 flex flex-wrap gap-2">
            {level.intro.themes.map((t) => (
              <span key={t} className="pill">
                {t}
              </span>
            ))}
          </div>
          <button className="btn-primary px-6" onClick={() => setPhase('play')}>
            Start
          </button>
        </div>
      </div>
    );
  }

  const fallacyCountText = level.showFallacyCount
    ? `Find ${variant.expected.length} ${variant.expected.length === 1 ? 'fallacy' : 'fallacies'}.`
    : 'Mark every fallacy you can find. The count is hidden.';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button className="btn-ghost" onClick={() => navigate(routes.home())}>
          ← Exit
        </button>
        <h1 className="order-last w-full text-lg font-semibold sm:order-none sm:w-auto">
          {level.title}
        </h1>
        <div className="flex items-center gap-1">
          <button className="btn-outline" onClick={() => setHintsOpen(true)}>
            Hint
          </button>
          <button className="btn-outline" onClick={() => session.openGuide()}>
            Guide
          </button>
        </div>
      </div>

      {phase === 'play' ? (
        <>
          <p className="mb-4 text-sm text-ink-500 dark:text-ink-300">{fallacyCountText}</p>
          <div className="space-y-4">
            {variant.passages.map((passage) => (
              <PassageView
                key={passage.id}
                passage={passage}
                marks={marksForThisLevel}
                onOpenTarget={handleOpenTarget}
              />
            ))}
          </div>
          <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-ink-50/90 px-4 py-3 backdrop-blur dark:border-ink-700 dark:bg-ink-900/90">
            <span className="text-sm text-ink-500 dark:text-ink-300">
              {marksForThisLevel.length} mark{marksForThisLevel.length === 1 ? '' : 's'}
            </span>
            <button className="btn-primary px-6" onClick={() => setPhase('review')}>
              Review ▸
            </button>
          </div>
        </>
      ) : (
        <FinalReview
          marks={marksForThisLevel}
          availableFallacies={availableFallacies}
          onSetConfidence={(t, c) => session.setConfidence(t, c)}
          onSetFallacy={(t, fid) => session.setFallacy(t, fid)}
          onRemove={(t) => session.removeMark(t)}
          onBack={() => setPhase('play')}
          onSubmit={handleSubmit}
        />
      )}

      <FallacyPicker
        open={session.picker !== null}
        maxTier={tierIndex}
        currentFallacyId={currentMark?.fallacyId}
        onApply={handleApply}
        onRemove={currentMark ? handleRemove : undefined}
        onClose={() => session.closePicker()}
      />

      <HintsModal
        open={hintsOpen}
        passages={variant.passages}
        hints={variant.hints}
        hintsUsedByPassage={hintsUsed}
        onUseHint={(pid) => session.useHint(pid)}
        onClose={() => setHintsOpen(false)}
      />

      <GuideDrawer open={session.guideOpen} onClose={() => session.closeGuide()} />
    </div>
  );
}
