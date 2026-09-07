// Note: `server-fetch.ts` is deliberately NOT re-exported here. It's server-only
// (reads httpOnly cookies via next/headers) — the exclusion doesn't *prevent* a
// client component from importing it (a deep import would compile the same way;
// nothing here enforces that), it just keeps it out of the graph that a client
// component pulls in by importing something else from this barrel. The actual
// hard boundary is next/headers itself, which fails to bundle for the client.
// Consumers import it directly via '@/shared/api/server-fetch'.
export { API_URL } from './config';
export { proxyErrorResponse } from './proxy-error';
