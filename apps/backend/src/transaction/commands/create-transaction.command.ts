import { Command } from '@nestjs/cqrs';
import { type CreateTransactionDto } from '@expense-tracker/shared';
import { type TransactionWithCategory } from '../transaction.repository';

export class CreateTransactionCommand extends Command<TransactionWithCategory> {
  constructor(
    public readonly userId: string,
    public readonly data: CreateTransactionDto,
  ) {
    super();
  }
}
