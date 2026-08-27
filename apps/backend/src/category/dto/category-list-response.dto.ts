import { createZodDto } from 'nestjs-zod';
import { categoryListResponseSchema } from '@expense-tracker/shared';

export class CategoryListResponseDtoClass extends createZodDto(categoryListResponseSchema) {}
