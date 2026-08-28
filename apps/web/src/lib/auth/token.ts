import { jwtDecode } from 'jwt-decode';
import type { UserResponseDto } from '@expense-tracker/shared';

interface AccessTokenClaims {
  user: UserResponseDto;
  iat: number;
  exp: number;
}

/**
 * Decodes the access token's payload without verifying its signature. That's
 * deliberate: this module is never an authorization boundary, only a way for the
 * proxy/session code to read the embedded user and exp for display and refresh
 * timing. The backend's JwtAuthGuard is what actually verifies the signature on
 * every real request.
 */
export function decodeAccessToken(token: string): AccessTokenClaims | null {
  try {
    const claims = jwtDecode<AccessTokenClaims>(token);
    // jwtDecode's generic is an assertion, not validation — check exp ourselves.
    if (typeof claims.exp !== 'number') return null;
    return claims;
  } catch {
    return null; // InvalidTokenError on a malformed token
  }
}

/** Seconds remaining until the access token's exp, or null if it's missing/malformed. */
export function secondsUntilExpiry(token: string): number | null {
  const claims = decodeAccessToken(token);
  if (!claims) return null;
  return claims.exp - Math.floor(Date.now() / 1000);
}
