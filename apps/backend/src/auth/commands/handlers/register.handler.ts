import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { userResponseSchema } from '@expense-tracker/shared';
import { CreateUserCommand } from '../../../user/commands/create-user.command';
import { TokenService } from '../../token.service';
import { RegisterCommand } from '../register.command';

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: RegisterCommand) {
    const user = await this.commandBus.execute(
      new CreateUserCommand(command.email, command.name, command.password),
    );

    const publicUser = userResponseSchema.parse({
      ...user,
      createdAt: user.createdAt.toISOString(),
    });
    const tokens = await this.tokenService.issueTokens(publicUser);

    return { user: publicUser, tokens };
  }
}
