import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CategoryRepository } from '../../../category/category.repository';
import { TransactionRepository } from '../../transaction.repository';
import { CreateTransactionCommand } from '../create-transaction.command';

@CommandHandler(CreateTransactionCommand)
export class CreateTransactionHandler implements ICommandHandler<CreateTransactionCommand> {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(command: CreateTransactionCommand) {
    const category = await this.categoryRepository.findByIdForUser(
      command.data.categoryId,
      command.userId,
    );

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.transactionRepository.create({
      amount: command.data.amount,
      type: command.data.type,
      description: command.data.description ?? null,
      date: new Date(command.data.date),
      category: { connect: { id: command.data.categoryId } },
      user: { connect: { id: command.userId } },
    });
  }
}
