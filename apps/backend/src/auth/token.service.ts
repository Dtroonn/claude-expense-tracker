import { randomBytes, createHash } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { type AuthTokensDto, type UserResponseDto } from '@expense-tracker/shared';
import { RefreshTokenRepository } from './refresh-token.repository';

const REFRESH_TOKEN_BYTES = 32;

const DURATION_UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Parses simple durations like "15m" or "7d" (as accepted by @nestjs/jwt's expiresIn) into ms. */
function parseDurationMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration);

  if (!match) {
    throw new Error(`Invalid duration format: "${duration}"`);
  }

  const [, amount, unit] = match;
  return Number(amount) * DURATION_UNIT_MS[unit];
}

export interface AccessTokenPayload {
  user: UserResponseDto;
}

/**
 * Refresh tokens are opaque random strings, not JWTs: they are hashed with
 * SHA-256 (a fast, deterministic hash) so a presented token can be looked up
 * by equality — bcrypt's per-call salt makes it unusable for this lookup.
 * The 256 bits of entropy in the token itself is what protects it at rest,
 * not the hash function.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  private signAccessToken(payload: AccessTokenPayload, expiresInSeconds: number): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: expiresInSeconds,
    });
  }

  async issueTokens(user: UserResponseDto): Promise<AuthTokensDto> {
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const accessExpiresInSeconds = Math.floor(parseDurationMs(accessExpiresIn) / 1000);

    const accessToken = this.signAccessToken({ user }, accessExpiresInSeconds);
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');

    await this.refreshTokenRepository.create({
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(Date.now() + parseDurationMs(refreshExpiresIn)),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresInSeconds,
    };
  }

  /**
   * Validates a refresh token, revokes it, and returns the user id it
   * belonged to. The caller is responsible for issuing a replacement pair —
   * rotation means a refresh token can be redeemed exactly once.
   */
  async redeemRefreshToken(refreshToken: string): Promise<string> {
    const record = await this.refreshTokenRepository.findByTokenHash(hashToken(refreshToken));

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.refreshTokenRepository.revoke(record.id);

    return record.userId;
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const record = await this.refreshTokenRepository.findByTokenHash(hashToken(refreshToken));

    if (record && !record.revokedAt) {
      await this.refreshTokenRepository.revoke(record.id);
    }
  }
}
