import { createZodDto } from 'nestjs-zod';
import { userResponseSchema } from '@expense-tracker/shared';

export class UserResponseDtoClass extends createZodDto(userResponseSchema) {}
