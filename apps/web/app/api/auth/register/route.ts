import { NextResponse } from 'next/server';
import type { AuthResponseDto, RegisterDto } from '@expense-tracker/shared';
import { API_URL, proxyErrorResponse } from '@/shared/api';
import { setAuthCookies } from '@/shared/auth';

export async function POST(request: Request) {
  let body: RegisterDto;
  try {
    body = (await request.json()) as RegisterDto;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) return proxyErrorResponse(res);

  // Backend already validates its own response via @ZodResponse — no need to
  // re-parse it here.
  const data = (await res.json()) as AuthResponseDto;
  const response = NextResponse.json({ ok: true });
  setAuthCookies(response, data.tokens);
  return response;
}
