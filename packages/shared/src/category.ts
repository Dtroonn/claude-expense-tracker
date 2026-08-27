import { z } from 'zod';

export const categoryResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string(),
  icon: z.string(),
  createdAt: z
    .union([z.date(), z.iso.datetime()])
    .transform((value) => (value instanceof Date ? value.toISOString() : value)),
});

export type CategoryResponseDto = z.infer<typeof categoryResponseSchema>;

export const categoryListResponseSchema = z.array(categoryResponseSchema);

export type CategoryListResponseDto = z.infer<typeof categoryListResponseSchema>;

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

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
