const DURATION_UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

/**
 * Parses simple durations like "15m" or "7d" (the same format @nestjs/jwt accepts)
 * into seconds. Mirrors apps/backend/src/auth/token.service.ts's parseDurationMs —
 * not imported from there, since a backend -> web import direction is wrong for this
 * monorepo's dependency graph.
 */
export function parseDurationSeconds(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration);
  const amount = match?.[1];
  const unit = match?.[2];

  if (!amount || !unit) {
    throw new Error(`Invalid duration format: "${duration}"`);
  }

  const unitSeconds = DURATION_UNIT_SECONDS[unit];

  if (!unitSeconds) {
    throw new Error(`Invalid duration unit: "${unit}"`);
  }

  return Number(amount) * unitSeconds;
}

/**
 * How many seconds before the access token's exp the proxy proactively refreshes it.
 * Server Components can't set cookies, so a token that expires mid-render is
 * unrecoverable there — this margin exists to make that impossible in practice.
 * There is no equivalent threshold for the refresh token: it isn't a JWT (see
 * lib/auth/token.ts) and is only ever redeemed once, atomically, by the backend.
 */
export const ACCESS_REFRESH_THRESHOLD_SECONDS = 30;

/**
 * Refresh token cookie lifetime, in seconds. Sourced from the same
 * JWT_REFRESH_EXPIRES_IN the backend uses (see next.config.ts for how the root .env
 * reaches this app), so the cookie and the DB record expire together.
 */
export const REFRESH_TOKEN_MAX_AGE_SECONDS = parseDurationSeconds(
  process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
);
