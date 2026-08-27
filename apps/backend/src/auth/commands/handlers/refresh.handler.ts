import { CommandHandler, QueryBus, type ICommandHandler } from '@nestjs/cqrs';
import { UnauthorizedException } from '@nestjs/common';
import { type AuthResponse, authResponseSchema } from '@expense-tracker/shared';
import { GetUserByIdQuery } from '../../../user/queries/get-user-by-id.query';
import { TokenService } from '../../token.service';
import { RefreshCommand } from '../refresh.command';

@CommandHandler(RefreshCommand)
export class RefreshHandler implements ICommandHandler<RefreshCommand> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: RefreshCommand): Promise<AuthResponse> {
    const userId = await this.tokenService.redeemRefreshToken(command.refreshToken);
    const user = await this.queryBus.execute(new GetUserByIdQuery(userId));

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.tokenService.issueTokens(user.id, user.email);

    return authResponseSchema.parse({ user, tokens });
  }
}
