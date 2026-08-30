import { createZodDto } from 'nestjs-zod';
import { transactionFilterQuerySchema } from '@expense-tracker/shared';

export class TransactionFilterQueryDtoClass extends createZodDto(transactionFilterQuerySchema) {}
