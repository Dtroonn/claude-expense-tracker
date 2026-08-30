import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { TransactionRepository } from '../../transaction.repository';
import { DeleteTransactionCommand } from '../delete-transaction.command';

@CommandHandler(DeleteTransactionCommand)
export class DeleteTransactionHandler implements ICommandHandler<DeleteTransactionCommand> {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(command: DeleteTransactionCommand) {
    const existing = await this.transactionRepository.findByIdForUser(command.id, command.userId);

    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }

    await this.transactionRepository.delete(command.id);
  }
}
