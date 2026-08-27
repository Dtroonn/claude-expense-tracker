import { Query } from '@nestjs/cqrs';
import { type User } from '@/generated/prisma/client';

export class GetUserByEmailQuery extends Query<User | null> {
  constructor(public readonly email: string) {
    super();
  }
}
