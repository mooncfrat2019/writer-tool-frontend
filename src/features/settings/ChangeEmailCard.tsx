import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '@/shared/api/client';
import { getApiErrorMessage, getApiProblemCode } from '@/shared/api/errors';
import { ApiError, unwrap } from '@/shared/api/request';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { changeEmailSchema, type ChangeEmailValues } from '@/features/auth/schemas';
import { useSession } from '@/features/auth/session';

type Challenge = {
  challengeToken: string;
  expiresAt: string;
  method: 'email' | 'totp';
};

export function ChangeEmailCard() {
  const { user } = useSession();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<ChangeEmailValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: '', currentPassword: '' },
  });

  const requestCode = useMutation({
    mutationFn: async (currentPassword: string) =>
      unwrap(
        await api.POST('/auth/2fa/challenge', {
          body: { currentPassword, purpose: 'change_email' },
        }),
      ),
    onMutate: () => {
      setError(null);
      setSentTo(null);
    },
    onSuccess: (data) => setChallenge(data),
    onError: (requestError) => {
      setError(
        getApiErrorMessage(
          requestError,
          'Не удалось отправить код подтверждения.',
        ),
      );
    },
  });

  const changeEmail = useMutation({
    mutationFn: async (values: ChangeEmailValues) => {
      const result = await api.POST('/auth/change-email', {
        body: {
          newEmail: values.newEmail,
          currentPassword: values.currentPassword,
          ...(challenge
            ? { challengeToken: challenge.challengeToken, code }
            : {}),
        },
      });
      if (result.error) {
        throw new ApiError(result.error);
      }
      return result.data;
    },
    onMutate: () => {
      setError(null);
      setSentTo(null);
    },
    onSuccess: (data) => {
      setSentTo(data?.email ?? form.getValues('newEmail'));
      form.reset();
      setChallenge(null);
      setCode('');
    },
    onError: (changeError) => {
      const problem = getApiProblemCode(changeError);
      if (problem === 'invalid_current_password') {
        setError('Текущий пароль неверен.');
        return;
      }
      if (problem === 'email_exists') {
        setError('Этот адрес уже используется другим аккаунтом.');
        return;
      }
      if (problem === 'invalid_two_factor_code') {
        setError('Неверный код из письма.');
        return;
      }
      if (problem === 'two_factor_required') {
        setError('Сначала запросите и введите код подтверждения.');
        return;
      }
      setError(
        getApiErrorMessage(changeError, 'Не удалось начать смену email.'),
      );
    },
  });

  const startCode = async () => {
    const valid = await form.trigger('currentPassword');
    if (!valid) {
      return;
    }
    requestCode.mutate(form.getValues('currentPassword'));
  };

  const codeReady = /^[0-9]{6}$/.test(code.trim());
  const needsCode = Boolean(user?.twoFactorEnabled);
  const canSubmit = !needsCode || Boolean(challenge && codeReady);

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail size={18} className="text-accent-700" />
          <CardTitle>Смена email</CardTitle>
        </div>
        <CardDescription>
          Новый адрес нужно подтвердить по ссылке. Текущий адрес:{' '}
          <span className="font-medium text-ink-700">{user?.email ?? '—'}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          noValidate
          onSubmit={form.handleSubmit((values) => changeEmail.mutate(values))}
        >
          <div className="space-y-2">
            <Label htmlFor="newEmail">Новый email</Label>
            <Input
              id="newEmail"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(form.formState.errors.newEmail)}
              aria-describedby={
                form.formState.errors.newEmail ? 'newEmail-error' : undefined
              }
              {...form.register('newEmail')}
            />
            {form.formState.errors.newEmail ? (
              <p id="newEmail-error" className="text-xs text-red-700">
                {form.formState.errors.newEmail.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailCurrentPassword">Текущий пароль</Label>
            <Input
              id="emailCurrentPassword"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(form.formState.errors.currentPassword)}
              aria-describedby={
                form.formState.errors.currentPassword
                  ? 'emailCurrentPassword-error'
                  : undefined
              }
              {...form.register('currentPassword')}
            />
            {form.formState.errors.currentPassword ? (
              <p id="emailCurrentPassword-error" className="text-xs text-red-700">
                {form.formState.errors.currentPassword.message}
              </p>
            ) : null}
          </div>

          {needsCode ? (
            <div className="space-y-3 rounded-md border border-paper-200 bg-paper-100/60 p-4">
              <p className="text-sm text-ink-700">
                Для аккаунта включена двухфакторная защита.{' '}
                {user?.twoFactorMethod === 'totp'
                  ? 'Введите код из приложения-аутентификатора.'
                  : 'Запросите код на текущую почту и введите его ниже.'}
              </p>
              {challenge ? (
                <div className="space-y-2">
                  <Label htmlFor="emailCode">
                    {challenge.method === 'totp'
                      ? 'Код из приложения'
                      : 'Код из письма'}
                  </Label>
                  <Input
                    id="emailCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={requestCode.isPending}
                  onClick={() => void startCode()}
                >
                  {requestCode.isPending
                    ? 'Проверяем…'
                    : user?.twoFactorMethod === 'totp'
                      ? 'Ввести код из приложения'
                      : 'Получить код'}
                </Button>
              )}
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          ) : null}

          {sentTo ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Письмо для подтверждения отправлено на <strong>{sentTo}</strong>.
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={changeEmail.isPending || !canSubmit}
          >
            {changeEmail.isPending ? 'Отправляем…' : 'Сменить email'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
