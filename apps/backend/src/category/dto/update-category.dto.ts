import { createZodDto } from 'nestjs-zod';
import { updateCategorySchema } from '@expense-tracker/shared';

export class UpdateCategoryDtoClass extends createZodDto(updateCategorySchema) {}
