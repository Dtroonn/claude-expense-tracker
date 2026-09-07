import { Query } from '@nestjs/cqrs';
import { type TransactionWithCategory } from '../transaction.repository';

export class GetTransactionQuery extends Query<TransactionWithCategory> {
  constructor(
    public readonly userId: string,
    public readonly id: string,
  ) {
    super();
  }
}
