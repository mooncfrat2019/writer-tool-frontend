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

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Введите текущий пароль')
      .max(128, 'Пароль слишком длинный'),
    newPassword: z
      .string()
      .min(8, 'Пароль должен быть не короче 8 символов')
      .max(128, 'Пароль слишком длинный'),
    confirmPassword: z.string().min(1, 'Повторите новый пароль'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: 'Новый пароль должен отличаться от текущего',
    path: ['newPassword'],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email('Введите корректный email'),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Пароль должен быть не короче 8 символов')
      .max(128, 'Пароль слишком длинный'),
    confirmPassword: z.string().min(1, 'Повторите новый пароль'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const changeEmailSchema = z.object({
  newEmail: z.email('Введите корректный email'),
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
});

export type ChangeEmailValues = z.infer<typeof changeEmailSchema>;

export const twoFactorCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, 'Введите шестизначный код из письма'),
});

export type TwoFactorCodeValues = z.infer<typeof twoFactorCodeSchema>;

export const twoFactorPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Введите текущий пароль'),
});

export type TwoFactorPasswordValues = z.infer<typeof twoFactorPasswordSchema>;
