import { ConflictException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CategoryRepository } from '../../category.repository';
import { CreateCategoryCommand } from '../create-category.command';
import { Prisma } from '@/generated/prisma/client';

@CommandHandler(CreateCategoryCommand)
export class CreateCategoryHandler implements ICommandHandler<CreateCategoryCommand> {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(command: CreateCategoryCommand) {
    try {
      return await this.categoryRepository.create({
        title: command.title,
        color: command.color,
        icon: command.icon,
        user: { connect: { id: command.userId } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A category with this title already exists');
      }

      throw error;
    }
  }
}
