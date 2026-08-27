import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const PASSWORD_SALT_ROUNDS = 12;

/**
 * Password hashing, isolated behind one provider so the bcrypt dependency (and
 * the cost factor) lives in a single place instead of being re-imported by
 * every command handler that touches a password.
 */
@Injectable()
export class PasswordHasherService {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  }

  compare(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}
