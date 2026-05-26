import { useState } from 'react';
import { levelsById, fallaciesById, fallacyName, content } from '../data/content';
import { useResultStore } from '../store/result';
import { useRouter, routes, Link } from '../router/router';
import { ScoreDial } from '../components/ScoreDial';
import { BadgeChip } from '../components/BadgeChip';
import { badgeDefFor } from '../utils/badges';
import { NotFoundPage } from './NotFoundPage';
import type { MarkResult, ScoreReport } from '../types';

function calibrationText(label: ScoreReport['subscores']['confidenceCalibration']['label']) {
  switch (label) {
    case 'Calibrated':
      return 'Calibrated — your confidence matched your accuracy.';
    case 'Overconfident':
      return 'Overconfident — you were sure on answers that were wrong.';
    case 'Cautious':
      return 'Cautious — you were right but rarely confident.';
    case 'Mixed':
      return 'Mixed — some confident hits, some confident misses.';
    default:
      return 'Not enough marks to judge calibration.';
  }
}

function outcomeChip(mr: MarkResult) {
  if (mr.outcome === 'correct')
    return <span className="badge bg-success-500/15 text-success-500">Correct</span>;
  if (mr.outcome === 'partial')
    return <span className="badge bg-warn-500/15 text-warn-500">Right spot, wrong label</span>;
  return <span className="badge bg-danger-500/15 text-danger-500">False positive</span>;
}

export function ResultsPage({ levelId }: { levelId: string }) {
  const level = levelsById.get(levelId);
  const report = useResultStore((s) => s.lastReport);
  const newBadges = useResultStore((s) => s.newBadges);
  const { navigate } = useRouter();
  const [showMarks, setShowMarks] = useState(true);
  const [showMissed, setShowMissed] = useState(true);

  if (!level) return <NotFoundPage />;

  if (!report || report.levelId !== levelId) {
    return (
      <div className="card p-6 text-center">
        <p className="mb-3">No results to show for this level yet.</p>
        <Link to={routes.play(levelId)} className="btn-primary">
          Play it
        </Link>
      </div>
    );
  }

  const { subscores } = report;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <ScoreDial percent={report.percent} rank={report.rank} />
        <div>
          <h1 className="text-xl font-semibold">Results — {level.title}</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
            Accuracy matters, false positives hurt, hints cost a little, and your
            confidence is weighed in.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Accuracy" value={`${subscores.correctCount}/${subscores.expectedCount}`} />
        <Stat label="False positives" value={String(subscores.falsePositives)} />
        <Stat label="Hints used" value={String(report.hintsUsedTotal)} />
        <Stat label="Confidence" value={subscores.confidenceCalibration.label} />
      </div>

      <p className="text-sm text-ink-500 dark:text-ink-300">
        {calibrationText(subscores.confidenceCalibration.label)}
      </p>

      {newBadges.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-400">
            Badges Earned
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {newBadges.map((b) => (
              <BadgeChip key={b} badge={badgeDefFor(b, content)} isNew />
            ))}
          </div>
        </section>
      )}

      <section className="card overflow-hidden">
        <button
          className="flex w-full items-center justify-between px-4 py-3 text-left font-medium"
          onClick={() => setShowMarks((v) => !v)}
          aria-expanded={showMarks}
        >
          Your marks ({report.markResults.length})
          <span className="text-ink-400">{showMarks ? '−' : '+'}</span>
        </button>
        {showMarks && (
          <ul className="divide-y divide-ink-200 dark:divide-ink-700">
            {report.markResults.length === 0 && (
              <li className="px-4 py-3 text-sm text-ink-400">
                You marked nothing.
                {subscores.expectedCount === 0
                  ? ' On this level, that was the correct call.'
                  : ''}
              </li>
            )}
            {report.markResults.map((mr, i) => (
              <li key={i} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{fallacyName(mr.mark.fallacyId)}</span>
                  {outcomeChip(mr)}
                </div>
                <p className="mt-1 text-xs text-ink-400">
                  Marked at {mr.mark.confidence} confidence.
                </p>
                {mr.outcome === 'partial' && mr.expectedFallacyId && (
                  <p className="mt-1 text-xs">
                    Expected here:{' '}
                    <span className="font-medium">{fallacyName(mr.expectedFallacyId)}</span>.
                  </p>
                )}
                {mr.rationale && <p className="mt-1 text-xs text-ink-500">{mr.rationale}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {report.missed.length > 0 && (
        <section className="card overflow-hidden">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left font-medium"
            onClick={() => setShowMissed((v) => !v)}
            aria-expanded={showMissed}
          >
            Missed ({report.missed.length})
            <span className="text-ink-400">{showMissed ? '−' : '+'}</span>
          </button>
          {showMissed && (
            <ul className="divide-y divide-ink-200 dark:divide-ink-700">
              {report.missed.map((m, i) => (
                <li key={i} className="px-4 py-3 text-sm">
                  <span className="font-medium">
                    {fallaciesById.get(m.expected.fallacyId)?.formalName}
                  </span>
                  <p className="mt-1 text-xs text-ink-500">{m.expected.rationale}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="flex justify-center gap-3">
        <button className="btn-outline" onClick={() => navigate(routes.play(level.id))}>
          Replay
        </button>
        <button className="btn-primary" onClick={() => navigate(routes.home())}>
          Home
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-ink-400">{label}</div>
    </div>
  );
}
