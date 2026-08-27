import { createZodDto } from 'nestjs-zod';
import { healthResponseSchema } from '@expense-tracker/shared';

export class HealthResponseDtoClass extends createZodDto(healthResponseSchema) {}
