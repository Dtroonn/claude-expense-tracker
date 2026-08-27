import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CategoryRepository } from '../../category.repository';
import { UpdateCategoryCommand } from '../update-category.command';
import { Prisma } from '@/generated/prisma/client';

@CommandHandler(UpdateCategoryCommand)
export class UpdateCategoryHandler implements ICommandHandler<UpdateCategoryCommand> {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(command: UpdateCategoryCommand) {
    const existing = await this.categoryRepository.findByIdForUser(command.id, command.userId);

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    try {
      return await this.categoryRepository.update(command.id, command.data);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A category with this title already exists');
      }

      throw error;
    }
  }
}
