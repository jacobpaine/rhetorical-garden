import type { BadgeDef } from '../utils/badges';

export function BadgeChip({ badge, isNew }: { badge: BadgeDef; isNew?: boolean }) {
  return (
    <div
      className={`card flex items-start gap-3 p-3 ${
        isNew ? 'ring-2 ring-accent-500 animate-[fade-in_.3s_ease-out]' : ''
      }`}
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-400">
        ★
      </div>
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {badge.name}
          {isNew && <span className="badge">New</span>}
        </div>
        <p className="text-xs text-ink-500 dark:text-ink-300">{badge.description}</p>
      </div>
    </div>
  );
}
