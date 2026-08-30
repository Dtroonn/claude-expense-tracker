import { createZodDto } from 'nestjs-zod';
import { createTransactionSchema } from '@expense-tracker/shared';

export class CreateTransactionDtoClass extends createZodDto(createTransactionSchema) {}
