import type { AuthResponseDto, RefreshDto } from '@expense-tracker/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type RefreshOutcome = { ok: true; accessToken: string; refreshToken: string } | { ok: false };

/**
 * Refresh tokens rotate: the backend revokes a presented token before issuing its
 * replacement, so a token can be redeemed exactly once. This map deduplicates
 * concurrent callers presenting the SAME refresh token — a caller awaits the
 * in-flight (or recently-settled, see GRACE_PERIOD_MS below) promise instead of
 * presenting an already-revoked token and getting a spurious 401.
 *
 * Scope: this only helps requests inside this one Node process/module instance.
 * A request that already left the browser with the old cookie before this map's
 * entry is evicted will still present a dead token and get a clean 401 -> logout.
 * That's accepted (single Node instance) — which is exactly why the 401 path must
 * be correct, not just "usually fine": in dev, HMR discards this module's state on
 * every edit, so dedup is effectively untested there.
 */
const inFlight = new Map<string, Promise<RefreshOutcome>>();

/**
 * How long a settled entry stays in the map after its network call finishes.
 * Without this, the map only protects callers that arrive strictly before the
 * backend responds — on localhost that round trip is ~15-40ms, so five calls
 * fired "simultaneously" can still miss each other by a few milliseconds of
 * event-loop/TCP jitter and see the entry already evicted. Keeping the settled
 * result around for a grace window turns that near-miss into a cache hit instead
 * of a second, doomed redemption attempt against an already-revoked token.
 *
 * Side effect, accepted deliberately: presenting this same token value again
 * within the window (not just the true near-simultaneous case) also replays the
 * cached outcome instead of a fresh 401. That doesn't grant access via a dead
 * token in any new way — the response is always the one this exact token value
 * already earned — it just widens "redeemed exactly once" to "exactly once, plus
 * this window of replaying that one outcome."
 */
const GRACE_PERIOD_MS = 15_000;

/**
 * Redeems a refresh token against the backend, deduplicating concurrent callers.
 * Called by both /api/auth/refresh (the only route handler that talks to the
 * backend's refresh endpoint) and, indirectly, by src/proxy.ts (which calls that
 * route handler rather than this function directly — see proxy.ts for why).
 */
export function refreshOnce(refreshToken: string): Promise<RefreshOutcome> {
  const existing = inFlight.get(refreshToken);
  if (existing) return existing;

  const task = (async (): Promise<RefreshOutcome> => {
    try {
      const body: RefreshDto = { refreshToken };
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        // Guarantees this promise always settles, so `finally` always runs and the
        // map entry is never leaked on a wedged backend.
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) return { ok: false };

      // Backend already validates its own response via @ZodResponse — no need to
      // re-parse it here.
      const data = (await res.json()) as AuthResponseDto;
      return {
        ok: true,
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
      };
    } catch {
      return { ok: false };
    }
  })().finally(() => {
    // Don't evict immediately: a caller that started within the jitter window
    // around this settling should still hit the cached outcome rather than
    // presenting the (now dead, because of rotation) token a second time.
    setTimeout(() => inFlight.delete(refreshToken), GRACE_PERIOD_MS).unref();
  });

  inFlight.set(refreshToken, task);
  return task;
}
