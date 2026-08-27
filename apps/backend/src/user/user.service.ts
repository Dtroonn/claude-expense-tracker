import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { type CreateUserInput, type UserRecord, type UserRepository } from './user.repository';

const PASSWORD_SALT_ROUNDS = 12;

export interface RegisterUserInput {
  email: string;
  name: string;
  password: string;
}

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(input: RegisterUserInput): Promise<UserRecord> {
    const existing = await this.userRepository.findByEmail(input.email);

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
    const data: CreateUserInput = { email: input.email, name: input.name, passwordHash };

    return this.userRepository.create(data);
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.userRepository.findByEmail(email);
  }

  findById(id: string): Promise<UserRecord | null> {
    return this.userRepository.findById(id);
  }

  verifyPassword(user: UserRecord, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }
}
