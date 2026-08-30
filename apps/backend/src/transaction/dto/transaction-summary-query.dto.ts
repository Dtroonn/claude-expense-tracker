import { createZodDto } from 'nestjs-zod';
import { transactionSummaryQuerySchema } from '@expense-tracker/shared';

export class TransactionSummaryQueryDtoClass extends createZodDto(transactionSummaryQuerySchema) {}
