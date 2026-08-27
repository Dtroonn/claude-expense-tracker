import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CategoryRepository } from '../../category.repository';
import { DeleteCategoryCommand } from '../delete-category.command';

@CommandHandler(DeleteCategoryCommand)
export class DeleteCategoryHandler implements ICommandHandler<DeleteCategoryCommand> {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(command: DeleteCategoryCommand) {
    const existing = await this.categoryRepository.findByIdForUser(command.id, command.userId);

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    await this.categoryRepository.delete(command.id);
  }
}
