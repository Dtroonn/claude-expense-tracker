import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type PublicUser } from '@expense-tracker/shared';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PublicUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
