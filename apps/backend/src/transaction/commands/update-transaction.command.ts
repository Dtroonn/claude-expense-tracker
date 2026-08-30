import { Command } from '@nestjs/cqrs';
import { type UpdateTransactionDto } from '@expense-tracker/shared';
import { type Transaction } from '@/generated/prisma/client';

export class UpdateTransactionCommand extends Command<Transaction> {
  constructor(
    public readonly userId: string,
    public readonly id: string,
    public readonly data: UpdateTransactionDto,
  ) {
    super();
  }
}
