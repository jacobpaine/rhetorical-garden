import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

// Tiny history-aware router. Avoids adding react-router as a dependency.
// Routes are simple paths: '/', '/about', '/settings', '/guide', '/play/:id',
// '/results/:id'. Back/forward work because we use the History API + popstate.

interface RouterContextValue {
  path: string;
  /** Increments on every navigation (push/replace/back/forward). Stable within
   *  a single navigation, so it can key per-navigation decisions. */
  navId: number;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
  back: () => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname || '/');
  const [navId, setNavId] = useState(0);

  useEffect(() => {
    const onPop = () => {
      setPath(window.location.pathname || '/');
      setNavId((n) => n + 1);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback<RouterContextValue['navigate']>((to, opts) => {
    if (to === window.location.pathname) return;
    if (opts?.replace) window.history.replaceState({}, '', to);
    else window.history.pushState({}, '', to);
    setPath(to);
    setNavId((n) => n + 1);
    window.scrollTo(0, 0);
  }, []);

  const back = useCallback(() => window.history.back(), []);

  const value = useMemo(
    () => ({ path, navId, navigate, back }),
    [path, navId, navigate, back],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}

/** Match a path against a pattern with a single trailing :param. */
export function matchRoute(
  path: string,
  pattern: string,
): { params: Record<string, string> } | null {
  const pSeg = pattern.split('/').filter(Boolean);
  const aSeg = path.split('/').filter(Boolean);
  if (pSeg.length !== aSeg.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pSeg.length; i++) {
    if (pSeg[i].startsWith(':')) {
      params[pSeg[i].slice(1)] = decodeURIComponent(aSeg[i]);
    } else if (pSeg[i] !== aSeg[i]) {
      return null;
    }
  }
  return { params };
}

export const routes = {
  home: () => '/',
  about: () => '/about',
  settings: () => '/settings',
  guide: () => '/guide',
  play: (levelId: string) => `/play/${encodeURIComponent(levelId)}`,
  results: (levelId: string) => `/results/${encodeURIComponent(levelId)}`,
};

interface LinkProps {
  to: string;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
  'aria-label'?: string;
}

export function Link({ to, className, children, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
