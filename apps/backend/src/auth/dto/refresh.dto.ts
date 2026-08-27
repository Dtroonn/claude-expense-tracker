import { createZodDto } from 'nestjs-zod';
import { refreshSchema } from '@expense-tracker/shared';

export class RefreshDtoClass extends createZodDto(refreshSchema) {}
