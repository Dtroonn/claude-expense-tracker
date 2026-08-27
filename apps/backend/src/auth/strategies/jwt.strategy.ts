import { Injectable, UnauthorizedException } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { type QueryBus } from '@nestjs/cqrs';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { GetUserByIdQuery } from '../../user/queries/get-user-by-id.query';
import { type AccessTokenPayload } from '../token.service';
import { toPublicUser } from '../to-public-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly queryBus: QueryBus,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload) {
    const user = await this.queryBus.execute(new GetUserByIdQuery(payload.sub));

    if (!user) {
      throw new UnauthorizedException('Invalid access token');
    }

    return toPublicUser(user);
  }
}
