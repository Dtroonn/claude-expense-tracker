import { z } from 'zod';

/**
 * The user shape safe to send to a client — never includes `passwordHash`.
 */
export const publicUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  createdAt: z.date().transform((date) => date.toISOString()),
});

export type PublicUser = z.infer<typeof publicUserSchema>;
