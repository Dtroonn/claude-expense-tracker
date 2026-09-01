import { type z } from 'zod';
import { loginSchema } from '@expense-tracker/shared';

export { loginSchema };
export type LoginFormValues = z.infer<typeof loginSchema>;
