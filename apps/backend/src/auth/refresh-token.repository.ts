import { Injectable } from '@nestjs/common';
import { type PrismaService } from '../prisma/prisma.service';

export interface RefreshTokenRecord {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface CreateRefreshTokenInput {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    return this.prisma.client.refreshToken.create({ data: input });
  }

  findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.prisma.client.refreshToken.findUnique({ where: { tokenHash } });
  }

  revoke(id: string): Promise<RefreshTokenRecord> {
    return this.prisma.client.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}
