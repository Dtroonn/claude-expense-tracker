import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { LoginHandler } from './commands/handlers/login.handler';
import { LogoutHandler } from './commands/handlers/logout.handler';
import { RefreshHandler } from './commands/handlers/refresh.handler';
import { RegisterHandler } from './commands/handlers/register.handler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenRepository } from './refresh-token.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

const commandHandlers = [RegisterHandler, LoginHandler, RefreshHandler, LogoutHandler];

@Module({
  imports: [
    CqrsModule,
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [TokenService, RefreshTokenRepository, JwtStrategy, JwtAuthGuard, ...commandHandlers],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
