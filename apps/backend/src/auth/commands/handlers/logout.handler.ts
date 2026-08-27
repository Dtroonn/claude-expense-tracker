import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { TokenService } from '../../token.service';
import { LogoutCommand } from '../logout.command';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor(private readonly tokenService: TokenService) {}

  execute(command: LogoutCommand) {
    return this.tokenService.revokeRefreshToken(command.refreshToken);
  }
}
