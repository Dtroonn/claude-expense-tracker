import { Command } from '@nestjs/cqrs';
import { type AuthResponseDto } from '@expense-tracker/shared';

export class RegisterCommand extends Command<AuthResponseDto> {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly password: string,
  ) {
    super();
  }
}
