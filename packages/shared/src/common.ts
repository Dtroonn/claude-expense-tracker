import { z } from 'zod';

/**
 * ISO datetime string on the wire. Callers building a response from a `Date`
 * (e.g. a Prisma record) must call `.toISOString()` before parsing — kept as
 * a plain string schema (not a codec/transform over `z.date()`) because
 * `z.toJSONSchema`, which `nestjs-zod` uses for OpenAPI generation, cannot
 * represent `z.date()` at all.
 */
export const isoDateSchema = z.iso.datetime();
