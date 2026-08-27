import { Command } from '@nestjs/cqrs';
import { type AuthResponseDto } from '@expense-tracker/shared';

export class RefreshCommand extends Command<AuthResponseDto> {
  constructor(public readonly refreshToken: string) {
    super();
  }
}
