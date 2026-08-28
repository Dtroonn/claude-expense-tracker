import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { RefreshDto } from '@expense-tracker/shared';
import { API_URL } from '@/lib/api';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth/cookies';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    try {
      const body: RefreshDto = { refreshToken };
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // Best-effort server-side revocation — the cookies are cleared regardless,
      // which is the part that actually matters for this browser's session.
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
