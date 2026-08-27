import { createZodDto } from 'nestjs-zod';
import { registerSchema } from '@expense-tracker/shared';

export class RegisterDtoClass extends createZodDto(registerSchema) {}
