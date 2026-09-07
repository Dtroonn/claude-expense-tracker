import { createZodDto } from 'nestjs-zod';
import { transactionsQuerySchema } from '@expense-tracker/shared';

export class TransactionsQueryDtoClass extends createZodDto(transactionsQuerySchema) {}
