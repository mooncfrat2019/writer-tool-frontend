import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage, getApiProblemCode } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { AuthLayout } from './AuthLayout';
import { loginSchema, type LoginValues } from './schemas';
import { getAuthRedirect, redirectQuery } from './redirect';
import { setSessionFromAuth } from './session';

const isMockMode =
  import.meta.env.DEV && (import.meta.env.VITE_API_MODE ?? 'mock') === 'mock';

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const redirect = getAuthRedirect();
  const [formError, setFormError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: isMockMode
      ? { email: 'author@example.com', password: 'password123' }
      : { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: async (values: LoginValues) =>
      unwrap(
        await api.POST('/auth/login', {
          body: values,
        }),
      ),
    onMutate: () => {
      setFormError(null);
      setUnverifiedEmail(null);
    },
    onSuccess: (data) => {
      setSessionFromAuth(data);
      queryClient.clear();
      toast.success('С возвращением. Продолжим книгу.');
      if (redirect) {
        window.location.assign(redirect);
        return;
      }
      void navigate({ to: '/projects' });
    },
    onError: (error) => {
      if (getApiProblemCode(error) === 'email_not_verified') {
        setUnverifiedEmail(login.variables?.email ?? '');
        return;
      }
      setFormError(getApiErrorMessage(error, 'Не удалось войти. Проверьте почту и пароль.'));
    },
  });

  const resend = useMutation({
    mutationFn: async (email: string) =>
      unwrap(
        await api.POST('/auth/resend-verification', {
          body: { email },
        }),
      ),
    onSuccess: () => {
      toast.success('Если аккаунт существует, письмо отправлено ещё раз.');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось отправить письмо. Попробуйте позже.'));
    },
  });

  return (
    <AuthLayout
      eyebrow="Ваша мастерская"
      title="Войти в книгу"
      description="Продолжите с того места, где остановилась рукопись."
      footer={
        <p>
          Нет аккаунта?{' '}
          <a
            className="font-medium text-accent-700 underline-offset-4 hover:underline"
            href={`/register${redirectQuery(redirect)}`}
          >
            Создать аккаунт
          </a>
        </p>
      }
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit((values) => login.mutate(values))}
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

        <div className="space-y-2">
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          {errors.password ? (
            <p id="password-error" className="text-xs text-red-700">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </p>
        ) : null}

        {unverifiedEmail ? (
          <div
            role="alert"
            className="space-y-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900"
          >
            <p>
              Почта <strong>{unverifiedEmail}</strong> ещё не подтверждена. Перейдите
              по ссылке из письма или запросите новое.
            </p>
            <Button
              className="w-full"
              type="button"
              variant="outline"
              disabled={resend.isPending}
              onClick={() => resend.mutate(unverifiedEmail)}
            >
              {resend.isPending ? 'Отправляем…' : 'Отправить письмо ещё раз'}
            </Button>
          </div>
        ) : null}

        <Button className="w-full" type="submit" disabled={login.isPending}>
          {login.isPending ? 'Входим…' : 'Войти'}
        </Button>

        {isMockMode ? (
          <p className="rounded-md border border-paper-200 bg-paper-100/70 px-3 py-2 text-xs leading-relaxed text-ink-500">
            Демо-доступ уже подставлен: author@example.com / password123. Данные
            сохраняются только в вашем браузере.
          </p>
        ) : null}
      </form>
    </AuthLayout>
  );
}
