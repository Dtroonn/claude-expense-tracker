import { CommandHandler, type QueryBus, type ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { type AuthResponse, authResponseSchema } from '@expense-tracker/shared';
import { GetUserByEmailQuery } from '../../../user/queries/get-user-by-email.query';
import { type UserRecord } from '../../../user/user.repository';
import { type TokenService } from '../../token.service';
import { toPublicUser } from '../../to-public-user';
import { LoginCommand } from '../login.command';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: LoginCommand): Promise<AuthResponse> {
    const user = await this.queryBus.execute<GetUserByEmailQuery, UserRecord | null>(
      new GetUserByEmailQuery(command.email),
    );

    const passwordMatches = user
      ? await bcrypt.compare(command.password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.tokenService.issueTokens(user.id, user.email);

    return authResponseSchema.parse({ user: toPublicUser(user), tokens });
  }
}
