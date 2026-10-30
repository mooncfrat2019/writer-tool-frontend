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
import { OAuthButtons } from './OAuthButtons';
import {
  loginSchema,
  twoFactorCodeSchema,
  type LoginValues,
  type TwoFactorCodeValues,
} from './schemas';
import { getAuthRedirect, redirectQuery } from './redirect';
import { setSessionFromAuth } from './session';

const isMockMode =
  import.meta.env.DEV && (import.meta.env.VITE_API_MODE ?? 'mock') === 'mock';

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const redirect = getAuthRedirect();
  const [formError, setFormError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [twoFactor, setTwoFactor] = useState<{
    challengeToken: string;
    expiresAt: string;
    method: 'email' | 'totp';
  } | null>(null);
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
  const twoFactorForm = useForm<TwoFactorCodeValues>({
    resolver: zodResolver(twoFactorCodeSchema),
    defaultValues: { code: '' },
  });

  const finishLogin = (data: Parameters<typeof setSessionFromAuth>[0]) => {
    setSessionFromAuth(data);
    queryClient.clear();
    toast.success('С возвращением. Продолжим книгу.');
    if (redirect) {
      window.location.assign(redirect);
      return;
    }
    void navigate({ to: '/projects' });
  };

  const login = useMutation({
    mutationFn: async (values: LoginValues) =>
      unwrap(
        await api.POST('/auth/login', {
          body: values,
        }),
      ),
    onMutate: () => {
      setFormError(null);
      setOauthError(null);
      setUnverifiedEmail(null);
    },
    onSuccess: (data) => {
      if ('challengeToken' in data) {
        setTwoFactor(data);
        return;
      }
      finishLogin(data);
    },
    onError: (error) => {
      if (getApiProblemCode(error) === 'email_not_verified') {
        setUnverifiedEmail(login.variables?.email ?? '');
        return;
      }
      setFormError(getApiErrorMessage(error, 'Не удалось войти. Проверьте почту и пароль.'));
    },
  });

  const verifyTwoFactor = useMutation({
    mutationFn: async (values: TwoFactorCodeValues) => {
      if (!twoFactor) {
        throw new Error('Two-factor challenge is missing');
      }
      return unwrap(
        await api.POST('/auth/2fa/verify', {
          body: {
            challengeToken: twoFactor.challengeToken,
            code: values.code,
          },
        }),
      );
    },
    onMutate: () => {
      setFormError(null);
      setOauthError(null);
    },
    onSuccess: (data) => finishLogin(data),
    onError: (error) => {
      const code = getApiProblemCode(error);
      if (code === 'invalid_two_factor_code') {
        setFormError('Неверный код. Проверьте письмо и попробуйте снова.');
        return;
      }
      if (code === 'too_many_attempts' || code === 'invalid_two_factor_challenge') {
        setTwoFactor(null);
        twoFactorForm.reset();
        setFormError('Код больше не действует. Войдите заново, чтобы получить новый.');
        return;
      }
      setFormError(getApiErrorMessage(error, 'Не удалось проверить код.'));
    },
  });

  const resend = useMutation({
    mutationFn: async (email: string) =>
      unwrap(
        await api.POST('/auth/resend-verification', {
          body: redirect ? { email, redirect } : { email },
        }),
      ),
    onSuccess: () => {
      toast.success('Если аккаунт существует, письмо отправлено ещё раз.');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось отправить письмо. Попробуйте позже.'));
    },
  });

  if (twoFactor) {
    const fromApp = twoFactor.method === 'totp';
    return (
      <AuthLayout
        eyebrow="Два шага"
        title="Введите код"
        description={
          fromApp
            ? 'Введите шестизначный код из приложения-аутентификатора.'
            : 'Мы отправили шестизначный код на почту аккаунта.'
        }
        footer={
          <p>
            <button
              className="font-medium text-accent-700 underline-offset-4 hover:underline"
              type="button"
              onClick={() => {
                setTwoFactor(null);
                setFormError(null);
                twoFactorForm.reset();
              }}
            >
              Войти заново
            </button>
          </p>
        }
      >
        <form
          className="space-y-5"
          noValidate
          onSubmit={twoFactorForm.handleSubmit((values) =>
            verifyTwoFactor.mutate(values),
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="code">
              {fromApp ? 'Код из приложения' : 'Код из письма'}
            </Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              aria-invalid={Boolean(twoFactorForm.formState.errors.code)}
              aria-describedby={
                twoFactorForm.formState.errors.code ? 'code-error' : undefined
              }
              {...twoFactorForm.register('code')}
            />
            {twoFactorForm.formState.errors.code ? (
              <p id="code-error" className="text-xs text-red-700">
                {twoFactorForm.formState.errors.code.message}
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

          <Button
            className="w-full"
            type="submit"
            disabled={verifyTwoFactor.isPending}
          >
            {verifyTwoFactor.isPending ? 'Проверяем…' : 'Подтвердить код'}
          </Button>
        </form>
      </AuthLayout>
    );
  }

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
      <OAuthButtons
        redirect={redirect}
        disabled={login.isPending}
        onError={setOauthError}
      />

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-paper-200" />
        <span className="text-xs uppercase tracking-[0.14em] text-ink-500">
          или по почте
        </span>
        <span className="h-px flex-1 bg-paper-200" />
      </div>

      <form
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit((values) => login.mutate(values))}
      >
        {oauthError ? (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {oauthError}
          </p>
        ) : null}

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
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Пароль</Label>
            <a
              className="text-xs font-medium text-accent-700 underline-offset-4 hover:underline"
              href="/forgot-password"
            >
              Забыли пароль?
            </a>
          </div>
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
              по ссылке из письма, запросите новое или дождитесь подтверждения
              администратором.
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
