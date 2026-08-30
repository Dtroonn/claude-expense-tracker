import { createZodDto } from 'nestjs-zod';
import { updateTransactionSchema } from '@expense-tracker/shared';

export class UpdateTransactionDtoClass extends createZodDto(updateTransactionSchema) {}
