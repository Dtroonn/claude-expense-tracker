export async function logout(): Promise<Response> {
  return fetch('/api/auth/logout', { method: 'POST' });
}
