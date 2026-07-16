import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().trim().refine(
    (value) => z.string().email().safeParse(value).success || /^\+?[0-9\s-]{10,16}$/.test(value),
    'Enter a valid email or mobile number',
  ),
  password: z.string().min(1, 'Enter your password'),
});

export type LoginPayload = z.infer<typeof loginSchema>;
