import { createZodDto } from 'nestjs-zod';
import { categoryResponseSchema } from '@expense-tracker/shared';

export class CategoryResponseDtoClass extends createZodDto(categoryResponseSchema) {}
