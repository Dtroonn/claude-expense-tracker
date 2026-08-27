import { Command } from '@nestjs/cqrs';
import { type AuthResponse } from '@expense-tracker/shared';

export class RefreshCommand extends Command<AuthResponse> {
  constructor(public readonly refreshToken: string) {
    super();
  }
}
