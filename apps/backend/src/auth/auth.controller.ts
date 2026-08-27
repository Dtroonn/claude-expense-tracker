import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { type CommandBus } from '@nestjs/cqrs';
import {
  type AuthResponse,
  type LoginRequest,
  type RefreshRequest,
  type RegisterRequest,
  loginRequestSchema,
  refreshRequestSchema,
  registerRequestSchema,
} from '@expense-tracker/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { LoginCommand } from './commands/login.command';
import { LogoutCommand } from './commands/logout.command';
import { RefreshCommand } from './commands/refresh.command';
import { RegisterCommand } from './commands/register.command';

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('register')
  register(
    @Body(new ZodValidationPipe(registerRequestSchema)) body: RegisterRequest,
  ): Promise<AuthResponse> {
    return this.commandBus.execute(new RegisterCommand(body.email, body.name, body.password));
  }

  @Post('login')
  login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: LoginRequest,
  ): Promise<AuthResponse> {
    return this.commandBus.execute(new LoginCommand(body.email, body.password));
  }

  @Post('refresh')
  refresh(
    @Body(new ZodValidationPipe(refreshRequestSchema)) body: RefreshRequest,
  ): Promise<AuthResponse> {
    return this.commandBus.execute(new RefreshCommand(body.refreshToken));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body(new ZodValidationPipe(refreshRequestSchema)) body: RefreshRequest): Promise<void> {
    return this.commandBus.execute(new LogoutCommand(body.refreshToken));
  }
}
