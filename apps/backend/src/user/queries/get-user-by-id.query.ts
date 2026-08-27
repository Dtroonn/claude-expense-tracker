import { Query } from '@nestjs/cqrs';
import { type User } from '@/generated/prisma/client';

export class GetUserByIdQuery extends Query<User | null> {
  constructor(public readonly id: string) {
    super();
  }
}
