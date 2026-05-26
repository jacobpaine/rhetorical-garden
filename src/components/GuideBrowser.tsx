import { useMemo, useState } from 'react';
import { content, categoriesById, tiersByIndex } from '../data/content';
import { TIER_COLOR } from './tierColors';
import type { Fallacy } from '../types';

function matches(f: Fallacy, q: string): boolean {
  if (!q) return true;
  const hay = `${f.formalName} ${f.plainName} ${f.definition}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

interface GuideBrowserProps {
  compact?: boolean;
}

/**
 * Read-only fallacy guide with search, category + tier filters, used both on
 * the full Guide page and inside the in-level drawer. Each entry surfaces the
 * tier in which the fallacy becomes selectable, with a matching color dot so
 * the connection to the dashboard's tier rings is visible.
 */
export function GuideBrowser({ compact }: GuideBrowserProps) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all'); // 'all' | tier index
  const [openId, setOpenId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const filtered = content.fallacies.filter((f) => {
      if (!matches(f, query)) return false;
      if (categoryId !== 'all' && f.categoryId !== categoryId) return false;
      if (tierFilter !== 'all' && String(f.tier) !== tierFilter) return false;
      return true;
    });
    const byCat = new Map<string, Fallacy[]>();
    for (const f of filtered) {
      const list = byCat.get(f.categoryId) ?? [];
      list.push(f);
      byCat.set(f.categoryId, list);
    }
    // sort each category's fallacies by introduction tier (ascending)
    for (const list of byCat.values()) list.sort((a, b) => a.tier - b.tier);
    return [...byCat.entries()];
  }, [query, categoryId, tierFilter]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search fallacies…"
          aria-label="Search fallacies"
          className="flex-1 rounded-md border border-ink-300 bg-white px-3 py-2 text-sm dark:border-ink-600 dark:bg-ink-900"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Filter by category"
          className="rounded-md border border-ink-300 bg-white px-3 py-2 text-sm dark:border-ink-600 dark:bg-ink-900"
        >
          <option value="all">All categories</option>
          {content.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          aria-label="Filter by tier"
          className="rounded-md border border-ink-300 bg-white px-3 py-2 text-sm dark:border-ink-600 dark:bg-ink-900"
        >
          <option value="all">All tiers</option>
          {tiersByIndex.map((t) => (
            <option key={t.id} value={t.index}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {grouped.length === 0 && (
        <p className="text-sm text-ink-500">No fallacies match your filters.</p>
      )}

      <div className="space-y-5">
        {grouped.map(([catId, list]) => (
          <section key={catId}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
              {categoriesById.get(catId)?.name ?? catId}
            </h3>
            <ul className="space-y-2">
              {list.map((f) => {
                const open = openId === f.id;
                const tier = tiersByIndex.find((t) => t.index === f.tier);
                const color = TIER_COLOR[f.tier] ?? '#6366f1';
                return (
                  <li key={f.id} className="card overflow-hidden">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : f.id)}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{f.formalName}</span>
                        <span className="text-xs text-ink-400">({f.plainName})</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                          style={{ backgroundColor: `${color}1f`, color }}
                          title={`Introduced in ${tier?.name ?? `Tier ${f.tier}`}`}
                        >
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          {tier?.name ?? `Tier ${f.tier}`}
                        </span>
                        <span className="text-ink-400">{open ? '−' : '+'}</span>
                      </span>
                    </button>
                    {open && (
                      <div className="space-y-3 border-t border-ink-200 px-3 py-3 text-sm dark:border-ink-700">
                        <p>{f.definition}</p>
                        <p className="italic text-ink-500 dark:text-ink-300">
                          Example: {f.example}
                        </p>
                        {!compact && (
                          <>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                                Look for
                              </p>
                              <ul className="ml-4 list-disc">
                                {f.lookFor.map((x, i) => (
                                  <li key={i}>{x}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                                Common confusions
                              </p>
                              <ul className="ml-4 list-disc">
                                {f.commonConfusions.map((x, i) => (
                                  <li key={i}>{x}</li>
                                ))}
                              </ul>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
