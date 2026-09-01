import type { RegisterDto } from '@expense-tracker/shared';

export async function register(body: RegisterDto): Promise<Response> {
  return fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
