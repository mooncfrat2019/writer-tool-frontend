import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage, getApiProblemCode } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { AuthLayout } from './AuthLayout';
import { safeRedirect } from './redirect';
import {
  twoFactorCodeSchema,
  type TwoFactorCodeValues,
} from './schemas';
import { setSessionFromAuth } from './session';

type TwoFactorChallenge = components['schemas']['TwoFactorChallenge'];

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, redirect } = useSearch({ from: '/verify-email' }) as {
    token?: string;
    redirect?: string;
  };
  const target = safeRedirect(redirect);
  const started = useRef(false);
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [twoFactor, setTwoFactor] = useState<TwoFactorChallenge | null>(null);
  const twoFactorForm = useForm<TwoFactorCodeValues>({
    resolver: zodResolver(twoFactorCodeSchema),
    defaultValues: { code: '' },
  });

  const finish = (data: components['schemas']['AuthResponse']) => {
    setSessionFromAuth(data);
    queryClient.clear();
    toast.success('Почта подтверждена. Добро пожаловать в мастерскую.');
    if (target) {
      window.location.assign(target);
      return;
    }
    void navigate({ to: '/projects' });
  };

  const verify = useMutation({
    mutationFn: async (value: string) =>
      unwrap(
        await api.POST('/auth/verify-email', {
          body: { token: value },
        }),
      ),
    onSuccess: (data) => {
      // Accounts with 2FA get a challenge instead of a session, so the
      // verification link cannot bypass the second factor.
      if ('challengeToken' in data) {
        setTwoFactor(data);
        return;
      }
      finish(data);
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
    onMutate: () => setFormError(null),
    onSuccess: (data) => finish(data),
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

  useEffect(() => {
    if (!token || started.current) {
      return;
    }
    started.current = true;
    verify.mutate(token);
  }, [token, verify]);

  const resend = useMutation({
    mutationFn: async (value: string) =>
      unwrap(
        await api.POST('/auth/resend-verification', {
          body: target ? { email: value, redirect: target } : { email: value },
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
            ? 'Почта подтверждена. Введите шестизначный код из приложения-аутентификатора.'
            : 'Почта подтверждена. Мы отправили шестизначный код на почту аккаунта.'
        }
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

  const failed = !token || verify.isError;
  const message = !token
    ? 'В ссылке нет токена подтверждения. Откройте письмо целиком или запросите новое.'
    : getApiErrorMessage(verify.error, 'Ссылка недействительна или устарела. Запросите новое письмо.');

  if (!failed) {
    return (
      <AuthLayout
        eyebrow="Подтверждение"
        title="Проверяем ссылку"
        description="Это займёт пару секунд."
        footer={null}
      >
        <p role="status" className="text-sm text-ink-600">
          Подтверждаем адрес электронной почты…
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Подтверждение"
      title="Ссылка не сработала"
      description="Ссылки действуют ограниченное время и срабатывают один раз."
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
      <div className="space-y-5">
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {message}
        </p>

        <form
          className="space-y-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!email.trim()) {
              return;
            }
            resend.mutate(email.trim());
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="verify-email">Email аккаунта</Label>
            <Input
              id="verify-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <Button
            className="w-full"
            type="submit"
            variant="outline"
            disabled={resend.isPending || !email.trim()}
          >
            {resend.isPending ? 'Отправляем…' : 'Отправить новое письмо'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
