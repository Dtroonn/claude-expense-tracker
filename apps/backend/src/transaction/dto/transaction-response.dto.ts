import { createZodDto } from 'nestjs-zod';
import { transactionResponseSchema } from '@expense-tracker/shared';

export class TransactionResponseDtoClass extends createZodDto(transactionResponseSchema) {}
