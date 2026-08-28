import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth/cookies';
import { ACCESS_REFRESH_THRESHOLD_SECONDS } from '@/lib/auth/config';
import { secondsUntilExpiry } from '@/lib/auth/token';

/**
 * This is proxy.ts, not middleware.ts: middleware runs on the Edge runtime (its
 * config schema has no `runtime` key to opt out), where module-level state like a
 * refresh dedup map isn't reliable across requests. proxy.ts is middleware's
 * successor and always runs on Node.js.
 *
 * Refresh logic itself lives in POST /api/auth/refresh (see that route), which is
 * also reachable directly by client code. This file just decides WHEN to call it —
 * proactively, before an access token that's about to expire reaches a Server
 * Component, which can't set cookies and so can't recover from a stale token itself.
 */

const PROTECTED_PATHS = ['/dashboard'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function clearAuthCookies(response: NextResponse): void {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  const remaining = accessToken ? secondsUntilExpiry(accessToken) : null;
  const accessUsable = remaining !== null && remaining > ACCESS_REFRESH_THRESHOLD_SECONDS;

  // On /login or /register with a still-usable session, bounce to /dashboard.
  if (accessUsable && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (accessUsable) {
    return NextResponse.next();
  }

  if (refreshToken) {
    const refreshRes = await fetch(new URL('/api/auth/refresh', request.url), {
      method: 'POST',
      headers: { cookie: request.headers.get('cookie') ?? '' },
    });

    if (refreshRes.ok) {
      // Parse the new tokens out of the handler's Set-Cookie so this request's own
      // Server Component render can see them via request.cookies — the handler's
      // response body never carries tokens (see /api/auth/refresh/route.ts).
      for (const setCookie of refreshRes.headers.getSetCookie()) {
        const [pair] = setCookie.split(';');
        const separatorIndex = pair?.indexOf('=') ?? -1;
        if (!pair || separatorIndex === -1) continue;
        const name = pair.slice(0, separatorIndex);
        const value = pair.slice(separatorIndex + 1);
        if (name === ACCESS_COOKIE || name === REFRESH_COOKIE) {
          request.cookies.set(name, value);
        }
      }

      const response = NextResponse.next({ request: { headers: request.headers } });
      for (const setCookie of refreshRes.headers.getSetCookie()) {
        response.headers.append('set-cookie', setCookie);
      }

      if (pathname === '/login' || pathname === '/register') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return response;
    }

    // Refresh failed (401/timeout): clear cookies so the client doesn't loop —
    // a stale cookie would otherwise keep looking refreshable forever.
    if (isProtected(pathname)) {
      const response = redirectToLogin(request);
      clearAuthCookies(response);
      return response;
    }
    const response = NextResponse.next();
    clearAuthCookies(response);
    return response;
  }

  // No usable access token and no refresh token at all.
  if (isProtected(pathname)) {
    const response = redirectToLogin(request);
    if (accessToken) clearAuthCookies(response);
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
