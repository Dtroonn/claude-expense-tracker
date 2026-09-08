/**
 * Central place for route strings that would otherwise be hardcoded across
 * proxy.ts and the auth forms — a typo in either place currently has no compiler
 * check pointing it out.
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  categories: '/categories',
  profile: '/profile',
} as const;

/**
 * proxy.ts's `matcher` must independently cover every one of these paths — the
 * matcher has to be statically analysable, so it can't be derived from this
 * array. If a route is added here without a matching matcher entry, that route
 * won't get its proactive token refresh (see proxy.ts and shared/api/server-fetch.ts),
 * and requests from it will start failing once the access token goes stale.
 */
export const PROTECTED_PATHS = [ROUTES.home, ROUTES.categories, ROUTES.profile] as const;
