import { useEffect } from 'react';
import { RouterProvider, matchRoute, useRouter } from './router/router';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { SettingsPage } from './pages/SettingsPage';
import { GuidePage } from './pages/GuidePage';
import { PlayPage } from './pages/PlayPage';
import { ResultsPage } from './pages/ResultsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { applyTheme, useSettingsStore } from './store/settings';

function Routes() {
  const { path } = useRouter();

  if (path === '/' || path === '') return <HomePage />;
  if (path === '/about') return <AboutPage />;
  if (path === '/settings') return <SettingsPage />;
  if (path === '/guide') return <GuidePage />;

  const play = matchRoute(path, '/play/:id');
  if (play) return <PlayPage levelId={play.params.id} />;

  const results = matchRoute(path, '/results/:id');
  if (results) return <ResultsPage levelId={results.params.id} />;

  return <NotFoundPage />;
}

function ThemeEffect() {
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    applyTheme(theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(theme);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);
  return null;
}

export function App() {
  return (
    <RouterProvider>
      <ThemeEffect />
      <AppShell>
        <Routes />
      </AppShell>
    </RouterProvider>
  );
}
