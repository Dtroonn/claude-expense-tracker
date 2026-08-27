import { z } from 'zod';
import { isoDateSchema } from './common';

/**
 * The user shape safe to send to a client — never includes `passwordHash`.
 */
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  createdAt: isoDateSchema,
});

export type UserResponseDto = z.infer<typeof userResponseSchema>;
