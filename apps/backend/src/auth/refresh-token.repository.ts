import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { type Prisma, type RefreshToken } from '@/generated/prisma/client';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: Prisma.RefreshTokenUncheckedCreateInput): Promise<RefreshToken> {
    return this.prisma.client.refreshToken.create({ data: input });
  }

  findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.client.refreshToken.findUnique({ where: { tokenHash } });
  }

  revoke(id: string): Promise<RefreshToken> {
    return this.prisma.client.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}
