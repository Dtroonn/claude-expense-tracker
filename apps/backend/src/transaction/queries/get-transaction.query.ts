import { Query } from '@nestjs/cqrs';
import { type Transaction } from '@/generated/prisma/client';

export class GetTransactionQuery extends Query<Transaction> {
  constructor(
    public readonly userId: string,
    public readonly id: string,
  ) {
    super();
  }
}
