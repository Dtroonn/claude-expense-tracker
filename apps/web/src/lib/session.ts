import { cookies } from 'next/headers';
import type { UserResponseDto } from '@expense-tracker/shared';
import { ACCESS_COOKIE } from '@/lib/auth/cookies';
import { decodeAccessToken } from '@/lib/auth/token';

/**
 * Reads the current user from the access cookie. Deliberately does NOT refresh: in a
 * Server Component, cookies() is read-only, so a refresh here would revoke the old
 * refresh token on the backend and then fail to persist the new one — the user would
 * be permanently logged out instead of refreshed. Proactive refresh instead lives in
 * src/proxy.ts, the one place that runs before render and can write cookies, so by
 * the time a Server Component runs, the access cookie should already be fresh.
 */
export async function getSession(): Promise<UserResponseDto | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return null;

  const claims = decodeAccessToken(accessToken);
  return claims?.user ?? null;
}
