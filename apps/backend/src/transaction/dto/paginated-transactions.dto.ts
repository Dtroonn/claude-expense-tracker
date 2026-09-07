import { createZodDto } from 'nestjs-zod';
import { paginatedTransactionsSchema } from '@expense-tracker/shared';

export class PaginatedTransactionsDtoClass extends createZodDto(paginatedTransactionsSchema) {}
