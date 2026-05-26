import { useRef, useState } from 'react';
import { useSettingsStore } from '../store/settings';
import { useProgressStore } from '../store/progress';
import { content } from '../data/content';
import { Modal } from '../components/Modal';
import { BadgeChip } from '../components/BadgeChip';
import { badgeDefFor } from '../utils/badges';
import {
  buildExportBundle,
  downloadJSON,
  parseImportBundle,
  ImportError,
} from '../utils/transfer';
import type { Theme } from '../types';

const themes: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsPage() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const replaceSettings = useSettingsStore((s) => s.replaceSettings);

  const progress = useProgressStore((s) => s.snapshot());
  const resetAll = useProgressStore((s) => s.resetAll);
  const replaceProgress = useProgressStore((s) => s.replaceProgress);

  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const handleExport = () => {
    downloadJSON('rhetorical-garden-progress.json', buildExportBundle(progress, { theme }));
    setMessage({ kind: 'ok', text: 'Progress exported.' });
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const { progress: p, settings: s } = parseImportBundle(text);
      replaceProgress(p);
      replaceSettings(s);
      setMessage({ kind: 'ok', text: 'Progress imported.' });
    } catch (e) {
      setMessage({
        kind: 'err',
        text: e instanceof ImportError ? e.message : 'Could not import that file.',
      });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Theme</h2>
        <div className="flex gap-2">
          {themes.map((t) => (
            <button
              key={t.value}
              className={theme === t.value ? 'btn-primary' : 'btn-outline'}
              aria-pressed={theme === t.value}
              onClick={() => setTheme(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Progress</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline" onClick={handleExport}>
            Export progress (JSON)
          </button>
          <button className="btn-outline" onClick={() => fileRef.current?.click()}>
            Import progress…
          </button>
          <button className="btn-outline text-danger-500" onClick={() => setConfirmReset(true)}>
            Reset progress…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Import progress file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
            }}
          />
        </div>
        {message && (
          <p
            className={`mt-3 text-sm ${
              message.kind === 'ok' ? 'text-success-500' : 'text-danger-500'
            }`}
            role="status"
          >
            {message.text}
          </p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <Stat label="Levels completed" value={progress.completedLevelIds.length} />
          <Stat label="Hints used (total)" value={progress.hintsUsedTotal} />
          <Stat label="Badges" value={progress.badges.length} />
        </dl>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Badges</h2>
        {progress.badges.length === 0 ? (
          <p className="text-sm text-ink-400">No badges yet — clear a level to start earning them.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {progress.badges.map((b) => (
              <BadgeChip key={b} badge={badgeDefFor(b, content)} />
            ))}
          </div>
        )}
      </section>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset all progress?"
        footer={
          <>
            <button className="btn-outline" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
            <button
              className="btn-primary bg-danger-500 text-white hover:bg-danger-500/90 dark:bg-danger-500 dark:text-white"
              onClick={() => {
                resetAll();
                setConfirmReset(false);
                setMessage({ kind: 'ok', text: 'Progress reset.' });
              }}
            >
              Reset everything
            </button>
          </>
        }
      >
        <p className="text-sm text-ink-600 dark:text-ink-200">
          This permanently deletes your completed levels, scores, badges, and stats from
          this browser. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-ink-400">{label}</div>
    </div>
  );
}
