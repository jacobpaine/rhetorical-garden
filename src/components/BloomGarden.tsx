import { useState, type CSSProperties } from 'react';
import { content, levelsForTier, tiersByIndex, tutorialLevels } from '../data/content';
import { isTierUnlocked } from '../utils/progression';
import { nextChallenge } from '../utils/nextChallenge';
import { useProgressStore } from '../store/progress';
import { Link, routes } from '../router/router';
import { TIER_COLOR } from './tierColors';
import type { Level, Tier } from '../types';

// Radial "bloom": the player's next challenge sits at the center hub, and each
// tier is a concentric ring of petals (lessons). Petals bloom — fill with their
// tier color — as lessons are completed; locked outer rings stay as faint buds.
//
// Clickability follows progression: only the "next" challenge petal and any
// already-completed petals (replayable) are clickable. Future petals in the
// same tier are visible but inactive until you reach them. Review tiers are
// always clickable. The center is a shortcut to the next challenge.

const SIZE = 720;
const C = SIZE / 2;
const CORE_R = 50;

const ringRadius = (tierIndex: number) => 84 + (tierIndex - 1) * 31;
// progressive rotation per ring so petals interleave into a bloom (not spokes)
const ringOffsetDeg = (tierIndex: number) => tierIndex * 18;

type PetalState = 'done' | 'next' | 'pending' | 'locked' | 'review-open';

const FLOWER_PETAL_ANGLES = [0, 72, 144, 216, 288];

function FlowerSVG({ state, color }: { state: PetalState; color: string }) {
  // Closed bud + stem — outline only, faint, dashed for locked
  if (state === 'locked' || state === 'pending') {
    const dashed = state === 'locked';
    const stroke = state === 'locked' ? 'currentColor' : color;
    const opacity = state === 'locked' ? 0.6 : 0.7;
    return (
      <svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true">
        <line
          x1="16"
          y1="22"
          x2="16"
          y2="36"
          stroke={stroke}
          strokeWidth="1.2"
          strokeOpacity={opacity - 0.25}
        />
        <path
          d="M16 5 C 9 5 8 18 11 22 C 13 24 19 24 21 22 C 24 18 23 5 16 5 Z"
          fill="none"
          stroke={stroke}
          strokeOpacity={opacity}
          strokeWidth="1.4"
          strokeDasharray={dashed ? '2 2' : undefined}
        />
        <path
          d="M16 32 q -6 -3 -8 -8 q 6 1 8 4"
          fill={state === 'locked' ? 'none' : `${color}22`}
          stroke={stroke}
          strokeOpacity={opacity - 0.2}
          strokeWidth="1"
        />
      </svg>
    );
  }
  // 5-point star burst — review-open ("always blooming")
  if (state === 'review-open') {
    return (
      <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
        <path
          d="M 16 3 L 19 12 L 28 12 L 21 18 L 24 28 L 16 22 L 8 28 L 11 18 L 4 12 L 13 12 Z"
          fill={`${color}22`}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="18" r="2" fill={color} />
      </svg>
    );
  }
  // 5-petal flower: outlined + glow for "next", filled bloom for "done"
  const filled = state === 'done';
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      {FLOWER_PETAL_ANGLES.map((deg) => (
        <g key={deg} transform={`rotate(${deg} 16 16)`}>
          <ellipse
            cx="16"
            cy="8.5"
            rx="3.8"
            ry="6.5"
            fill={filled ? color : `${color}26`}
            stroke={color}
            strokeWidth={filled ? 0.5 : 1.4}
            strokeLinejoin="round"
          />
        </g>
      ))}
      <circle
        cx="16"
        cy="16"
        r={filled ? 3 : 2.6}
        fill={filled ? '#fde68a' : color}
        stroke={filled ? color : 'none'}
        strokeWidth={filled ? 1 : 0}
      />
    </svg>
  );
}

interface PetalModel {
  key: string;
  level: Level;
  tier: Tier;
  x: number;
  y: number;
  deg: number;
  state: PetalState;
  best?: number;
}

function classify(
  level: Level,
  tier: Tier,
  tierUnlocked: boolean,
  completed: Set<string>,
  nextId: string | null,
): PetalState {
  if (completed.has(level.id)) return 'done';
  if (tier.isReview) return 'review-open';
  if (!tierUnlocked) return 'locked';
  if (level.id === nextId) return 'next';
  return 'pending';
}

function buildPetals(
  completed: Set<string>,
  bestByLevel: Record<string, number>,
  nextId: string | null,
): PetalModel[] {
  const petals: PetalModel[] = [];
  for (const tier of tiersByIndex) {
    const lessons = levelsForTier(tier.id);
    if (lessons.length === 0) continue;
    const unlocked = isTierUnlocked(tier, [...completed], content);
    const r = ringRadius(tier.index);
    const n = lessons.length;
    lessons.forEach((level, j) => {
      const deg = -90 + ringOffsetDeg(tier.index) + (360 / n) * j;
      const rad = (deg * Math.PI) / 180;
      petals.push({
        key: level.id,
        level,
        tier,
        x: C + r * Math.cos(rad),
        y: C + r * Math.sin(rad),
        deg,
        state: classify(level, tier, unlocked, completed, nextId),
        best: bestByLevel[level.id],
      });
    });
  }
  return petals;
}

const CLICKABLE: PetalState[] = ['done', 'next', 'review-open'];

function Petal({ p }: { p: PetalModel }) {
  const color = TIER_COLOR[p.tier.index] ?? '#6366f1';
  const isClickable = CLICKABLE.includes(p.state);

  const statusLabel =
    p.state === 'done'
      ? `completed${p.best != null ? ` (${p.best}%)` : ''}`
      : p.state === 'next'
        ? 'your next challenge'
        : p.state === 'review-open'
          ? 'review · always open'
          : p.state === 'pending'
            ? 'not yet'
            : 'locked';

  const label = `${p.level.title} — ${p.tier.name} · ${statusLabel}`;
  const tip = `${p.level.title}${p.state === 'done' && p.best != null ? ` · ${p.best}%` : ''}`;

  const wrapperShadow: CSSProperties =
    p.state === 'done'
      ? { filter: `drop-shadow(0 4px 10px ${color}55)` }
      : p.state === 'next'
        ? { filter: `drop-shadow(0 0 6px ${color}66)` }
        : {};

  const iconClass = `grid place-items-center transition-transform ${
    isClickable ? 'hover:scale-110' : ''
  } ${p.state === 'next' ? 'animate-pulse' : ''} ${
    p.state === 'pending' ? 'opacity-70' : ''
  } ${p.state === 'locked' ? 'opacity-60 text-ink-400 dark:text-ink-600' : ''}`;

  const icon = (
    <div className={iconClass} style={wrapperShadow}>
      <FlowerSVG state={p.state} color={color} />
    </div>
  );

  return (
    <div
      className="group absolute"
      style={{ left: p.x, top: p.y, transform: 'translate(-50%, -50%)' }}
    >
      {isClickable ? (
        <Link
          to={routes.play(p.level.id)}
          aria-label={label}
          className="block rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          {icon}
        </Link>
      ) : (
        <div aria-label={label} role="img">
          {icon}
        </div>
      )}
      <span className="pointer-events-none absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-[calc(100%+6px)] whitespace-nowrap rounded-md bg-ink-900 px-2 py-1 text-[11px] font-medium text-ink-50 opacity-0 shadow-card transition group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-ink-50 dark:text-ink-900">
        {tip}
      </span>
    </div>
  );
}

function RingTooltip({ tierIndex }: { tierIndex: number | null }) {
  if (tierIndex == null) return null;
  const tier = tiersByIndex.find((t) => t.index === tierIndex);
  if (!tier) return null;
  const r = ringRadius(tier.index);
  const color = TIER_COLOR[tier.index];
  const lessons = levelsForTier(tier.id);
  const introduced = content.fallacies
    .filter((f) => f.tier === tier.index)
    .map((f) => f.formalName);
  // place above the ring when there's room, otherwise below
  const placeAbove = C - r > 96;
  const top = placeAbove ? C - r - 10 : C + r + 10;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-50 w-60 rounded-md bg-ink-900 px-3 py-2 text-[11px] text-ink-50 shadow-card animate-[fade-in_.12s_ease-out] dark:bg-ink-50 dark:text-ink-900"
      style={{
        left: C,
        top,
        transform: placeAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="font-semibold">{tier.name}</span>
        {tier.isReview && (
          <span className="ml-auto rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
            Always open
          </span>
        )}
      </div>
      <p className="mt-1 opacity-80">{tier.description}</p>
      {introduced.length > 0 && (
        <p className="mt-1.5">
          <span className="opacity-60">Introduces: </span>
          {introduced.join(', ')}
        </p>
      )}
      <p className="mt-0.5 opacity-60">
        {lessons.length} lesson{lessons.length === 1 ? '' : 's'}
      </p>
    </div>
  );
}

export function BloomGarden() {
  const completedLevelIds = useProgressStore((s) => s.completedLevelIds);
  const bestByLevel = useProgressStore((s) => s.bestScoreByLevel);
  const completed = new Set(completedLevelIds);
  const [hoveredTier, setHoveredTier] = useState<number | null>(null);

  const next = nextChallenge(content, completed);
  const petals = buildPetals(completed, bestByLevel, next?.id ?? null);

  const tutorial = tutorialLevels[0];
  const tutorialDone = tutorial ? completed.has(tutorial.id) : false;
  const clearedCount = completedLevelIds.filter((id) => id !== tutorial?.id).length;

  const nextIsTutorial = next?.kind === 'tutorial';
  const coreAriaLabel = !next
    ? 'Garden in full bloom'
    : nextIsTutorial
      ? 'Start the tutorial'
      : `Next challenge: ${next.title}`;

  // Find the "next" petal's screen position so a brighter guiding stem can be
  // drawn — even when the next is the tutorial (no petal), the center pulses.
  const nextPetal = next ? petals.find((p) => p.key === next.id) : undefined;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          className="absolute inset-0"
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
        >
          {petals.map((p) => (
            <line
              key={`stem-${p.key}`}
              x1={C}
              y1={C}
              x2={p.x}
              y2={p.y}
              stroke={p.state === 'locked' ? 'currentColor' : TIER_COLOR[p.tier.index]}
              strokeOpacity={p.state === 'locked' ? 0.08 : p.state === 'next' ? 0.55 : 0.22}
              strokeWidth={p.state === 'next' ? 2 : 1.5}
              className="text-ink-400"
            />
          ))}
          {nextPetal && (
            <circle
              cx={nextPetal.x}
              cy={nextPetal.y}
              r={26}
              fill="none"
              stroke={TIER_COLOR[nextPetal.tier.index]}
              strokeOpacity={0.35}
              strokeWidth={1.5}
            />
          )}
          {tiersByIndex
            .filter((t) => levelsForTier(t.id).length > 0)
            .map((t) => {
              const r = ringRadius(t.index);
              const color = TIER_COLOR[t.index];
              const isHover = hoveredTier === t.index;
              return (
                <g key={`ring-${t.id}`}>
                  <circle
                    cx={C}
                    cy={C}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeOpacity={isHover ? 0.95 : t.isReview ? 0.7 : 0.55}
                    strokeDasharray={t.isReview ? '4 8' : undefined}
                    strokeWidth={isHover ? 3 : t.isReview ? 2 : 1.75}
                    style={{ transition: 'stroke-opacity .15s, stroke-width .15s' }}
                  />
                  {/* invisible thick stroke as the hover hit-target */}
                  <circle
                    cx={C}
                    cy={C}
                    r={r}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    style={{ pointerEvents: 'stroke', cursor: 'help' }}
                    onMouseEnter={() => setHoveredTier(t.index)}
                    onMouseLeave={() =>
                      setHoveredTier((h) => (h === t.index ? null : h))
                    }
                  />
                </g>
              );
            })}
        </svg>

        {petals.map((p) => (
          <Petal key={p.key} p={p} />
        ))}

        <RingTooltip tierIndex={hoveredTier} />

        {/* core / Next Challenge shortcut */}
        <div
          className="absolute"
          style={{ left: C, top: C, transform: 'translate(-50%, -50%)' }}
        >
          {next ? (
            <Link
              to={routes.play(next.id)}
              aria-label={coreAriaLabel}
              className={`grid place-items-center rounded-full bg-gradient-to-b from-ink-800 to-ink-900 text-ink-50 shadow-card transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 dark:from-ink-100 dark:to-ink-200 dark:text-ink-900 ${
                nextIsTutorial ? 'animate-pulse' : ''
              }`}
              style={{ width: CORE_R * 2, height: CORE_R * 2 }}
            >
              <div className="px-2 text-center leading-tight">
                <div className="text-[9px] uppercase tracking-wider opacity-70">
                  {nextIsTutorial ? 'tutorial' : 'next challenge'}
                </div>
                <div className="mt-0.5 text-[11px] font-semibold">
                  {nextIsTutorial ? 'Start' : truncate(next.title, 18)}
                </div>
                {tutorialDone && !nextIsTutorial && (
                  <div className="mt-1 text-[9px] uppercase tracking-wider opacity-50">
                    {clearedCount} cleared
                  </div>
                )}
              </div>
            </Link>
          ) : (
            <div
              role="status"
              aria-label={coreAriaLabel}
              className="grid place-items-center rounded-full bg-gradient-to-b from-ink-800 to-ink-900 text-ink-50 shadow-card dark:from-ink-100 dark:to-ink-200 dark:text-ink-900"
              style={{ width: CORE_R * 2, height: CORE_R * 2 }}
            >
              <div className="text-center leading-tight">
                <div className="text-[16px]">🌼</div>
                <div className="text-[10px] uppercase tracking-wide opacity-70">
                  in bloom
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-ink-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-accent-500" /> completed
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-accent-500" /> next
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-accent-500/30" /> not yet
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-ink-300" /> locked
        </span>
        <span className="flex items-center gap-1">★ review · always open</span>
      </div>

      {tutorialDone && tutorial && (
        <Link
          to={routes.play(tutorial.id)}
          aria-label="Replay the tutorial"
          className="mt-3 text-xs text-ink-400 underline-offset-4 hover:text-ink-700 hover:underline dark:hover:text-ink-100"
        >
          Replay the tutorial
        </Link>
      )}
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
