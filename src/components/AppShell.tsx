import type { ReactNode } from 'react';
import { Link, routes, useRouter } from '../router/router';

const navItems = [
  { to: routes.guide(), label: 'Guide' },
  { to: routes.settings(), label: 'Settings' },
  { to: routes.about(), label: 'About' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { path } = useRouter();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-ink-50/80 backdrop-blur dark:border-ink-700 dark:bg-ink-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link
            to={routes.home()}
            className="flex items-center gap-2 font-semibold tracking-tight"
            aria-label="The Rhetorical Garden home"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink-900 text-accent-400 dark:bg-ink-50">
              R
            </span>
            <span>The Rhetorical Garden</span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="Primary">
            {navItems.map((item) => {
              const active = path === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`btn-ghost ${active ? 'bg-ink-100 dark:bg-ink-700' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-ink-200 py-6 text-center text-xs text-ink-400 dark:border-ink-700">
        The Rhetorical Garden — a practice space for clearer thinking.
      </footer>
    </div>
  );
}
