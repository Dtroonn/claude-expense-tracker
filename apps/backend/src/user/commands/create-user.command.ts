import { Command } from '@nestjs/cqrs';
import { type User } from '@/generated/prisma/client';

export class CreateUserCommand extends Command<User> {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly password: string,
  ) {
    super();
  }
}
