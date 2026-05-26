import type { ExportBundle, ProgressState, SettingsState } from '../types';
import { emptyProgress } from '../store/progress';
import { defaultSettings } from '../store/settings';

export const EXPORT_VERSION = 1;

export function buildExportBundle(
  progress: ProgressState,
  settings: SettingsState,
): ExportBundle {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    progress,
    settings,
  };
}

export class ImportError extends Error {}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * Parses and validates an imported bundle, filling any missing fields with
 * defaults. Throws ImportError on clearly malformed input.
 */
export function parseImportBundle(text: string): {
  progress: ProgressState;
  settings: SettingsState;
} {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('That file is not valid JSON.');
  }

  if (!isObject(data)) throw new ImportError('Expected a JSON object.');
  if (!isObject(data.progress)) {
    throw new ImportError('Missing "progress" section.');
  }

  const p = data.progress as Partial<ProgressState>;
  const progress: ProgressState = {
    ...emptyProgress,
    ...p,
    confidenceStats: { ...emptyProgress.confidenceStats, ...(p.confidenceStats ?? {}) },
    bestScoreByLevel: { ...(p.bestScoreByLevel ?? {}) },
    attemptsByLevel: { ...(p.attemptsByLevel ?? {}) },
    fallacyStats: { ...(p.fallacyStats ?? {}) },
    completedLevelIds: Array.isArray(p.completedLevelIds) ? p.completedLevelIds : [],
    badges: Array.isArray(p.badges) ? p.badges : [],
  };

  const s = isObject(data.settings) ? (data.settings as Partial<SettingsState>) : {};
  const theme = s.theme;
  const settings: SettingsState = {
    theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : defaultSettings.theme,
  };

  return { progress, settings };
}

export function downloadJSON(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
