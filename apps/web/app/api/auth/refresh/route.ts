import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACCESS_COOKIE, REFRESH_COOKIE, setAuthCookies } from '@/shared/auth';
import { refreshOnce } from '@/shared/auth/refresh';

/**
 * Public: this is the single implementation of refresh. Both src/proxy.ts (proactive
 * refresh ahead of Server Component renders) and client-side code (e.g. a fetch
 * interceptor reacting to a 401 from a protected request) call this route — neither
 * duplicates its logic.
 *
 * The refresh token is read from the request's own cookie, never from the body: the
 * cookie is httpOnly, so client JS can't read it to put it in a body anyway. Ignoring
 * the body entirely means there's exactly one source of truth and no way to smuggle
 * someone else's token in.
 */
export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    const response = NextResponse.json({ message: 'No refresh token' }, { status: 401 });
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  const outcome = await refreshOnce(refreshToken);

  if (!outcome.ok) {
    // Not clearing cookies here would strand the client in a redirect loop: the
    // stale cookie would keep looking refreshable, and every retry would 401 again.
    const response = NextResponse.json({ message: 'Invalid refresh token' }, { status: 401 });
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  // Tokens never reach the client body — only the Set-Cookie headers carry them.
  const response = NextResponse.json({ ok: true });
  setAuthCookies(response, outcome.tokens);
  return response;
}
