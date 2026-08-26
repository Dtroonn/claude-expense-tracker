import { z } from 'zod';

/**
 * Response of `GET /health` on the backend.
 *
 * Reference example of the schema-first pattern: the backend builds its reply
 * to satisfy `healthResponseSchema`, and the frontend consumes `HealthResponse`
 * without redeclaring the shape.
 */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  version: z.string(),
  timestamp: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
