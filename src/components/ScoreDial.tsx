import { useEffect, useState } from 'react';
import type { RankLabel } from '../types';

const rankColor: Record<RankLabel, string> = {
  Excellent: 'text-success-500',
  Good: 'text-accent-500',
  'Needs Review': 'text-warn-500',
  'Try Again': 'text-danger-500',
};

export function ScoreDial({ percent, rank }: { percent: number; rank: RankLabel }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 700;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(eased * percent));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [percent]);

  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (shown / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            strokeWidth="10"
            className="stroke-ink-200 dark:stroke-ink-700"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className={`${rankColor[rank]} transition-[stroke-dashoffset] duration-100`}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-3xl font-bold tabular-nums">{shown}%</span>
        </div>
      </div>
      <p className={`mt-2 text-lg font-semibold ${rankColor[rank]}`}>{rank}</p>
    </div>
  );
}
