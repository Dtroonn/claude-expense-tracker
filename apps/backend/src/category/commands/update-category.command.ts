import { Command } from '@nestjs/cqrs';
import { type UpdateCategoryDto } from '@expense-tracker/shared';
import { type Category } from '@/generated/prisma/client';

export class UpdateCategoryCommand extends Command<Category> {
  constructor(
    public readonly userId: string,
    public readonly id: string,
    public readonly data: UpdateCategoryDto,
  ) {
    super();
  }
}
