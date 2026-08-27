import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { type Category, type Prisma } from '@/generated/prisma/client';

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.client.category.create({ data: input });
  }

  findManyByUserId(userId: string): Promise<Category[]> {
    return this.prisma.client.category.findMany({
      where: { userId },
      orderBy: { title: 'asc' },
    });
  }

  findByIdForUser(id: string, userId: string): Promise<Category | null> {
    return this.prisma.client.category.findFirst({ where: { id, userId } });
  }

  update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.prisma.client.category.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.category.delete({ where: { id } });
  }
}
