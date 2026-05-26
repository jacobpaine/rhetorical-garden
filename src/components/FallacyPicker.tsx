import { useMemo, useState } from 'react';
import { content, categoriesById } from '../data/content';
import type { Fallacy } from '../types';
import { Modal } from './Modal';

interface FallacyPickerProps {
  open: boolean;
  /** Highest tier index whose fallacies are selectable (current level's tier). */
  maxTier: number;
  currentFallacyId?: string;
  onApply: (fallacyId: string) => void;
  onRemove?: () => void;
  onClose: () => void;
}

export function FallacyPicker({
  open,
  maxTier,
  currentFallacyId,
  onApply,
  onRemove,
  onClose,
}: FallacyPickerProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | undefined>(currentFallacyId);

  // All categories are shown expanded; only fallacies from the current and
  // earlier tiers are available to select.
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byCat = new Map<string, Fallacy[]>();
    for (const f of content.fallacies) {
      if (f.tier > maxTier) continue;
      if (q && !`${f.formalName} ${f.plainName}`.toLowerCase().includes(q)) continue;
      const list = byCat.get(f.categoryId) ?? [];
      list.push(f);
      byCat.set(f.categoryId, list);
    }
    return content.categories
      .map((c) => [c.id, byCat.get(c.id) ?? []] as const)
      .filter(([, list]) => list.length > 0);
  }, [query, maxTier]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose a fallacy"
      footer={
        <>
          {onRemove && currentFallacyId && (
            <button type="button" className="btn-outline" onClick={onRemove}>
              Remove mark
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            disabled={!selected}
            onClick={() => selected && onApply(selected)}
          >
            Apply
          </button>
        </>
      }
    >
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search fallacies…"
        aria-label="Search fallacies"
        className="mb-3 w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm dark:border-ink-600 dark:bg-ink-900"
      />
      {grouped.length === 0 && (
        <p className="text-sm text-ink-500">No fallacies match your search.</p>
      )}
      <div className="space-y-4">
        {grouped.map(([catId, list]) => (
          <section key={catId}>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
              {categoriesById.get(catId)?.name ?? catId}
            </h3>
            {/* Selections are indented (tabbed) beneath their category. */}
            <ul className="ml-4 space-y-1 border-l border-ink-200 pl-3 dark:border-ink-700">
              {list.map((f) => {
                const active = selected === f.id;
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(f.id)}
                      aria-pressed={active}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition ${
                        active
                          ? 'bg-accent-500/15 text-accent-600 dark:text-accent-400'
                          : 'hover:bg-ink-100 dark:hover:bg-ink-700'
                      }`}
                    >
                      <span className="font-medium">{f.formalName}</span>
                      <span className="text-xs text-ink-400">{f.plainName}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
