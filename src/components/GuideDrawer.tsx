import { useEffect } from 'react';
import { GuideBrowser } from './GuideBrowser';

export function GuideDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-label="Fallacy guide"
        className="h-full w-full max-w-md overflow-y-auto bg-ink-50 p-4 shadow-card dark:bg-ink-900 animate-[slide-in_.18s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Fallacy Guide</h2>
          <button
            type="button"
            className="btn-ghost px-2 py-1 text-lg leading-none"
            onClick={onClose}
            aria-label="Close guide"
          >
            ×
          </button>
        </div>
        <p className="mb-3 text-xs text-ink-400">
          Reference only — picking an entry here does not answer the level.
        </p>
        <GuideBrowser compact />
      </aside>
    </div>
  );
}
