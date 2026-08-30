import { Injectable } from '@nestjs/common';
import { type TransactionFilterQueryDto } from '@expense-tracker/shared';
import { PrismaService } from '../prisma/prisma.service';
import { type Prisma, type Transaction } from '@/generated/prisma/client';

@Injectable()
export class TransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: Prisma.TransactionCreateInput): Promise<Transaction> {
    return this.prisma.client.transaction.create({ data: input });
  }

  findManyByUserId(userId: string, filter: TransactionFilterQueryDto): Promise<Transaction[]> {
    const where: Prisma.TransactionWhereInput = { userId };

    if (filter.dateFrom || filter.dateTo) {
      where.date = {
        ...(filter.dateFrom && { gte: new Date(filter.dateFrom) }),
        ...(filter.dateTo && { lte: new Date(filter.dateTo) }),
      };
    }

    if (filter.type) {
      where.type = filter.type;
    }

    if (filter.categoryId) {
      where.categoryId = filter.categoryId;
    }

    return this.prisma.client.transaction.findMany({ where, orderBy: { date: 'desc' } });
  }

  findByIdForUser(id: string, userId: string): Promise<Transaction | null> {
    return this.prisma.client.transaction.findFirst({ where: { id, userId } });
  }

  update(id: string, data: Prisma.TransactionUpdateInput): Promise<Transaction> {
    return this.prisma.client.transaction.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.transaction.delete({ where: { id } });
  }

  sumByTypeForPeriod(userId: string, from: Date, to: Date) {
    return this.prisma.client.transaction.groupBy({
      by: ['type'],
      where: { userId, date: { gte: from, lt: to } },
      orderBy: { type: 'asc' },
      _sum: { amount: true },
    });
  }
}
