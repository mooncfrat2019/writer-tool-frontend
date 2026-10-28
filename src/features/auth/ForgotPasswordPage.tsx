import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { AuthLayout } from './AuthLayout';
import { forgotPasswordSchema, type ForgotPasswordValues } from './schemas';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const requestReset = useMutation({
    mutationFn: async (values: ForgotPasswordValues) =>
      unwrap(
        await api.POST('/auth/forgot-password', {
          body: { email: values.email },
        }),
      ),
    onMutate: () => setFormError(null),
    onSuccess: () => setSent(true),
    onError: (error) => {
      setFormError(
        getApiErrorMessage(error, 'Не удалось отправить письмо. Попробуйте позже.'),
      );
    },
  });

  if (sent) {
    return (
      <AuthLayout
        eyebrow="Восстановление доступа"
        title="Проверьте почту"
        description="Если аккаунт с таким адресом существует, мы отправили ссылку для сброса пароля."
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
        <p className="rounded-md border border-paper-200 bg-paper-100/70 px-4 py-3 text-sm leading-relaxed text-ink-700">
          Ссылка действует ограниченное время и может быть использована один
          раз. Если письма нет, проверьте папку «Спам» или запросите новое через
          минуту.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Восстановление доступа"
      title="Забыли пароль?"
      description="Укажите email аккаунта — пришлём ссылку для сброса."
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
        onSubmit={handleSubmit((values) => requestReset.mutate(values))}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          {errors.email ? (
            <p id="email-error" className="text-xs text-red-700">
              {errors.email.message}
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

        <Button className="w-full" type="submit" disabled={requestReset.isPending}>
          {requestReset.isPending ? 'Отправляем…' : 'Отправить ссылку'}
        </Button>
      </form>
    </AuthLayout>
  );
}
