import { REFRESH_TOKEN_MAX_AGE_SECONDS } from './config';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

interface CookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
}

function baseCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    // Only require HTTPS in production — on http://localhost the cookie would
    // otherwise be silently dropped by the browser.
    secure: process.env.NODE_ENV === 'production',
    // 'lax', not 'strict': a 'strict' cookie isn't sent on top-level navigation
    // from an external link, which would always bounce the user to /login.
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

/** maxAge comes from the access token's own `exp` (see lib/auth/token.ts), never `expiresIn`. */
export function accessCookieOptions(accessTokenMaxAgeSeconds: number): CookieOptions {
  return baseCookieOptions(accessTokenMaxAgeSeconds);
}

export function refreshCookieOptions(): CookieOptions {
  return baseCookieOptions(REFRESH_TOKEN_MAX_AGE_SECONDS);
}
