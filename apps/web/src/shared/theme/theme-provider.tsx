'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'theme';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme): void {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Small in-house replacement for next-themes: that package renders its
 * anti-flicker <script> from inside a client component (see the removed
 * dependency), which React 19 now warns about ("Scripts inside React
 * components are never executed when rendering on the client") — true from
 * this component's own client-side re-render onward, even though the very
 * same script tag worked correctly when it arrived as server-rendered HTML.
 * Neither the latest stable (0.4.6) nor the 1.0.0-beta.0 next-themes release
 * fixes this (checked both against the published package). Splitting the
 * concerns fixes it structurally: ThemeScript (a Server Component, see
 * theme-script.tsx) renders the actual <script> as part of the HTML the
 * browser parses, and this provider only manages reactive state after that —
 * it never renders a <script> itself, so there's nothing for React to warn
 * about on re-render.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer, not a state-set-in-effect: `theme` must read as 'system'
  // during SSR/the first client render (the server never knows the visitor's
  // stored preference — that's what would cause a hydration mismatch), and as
  // the real stored value on every render after that. A plain lazy initializer
  // gives both without a synchronous setState-in-effect render cascade: SSR and
  // the initial client render agree (both see `typeof window === 'undefined'`
  // as false only on the client, true on the server — resolved via a guard),
  // and ThemeScript has already set the correct `dark` class on <html> before
  // hydration either way, so there is no visible flash regardless.
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === 'undefined' ? 'system' : readStoredTheme(),
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode, blocked) — theme still applies for this session.
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
