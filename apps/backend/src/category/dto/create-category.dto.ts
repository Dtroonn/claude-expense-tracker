import { createZodDto } from 'nestjs-zod';
import { createCategorySchema } from '@expense-tracker/shared';

export class CreateCategoryDtoClass extends createZodDto(createCategorySchema) {}
