import { createZodDto } from 'nestjs-zod';
import { loginSchema } from '@expense-tracker/shared';

export class LoginDtoClass extends createZodDto(loginSchema) {}
