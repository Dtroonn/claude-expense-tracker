import { z } from 'zod';
import { userResponseSchema } from './user';

export const registerSchema = z.object({
  email: z.email(),
  name: z.string().min(1).trim(),
  password: z.string().min(8).trim(),
});

export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshDto = z.infer<typeof refreshSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export type AuthTokensDto = z.infer<typeof authTokensSchema>;

export const authResponseSchema = z.object({
  user: userResponseSchema,
  tokens: authTokensSchema,
});

export type AuthResponseDto = z.infer<typeof authResponseSchema>;
