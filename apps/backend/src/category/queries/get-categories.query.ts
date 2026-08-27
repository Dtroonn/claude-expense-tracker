import { Query } from '@nestjs/cqrs';
import { type Category } from '@/generated/prisma/client';

export class GetCategoriesQuery extends Query<Category[]> {
  constructor(public readonly userId: string) {
    super();
  }
}
