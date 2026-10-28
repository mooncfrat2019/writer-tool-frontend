import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/shared/api/client';
import { getApiErrorMessage, getApiProblemCode } from '@/shared/api/errors';
import { ApiError } from '@/shared/api/request';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { AuthLayout } from './AuthLayout';
import { clearSessionState } from './session';
import { resetPasswordSchema, type ResetPasswordValues } from './schemas';

export function ResetPasswordPage() {
  const search = useSearch({ strict: false }) as { token?: string };
  const token = search.token?.trim() ?? '';
  const queryClient = useQueryClient();
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const resetPassword = useMutation({
    mutationFn: async (values: ResetPasswordValues) => {
      const result = await api.POST('/auth/reset-password', {
        body: { token, newPassword: values.newPassword },
      });
      if (result.error) {
        throw new ApiError(result.error);
      }
      if (result.response.status !== 204) {
        throw new Error(`Unexpected status ${result.response.status}`);
      }
    },
    onMutate: () => setFormError(null),
    onSuccess: () => {
      clearSessionState();
      queryClient.clear();
      setDone(true);
    },
    onError: (error) => {
      if (getApiProblemCode(error) === 'invalid_reset_token') {
        setFormError('Ссылка недействительна или уже использована. Запросите новую.');
        return;
      }
      setFormError(getApiErrorMessage(error, 'Не удалось сбросить пароль.'));
    },
  });

  if (!token) {
    return (
      <AuthLayout
        eyebrow="Восстановление доступа"
        title="Ссылка недействительна"
        description="В ссылке нет токена сброса пароля."
        footer={
          <p>
            <a
              className="font-medium text-accent-700 underline-offset-4 hover:underline"
              href="/forgot-password"
            >
              Запросить новую ссылку
            </a>
          </p>
        }
      >
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Откройте ссылку из письма ещё раз или запросите новое письмо.
        </p>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout
        eyebrow="Готово"
        title="Пароль обновлён"
        description="Все остальные сессии завершены. Войдите с новым паролем."
        footer={
          <p>
            <a
              className="font-medium text-accent-700 underline-offset-4 hover:underline"
              href="/login"
            >
              Войти
            </a>
          </p>
        }
      >
        <p className="rounded-md border border-paper-200 bg-paper-100/70 px-4 py-3 text-sm text-ink-700">
          Если вы не меняли пароль, немедленно запросите сброс ещё раз и
          проверьте почту.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Восстановление доступа"
      title="Новый пароль"
      description="Придумайте пароль не короче 8 символов."
      footer={
        <p>
          <a
            className="font-medium text-accent-700 underline-offset-4 hover:underline"
            href="/login"
          >
            Вернуться ко входу
          </a>
        </p>
      }
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit((values) => resetPassword.mutate(values))}
      >
        <div className="space-y-2">
          <Label htmlFor="newPassword">Новый пароль</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPassword)}
            aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
            {...register('newPassword')}
          />
          {errors.newPassword ? (
            <p id="newPassword-error" className="text-xs text-red-700">
              {errors.newPassword.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Повторите пароль</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={
              errors.confirmPassword ? 'confirmPassword-error' : undefined
            }
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <p id="confirmPassword-error" className="text-xs text-red-700">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {formError}
          </p>
        ) : null}

        <Button className="w-full" type="submit" disabled={resetPassword.isPending}>
          {resetPassword.isPending ? 'Сохраняем…' : 'Сохранить пароль'}
        </Button>
      </form>
    </AuthLayout>
  );
}
