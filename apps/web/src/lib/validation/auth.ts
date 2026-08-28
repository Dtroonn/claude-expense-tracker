import { z } from 'zod';
import { loginSchema, registerSchema } from '@expense-tracker/shared';

export { loginSchema };
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
