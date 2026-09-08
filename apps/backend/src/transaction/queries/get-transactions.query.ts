import { Query } from '@nestjs/cqrs';
import { type TransactionsQueryDto } from '@expense-tracker/shared';
import { type TransactionWithCategory } from '../transaction.repository';

export class GetTransactionsQuery extends Query<{
  items: TransactionWithCategory[];
  total: number;
}> {
  constructor(
    public readonly userId: string,
    public readonly query: TransactionsQueryDto,
  ) {
    super();
  }
}
