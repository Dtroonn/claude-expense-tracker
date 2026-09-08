import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CategoryRepository } from '../../category.repository';
import { DeleteCategoryCommand } from '../delete-category.command';
import { Prisma } from '@/generated/prisma/client';

@CommandHandler(DeleteCategoryCommand)
export class DeleteCategoryHandler implements ICommandHandler<DeleteCategoryCommand> {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(command: DeleteCategoryCommand) {
    const existing = await this.categoryRepository.findByIdForUser(command.id, command.userId);

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    try {
      await this.categoryRepository.delete(command.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete a category that has transactions');
      }

      throw error;
    }
  }
}
