import type { LoginFormValues } from '../model/schema';

export async function login(values: LoginFormValues): Promise<Response> {
  return fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values),
  });
}
