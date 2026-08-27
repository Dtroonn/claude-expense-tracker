import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { type Prisma, type User } from '@/generated/prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.client.user.create({ data: input });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.client.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.client.user.findUnique({ where: { id } });
  }
}
