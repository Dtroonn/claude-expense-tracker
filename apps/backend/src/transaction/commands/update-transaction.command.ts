import { Command } from '@nestjs/cqrs';
import { type UpdateTransactionDto } from '@expense-tracker/shared';
import { type TransactionWithCategory } from '../transaction.repository';

export class UpdateTransactionCommand extends Command<TransactionWithCategory> {
  constructor(
    public readonly userId: string,
    public readonly id: string,
    public readonly data: UpdateTransactionDto,
  ) {
    super();
  }
}
