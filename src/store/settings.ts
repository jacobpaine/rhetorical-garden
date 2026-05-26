import { create } from 'zustand';
import type { SettingsState, Theme } from '../types';
import { loadJSON, saveJSON } from '../utils/storage';

export const SETTINGS_KEY = 'rg.settings.v1';

export const defaultSettings: SettingsState = { theme: 'system' };

interface SettingsStore extends SettingsState {
  setTheme: (theme: Theme) => void;
  replaceSettings: (s: SettingsState) => void;
}

function persist(state: SettingsState) {
  saveJSON(SETTINGS_KEY, state);
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...(loadJSON<SettingsState>(SETTINGS_KEY) ?? defaultSettings),

  setTheme: (theme) => {
    set({ theme });
    persist({ theme: get().theme });
  },

  replaceSettings: (s) => {
    set({ theme: s.theme });
    persist({ theme: s.theme });
  },
}));

/** Apply theme to <html> class. Called from a small effect in AppShell. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const prefersDark =
    globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', dark);
}
