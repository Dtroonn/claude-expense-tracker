import { Query } from '@nestjs/cqrs';
import { type TransactionFilterQueryDto } from '@expense-tracker/shared';
import { type Transaction } from '@/generated/prisma/client';

export class GetTransactionsQuery extends Query<Transaction[]> {
  constructor(
    public readonly userId: string,
    public readonly filter: TransactionFilterQueryDto,
  ) {
    super();
  }
}
