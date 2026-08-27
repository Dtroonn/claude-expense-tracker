import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type UserRecord } from '../../user.repository';
import { type UserService } from '../../user.service';
import { CreateUserCommand } from '../create-user.command';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(private readonly userService: UserService) {}

  execute(command: CreateUserCommand): Promise<UserRecord> {
    return this.userService.create({
      email: command.email,
      name: command.name,
      password: command.password,
    });
  }
}
