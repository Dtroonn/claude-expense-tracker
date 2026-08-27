import { ConflictException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { PasswordHasherService } from '../../../shared/crypto/password-hasher.service';
import { UserRepository } from '../../user.repository';
import { CreateUserCommand } from '../create-user.command';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasherService,
  ) {}

  async execute(command: CreateUserCommand) {
    const existing = await this.userRepository.findByEmail(command.email);

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await this.passwordHasher.hash(command.password);

    return this.userRepository.create({
      email: command.email,
      name: command.name,
      passwordHash,
    });
  }
}
