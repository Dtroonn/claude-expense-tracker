import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateUserHandler } from './commands/handlers/create-user.handler';
import { GetUserByEmailHandler } from './queries/handlers/get-user-by-email.handler';
import { GetUserByIdHandler } from './queries/handlers/get-user-by-id.handler';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

const commandHandlers = [CreateUserHandler];
const queryHandlers = [GetUserByEmailHandler, GetUserByIdHandler];

@Module({
  imports: [CqrsModule],
  providers: [UserRepository, UserService, ...commandHandlers, ...queryHandlers],
})
export class UserModule {}
