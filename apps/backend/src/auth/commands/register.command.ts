import { Command } from '@nestjs/cqrs';
import { type AuthResponse } from '@expense-tracker/shared';

export class RegisterCommand extends Command<AuthResponse> {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly password: string,
  ) {
    super();
  }
}
