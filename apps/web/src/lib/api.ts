export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Forwards the backend's error status and body verbatim. The backend returns two
 * different Nest/nestjs-zod error envelope shapes ({statusCode,message,error} vs
 * {statusCode,message,errors:[...]}) — proxying the body as-is avoids having to
 * know or reconstruct either shape here.
 */
export async function proxyErrorResponse(res: Response): Promise<Response> {
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}
