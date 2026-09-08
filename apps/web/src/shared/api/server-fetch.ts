import { cookies } from 'next/headers';
import { ACCESS_COOKIE } from '@/shared/auth';
import { API_URL } from './config';

/**
 * Thrown when there's no usable access cookie, or the backend itself rejects the
 * token with 401. Callers decide the routing response (typically `redirect(ROUTES.login)`);
 * this module stays free of route policy.
 */
export class UnauthorizedError extends Error {}

/**
 * Authenticated server-side fetch against the backend. Reads the httpOnly access
 * cookie via `cookies()` (Server Component / Route Handler only) and attaches it
 * as a Bearer token — nothing else in the repo does this yet.
 *
 * Deliberately does NOT attempt to refresh on a stale/expired token: a Server
 * Component's `cookies()` is read-only, so refreshing here would revoke the old
 * rotating refresh token on the backend and then be unable to persist the new
 * one, permanently logging the user out. Proactive refresh instead happens in
 * proxy.ts, before render — see its matcher for which routes get it. If a route
 * that calls this ends up outside that matcher, requests here will start 401ing
 * once the access token expires.
 *
 * No explicit `cache: 'no-store'` here: reading the cookie via `cookies()` already
 * opts the request into Next's dynamic rendering, which excludes it from the fetch
 * cache without needing the option spelled out.
 */
export async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!accessToken) throw new UnauthorizedError();

  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${path}`);

  // The backend already validates its own responses (@ZodResponse); parsing
  // again here would be redundant work, not extra safety — see CLAUDE.md's
  // shared-contract section.
  return (await res.json()) as T;
}
