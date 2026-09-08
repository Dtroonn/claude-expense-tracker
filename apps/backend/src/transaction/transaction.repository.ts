import { Injectable } from '@nestjs/common';
import { type TransactionFilterQueryDto, type TransactionsQueryDto } from '@expense-tracker/shared';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';

export type TransactionWithCategory = Prisma.TransactionGetPayload<{
  include: { category: true };
}>;

@Injectable()
export class TransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: Prisma.TransactionCreateInput): Promise<TransactionWithCategory> {
    return this.prisma.client.transaction.create({ data: input, include: { category: true } });
  }

  private buildWhere(
    userId: string,
    filter: TransactionFilterQueryDto,
  ): Prisma.TransactionWhereInput {
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

    return where;
  }

  /**
   * `count` and `findMany` share `buildWhere` so `total` can never disagree with
   * `items` — building the predicate twice would risk one filter being added to
   * only one of them. `$transaction` gives both queries one consistent snapshot;
   * without it a concurrent insert between the two could skew `total` relative
   * to the page actually returned.
   *
   * `orderBy` has a secondary `id` key: `date` alone isn't unique, and with
   * several transactions sharing a date, pure date ordering gives Postgres no
   * stable tiebreak — rows can duplicate or vanish across page boundaries.
   */
  async findPageByUserId(
    userId: string,
    query: TransactionsQueryDto,
  ): Promise<{ items: TransactionWithCategory[]; total: number }> {
    const where = this.buildWhere(userId, query);

    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.transaction.findMany({
        where,
        include: { category: true },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.client.transaction.count({ where }),
    ]);

    return { items, total };
  }

  findByIdForUser(id: string, userId: string): Promise<TransactionWithCategory | null> {
    return this.prisma.client.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });
  }

  update(id: string, data: Prisma.TransactionUpdateInput): Promise<TransactionWithCategory> {
    return this.prisma.client.transaction.update({
      where: { id },
      data,
      include: { category: true },
    });
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
