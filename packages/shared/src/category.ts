import { z } from 'zod';
import { isoDateSchema } from './common';

export const categoryResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string(),
  icon: z.string(),
  createdAt: isoDateSchema,
});

export type CategoryResponseDto = z.infer<typeof categoryResponseSchema>;

export const categoryListResponseSchema = z.array(categoryResponseSchema);

export type CategoryListResponseDto = z.infer<typeof categoryListResponseSchema>;

export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const createCategorySchema = z.object({
  title: z.string().min(1).trim(),
  color: colorSchema,
  icon: z.string().min(1).trim(),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
