import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Введите имя')
    .max(100, 'Не больше 100 символов'),
  email: z.email('Введите корректный email'),
  password: z
    .string()
    .min(8, 'Пароль должен быть не короче 8 символов')
    .max(128, 'Пароль слишком длинный'),
  inviteCode: z
    .string()
    .max(200, 'Код приглашения слишком длинный')
    .optional(),
});

export type RegisterValues = z.infer<typeof registerSchema>;
