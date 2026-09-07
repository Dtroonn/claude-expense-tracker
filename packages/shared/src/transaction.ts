import { z } from 'zod';
import { isoDateSchema, paginatedSchema, paginationQuerySchema } from './common';

export const transactionTypeSchema = z.enum(['INCOME', 'EXPENSE']);

export type TransactionType = z.infer<typeof transactionTypeSchema>;

/** The category nested in a transaction response — enough to render a row (name, colour, icon) without a second request. */
export const transactionCategorySchema = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string(),
  icon: z.string(),
});

export type TransactionCategoryDto = z.infer<typeof transactionCategorySchema>;

export const transactionResponseSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: transactionTypeSchema,
  description: z.string().nullable(),
  date: isoDateSchema,
  categoryId: z.string(),
  category: transactionCategorySchema,
  createdAt: isoDateSchema,
});

export type TransactionResponseDto = z.infer<typeof transactionResponseSchema>;

export const paginatedTransactionsSchema = paginatedSchema(transactionResponseSchema);

export type PaginatedTransactionsDto = z.infer<typeof paginatedTransactionsSchema>;

export const createTransactionSchema = z.object({
  amount: z.number().positive(),
  type: transactionTypeSchema,
  description: z.string().trim().min(1).nullish(),
  date: isoDateSchema,
  categoryId: z.uuid(),
});

export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = createTransactionSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;

export const transactionFilterQuerySchema = z.object({
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  type: transactionTypeSchema.optional(),
  categoryId: z.uuid().optional(),
});

export type TransactionFilterQueryDto = z.infer<typeof transactionFilterQuerySchema>;

export const transactionsQuerySchema = transactionFilterQuerySchema.extend(
  paginationQuerySchema.shape,
);

export type TransactionsQueryDto = z.infer<typeof transactionsQuerySchema>;

export const transactionSummaryQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(1970).max(9999),
});

export type TransactionSummaryQueryDto = z.infer<typeof transactionSummaryQuerySchema>;

export const transactionSummarySchema = z.object({
  month: z.number(),
  year: z.number(),
  totalIncome: z.number(),
  totalExpense: z.number(),
  balance: z.number(),
});

export type TransactionSummaryDto = z.infer<typeof transactionSummarySchema>;
