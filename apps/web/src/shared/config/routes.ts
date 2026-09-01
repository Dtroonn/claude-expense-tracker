/**
 * Central place for route strings that would otherwise be hardcoded across
 * proxy.ts and the auth forms — a typo in either place currently has no compiler
 * check pointing it out.
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
} as const;

export const PROTECTED_PATHS = [ROUTES.dashboard] as const;
