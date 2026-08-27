import { CommandHandler, type CommandBus, type ICommandHandler } from '@nestjs/cqrs';
import { type AuthResponse, authResponseSchema } from '@expense-tracker/shared';
import { CreateUserCommand } from '../../../user/commands/create-user.command';
import { type UserRecord } from '../../../user/user.repository';
import { type TokenService } from '../../token.service';
import { toPublicUser } from '../../to-public-user';
import { RegisterCommand } from '../register.command';

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: RegisterCommand): Promise<AuthResponse> {
    const user = await this.commandBus.execute<CreateUserCommand, UserRecord>(
      new CreateUserCommand(command.email, command.name, command.password),
    );

    const tokens = await this.tokenService.issueTokens(user.id, user.email);

    return authResponseSchema.parse({ user: toPublicUser(user), tokens });
  }
}
