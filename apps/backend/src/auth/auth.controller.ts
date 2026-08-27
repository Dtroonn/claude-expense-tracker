import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { type AuthResponseDto } from '@expense-tracker/shared';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthResponseDtoClass } from './dto/auth-response.dto';
import { LoginDtoClass } from './dto/login.dto';
import { RefreshDtoClass } from './dto/refresh.dto';
import { RegisterDtoClass } from './dto/register.dto';
import { LoginCommand } from './commands/login.command';
import { LogoutCommand } from './commands/logout.command';
import { RefreshCommand } from './commands/refresh.command';
import { RegisterCommand } from './commands/register.command';

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('register')
  @ZodSerializerDto(AuthResponseDtoClass)
  register(@Body() body: RegisterDtoClass): Promise<AuthResponseDto> {
    return this.commandBus.execute(new RegisterCommand(body.email, body.name, body.password));
  }

  @Post('login')
  @ZodSerializerDto(AuthResponseDtoClass)
  login(@Body() body: LoginDtoClass): Promise<AuthResponseDto> {
    return this.commandBus.execute(new LoginCommand(body.email, body.password));
  }

  @Post('refresh')
  @ZodSerializerDto(AuthResponseDtoClass)
  refresh(@Body() body: RefreshDtoClass): Promise<AuthResponseDto> {
    return this.commandBus.execute(new RefreshCommand(body.refreshToken));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() body: RefreshDtoClass): Promise<void> {
    return this.commandBus.execute(new LogoutCommand(body.refreshToken));
  }
}
