import { createZodDto } from 'nestjs-zod';
import { transactionSummarySchema } from '@expense-tracker/shared';

export class TransactionSummaryDtoClass extends createZodDto(transactionSummarySchema) {}
