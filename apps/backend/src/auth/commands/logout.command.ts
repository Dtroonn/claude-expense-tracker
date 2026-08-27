import { Command } from '@nestjs/cqrs';

export class LogoutCommand extends Command<void> {
  constructor(public readonly refreshToken: string) {
    super();
  }
}
