import type { NextResponse } from 'next/server';
import type { AuthResponseDto } from '@expense-tracker/shared';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from './cookies';
import { secondsUntilExpiry } from './token';

/**
 * Shared by every route handler that redeems tokens against the backend
 * (login, register, refresh) — they differ only in how they obtain the tokens,
 * not in how the resulting cookies get set.
 */
export function setAuthCookies(response: NextResponse, tokens: AuthResponseDto['tokens']): void {
  const maxAge = secondsUntilExpiry(tokens.accessToken) ?? 0;
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, accessCookieOptions(maxAge));
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions());
}
