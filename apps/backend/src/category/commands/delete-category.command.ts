import { Command } from '@nestjs/cqrs';

export class DeleteCategoryCommand extends Command<void> {
  constructor(
    public readonly userId: string,
    public readonly id: string,
  ) {
    super();
  }
}
