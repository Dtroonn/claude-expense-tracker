import { Command } from '@nestjs/cqrs';
import { type Category } from '@/generated/prisma/client';

export class CreateCategoryCommand extends Command<Category> {
  constructor(
    public readonly userId: string,
    public readonly title: string,
    public readonly color: string,
    public readonly icon: string,
  ) {
    super();
  }
}
