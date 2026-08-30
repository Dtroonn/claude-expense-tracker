import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CategoryRepository } from '../../../category/category.repository';
import { TransactionRepository } from '../../transaction.repository';
import { UpdateTransactionCommand } from '../update-transaction.command';

@CommandHandler(UpdateTransactionCommand)
export class UpdateTransactionHandler implements ICommandHandler<UpdateTransactionCommand> {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(command: UpdateTransactionCommand) {
    const existing = await this.transactionRepository.findByIdForUser(command.id, command.userId);

    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }

    if (command.data.categoryId) {
      const category = await this.categoryRepository.findByIdForUser(
        command.data.categoryId,
        command.userId,
      );

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const { categoryId, date, description, ...rest } = command.data;

    return this.transactionRepository.update(command.id, {
      ...rest,
      ...(description !== undefined && { description: description ?? null }),
      ...(date && { date: new Date(date) }),
      ...(categoryId && { category: { connect: { id: categoryId } } }),
    });
  }
}
