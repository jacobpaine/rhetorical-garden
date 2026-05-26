import {
  content,
  levelsForTier,
  tiersByIndex,
  tutorialLevels,
} from '../data/content';
import { useProgressStore } from '../store/progress';
import { isTierUnlocked, nextTierRequirementText } from '../utils/progression';
import { Link, routes } from '../router/router';
import { BloomGarden } from '../components/BloomGarden';
import type { Level } from '../types';

function LevelCard({
  level,
  completed,
  best,
  locked,
}: {
  level: Level;
  completed: boolean;
  best?: number;
  locked?: boolean;
}) {
  const inner = (
    <div
      className={`card h-full p-4 transition ${
        locked ? 'opacity-60' : 'hover:-translate-y-0.5 hover:shadow-lg'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="pill capitalize">{level.kind}</span>
        {completed ? (
          <span className="badge">Done · {best}%</span>
        ) : locked ? (
          <span className="pill">Locked</span>
        ) : (
          <span className="pill border-accent-500 text-accent-600 dark:text-accent-400">
            New
          </span>
        )}
      </div>
      <h3 className="font-semibold">{level.title}</h3>
      <p className="mt-1 text-xs text-ink-400">
        {content.tiers.find((t) => t.id === level.tierId)?.name}
      </p>
    </div>
  );

  if (locked) return <div aria-disabled>{inner}</div>;
  return (
    <Link to={routes.play(level.id)} aria-label={`Play ${level.title}`}>
      {inner}
    </Link>
  );
}

export function HomePage() {
  const completedLevelIds = useProgressStore((s) => s.completedLevelIds);
  const bestScoreByLevel = useProgressStore((s) => s.bestScoreByLevel);
  const completed = new Set(completedLevelIds);

  return (
    <div className="space-y-8">
      <section className="text-center md:text-left">
        <h1 className="text-2xl font-bold tracking-tight">Tend your garden of reasoning.</h1>
        <p className="mt-1 text-ink-500 dark:text-ink-300">
          Each petal is a lesson and each ring is a tier. Clear lessons to make the
          flower bloom outward — start from the seed at the center.
        </p>
      </section>

      {/* Radial bloom for tablet/desktop */}
      <div className="hidden justify-center py-2 md:flex">
        <BloomGarden />
      </div>

      {/* Stacked fallback for phones */}
      <div className="space-y-8 md:hidden">
        {tutorialLevels.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">
              Start Here
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {tutorialLevels.map((level) => (
                <LevelCard
                  key={level.id}
                  level={level}
                  completed={completed.has(level.id)}
                  best={bestScoreByLevel[level.id]}
                />
              ))}
            </div>
          </section>
        )}

        {tiersByIndex.map((tier) => {
        const levels = levelsForTier(tier.id);
        const unlocked = isTierUnlocked(tier, completedLevelIds, content);
        const done = levels.filter((l) => completed.has(l.id)).length;
        return (
          <section key={tier.id}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-400">
                {tier.name}
                {tier.isReview && <span className="badge">Always open</span>}
                {levels.length > 0 && unlocked && (
                  <span className="normal-case text-ink-400">
                    {done}/{levels.length} complete
                  </span>
                )}
              </h2>
              {!unlocked && (
                <span className="text-xs text-ink-400">
                  Locked · {nextTierRequirementText(tier, content)}
                </span>
              )}
            </div>
            {levels.length === 0 ? (
              <p className="text-sm text-ink-400">No levels here yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {levels.map((level) => (
                  <LevelCard
                    key={level.id}
                    level={level}
                    completed={completed.has(level.id)}
                    best={bestScoreByLevel[level.id]}
                    locked={!unlocked}
                  />
                ))}
              </div>
            )}
          </section>
        );
        })}
      </div>
    </div>
  );
}
