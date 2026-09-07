import { z } from 'zod';

/**
 * ISO datetime string on the wire. Callers building a response from a `Date`
 * (e.g. a Prisma record) must call `.toISOString()` before parsing — kept as
 * a plain string schema (not a codec/transform over `z.date()`) because
 * `z.toJSONSchema`, which `nestjs-zod` uses for OpenAPI generation, cannot
 * represent `z.date()` at all.
 */
export const isoDateSchema = z.iso.datetime();

/**
 * Pagination query params. `z.coerce` because query params arrive as strings —
 * same reason `transactionSummarySchema` uses it. The `.default()`s mean a
 * controller never deals with `undefined`: the inferred output type has
 * `page: number`, not `page?: number`.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type PaginationQueryDto = z.infer<typeof paginationQuerySchema>;

/**
 * `hasPrev`/`hasNext` are derivable from `page`/`totalPages`, but deriving them
 * once server-side beats re-deriving them in every consumer.
 */
export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  hasPrev: z.boolean(),
  hasNext: z.boolean(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/**
 * Wraps an item schema in a paginated envelope. A factory returning a concrete
 * `z.object` works with `createZodDto` (which infers via
 * `ReturnType<TSchema['parse']>`) and with `z.toJSONSchema` — a generic DTO
 * *class* would not.
 */
export function paginatedSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    meta: paginationMetaSchema,
  });
}

/**
 * Hand-written rather than inferred from `paginatedSchema`: the inferred form
 * (`z.infer<ReturnType<typeof paginatedSchema<T>>>`) is awkward to use and does
 * not simplify. Structurally identical to what the factory produces, so there is
 * no drift risk — this is the one deliberate exception to inferring types from
 * schemas. Don't "fix" it.
 */
export type Paginated<T> = { items: T[]; meta: PaginationMeta };
