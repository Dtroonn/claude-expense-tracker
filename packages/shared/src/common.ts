import { z } from 'zod';

/**
 * Normalizes a `Date` (from Prisma) or an ISO datetime string into an ISO
 * string, so the wire contract is always a string regardless of source.
 */
export const isoDateSchema = z
  .union([z.date(), z.iso.datetime()])
  .transform((value) => (value instanceof Date ? value.toISOString() : value));
