import { Command } from '@nestjs/cqrs';
import { type CreateTransactionDto } from '@expense-tracker/shared';
import { type Transaction } from '@/generated/prisma/client';

export class CreateTransactionCommand extends Command<Transaction> {
  constructor(
    public readonly userId: string,
    public readonly data: CreateTransactionDto,
  ) {
    super();
  }
}
