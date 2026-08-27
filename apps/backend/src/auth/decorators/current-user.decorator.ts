import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type UserResponseDto } from '@expense-tracker/shared';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserResponseDto => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
