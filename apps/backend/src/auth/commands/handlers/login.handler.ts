import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, QueryBus, type ICommandHandler } from '@nestjs/cqrs';
import { userResponseSchema } from '@expense-tracker/shared';
import { GetUserByEmailQuery } from '../../../user/queries/get-user-by-email.query';
import { PasswordHasherService } from '../../../shared/crypto/password-hasher.service';
import { TokenService } from '../../token.service';
import { LoginCommand } from '../login.command';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly tokenService: TokenService,
    private readonly passwordHasher: PasswordHasherService,
  ) {}

  async execute(command: LoginCommand) {
    const user = await this.queryBus.execute(new GetUserByEmailQuery(command.email));

    const passwordMatches = user
      ? await this.passwordHasher.compare(command.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const publicUser = userResponseSchema.parse(user);
    const tokens = await this.tokenService.issueTokens(publicUser);

    return { user: publicUser, tokens };
  }
}
