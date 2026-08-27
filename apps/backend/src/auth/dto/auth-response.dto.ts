import { createZodDto } from 'nestjs-zod';
import { authResponseSchema } from '@expense-tracker/shared';

export class AuthResponseDtoClass extends createZodDto(authResponseSchema) {}
