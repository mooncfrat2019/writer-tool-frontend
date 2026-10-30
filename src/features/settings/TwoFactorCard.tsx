import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage, getApiProblemCode } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
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
import {
  twoFactorPasswordSchema,
  type TwoFactorPasswordValues,
} from '@/features/auth/schemas';
import { updateSessionUser, useSession } from '@/features/auth/session';

type Challenge = {
  challengeToken: string;
  expiresAt: string;
  method: 'email' | 'totp';
  secret?: string;
  otpauthUrl?: string;
};

type Mode = 'enable' | 'disable';
type Method = 'email' | 'totp';

export function TwoFactorCard() {
  const { user } = useSession();
  const enabled = user?.twoFactorEnabled ?? false;
  const [mode, setMode] = useState<Mode | null>(null);
  const [method, setMethod] = useState<Method>('email');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const form = useForm<TwoFactorPasswordValues>({
    resolver: zodResolver(twoFactorPasswordSchema),
    defaultValues: { currentPassword: '' },
  });

  const start = useMutation({
    mutationFn: async (values: TwoFactorPasswordValues) => {
      if (enabled) {
        return unwrap(
          await api.POST('/auth/2fa/disable', {
            body: { currentPassword: values.currentPassword },
          }),
        );
      }
      return unwrap(
        await api.POST('/auth/2fa/enable', {
          body: {
            currentPassword: values.currentPassword,
            method,
          },
        }),
      );
    },
    onMutate: () => {
      setError(null);
      setMode(null);
      setChallenge(null);
      setCode('');
    },
    onSuccess: (data) => {
      setMode(enabled ? 'disable' : 'enable');
      setChallenge(data);
      form.reset();
    },
    onError: (startError) => {
      const problem = getApiProblemCode(startError);
      if (problem === 'invalid_current_password') {
        setError('Текущий пароль неверен.');
        return;
      }
      setError(
        getApiErrorMessage(
          startError,
          'Не удалось начать настройку двухфакторной защиты.',
        ),
      );
    },
  });

  const confirm = useMutation({
    mutationFn: async () => {
      if (!challenge || !mode) {
        throw new Error('Two-factor challenge is missing');
      }
      if (mode === 'enable') {
        return unwrap(
          await api.POST('/auth/2fa/enable/confirm', {
            body: { challengeToken: challenge.challengeToken, code },
          }),
        );
      }
      return unwrap(
        await api.POST('/auth/2fa/disable/confirm', {
          body: { challengeToken: challenge.challengeToken, code },
        }),
      );
    },
    onMutate: () => setError(null),
    onSuccess: (updatedUser) => {
      updateSessionUser(updatedUser);
      toast.success(
        mode === 'enable'
          ? 'Двухфакторная защита включена.'
          : 'Двухфакторная защита выключена.',
      );
      setMode(null);
      setChallenge(null);
      setCode('');
    },
    onError: (confirmError) => {
      const problem = getApiProblemCode(confirmError);
      if (problem === 'invalid_two_factor_code') {
        setError('Неверный код.');
        return;
      }
      if (problem === 'too_many_attempts') {
        setMode(null);
        setChallenge(null);
        setCode('');
        setError('Слишком много попыток. Начните заново.');
        return;
      }
      setError(
        getApiErrorMessage(
          confirmError,
          'Не удалось подтвердить код. Попробуйте ещё раз.',
        ),
      );
    },
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-accent-700" />
          <CardTitle>Двухфакторная защита</CardTitle>
        </div>
        <CardDescription>
          {enabled ? (
            <>
              Сейчас включена:{' '}
              <strong className="text-ink-700">
                {user?.twoFactorMethod === 'totp'
                  ? 'приложение-аутентификатор'
                  : 'код на почту'}
              </strong>
              .
            </>
          ) : (
            'Выберите второй фактор: код на почту или приложение-аутентификатор.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {challenge ? (
          <div className="space-y-4">
            {challenge.method === 'totp' &&
            mode === 'enable' &&
            challenge.otpauthUrl ? (
              <div className="space-y-3 rounded-md border border-paper-200 bg-white p-4">
                <p className="text-sm text-ink-700">
                  Отсканируйте QR-код в Google Authenticator (или аналогичном
                  приложении).
                </p>
                <div className="flex justify-center">
                  <QRCode value={challenge.otpauthUrl} size={180} />
                </div>
                {challenge.secret ? (
                  <p className="break-all rounded bg-paper-100 px-3 py-2 text-xs text-ink-600">
                    Ключ вручную: <code>{challenge.secret}</code>
                  </p>
                ) : null}
              </div>
            ) : null}

            <p className="text-sm text-ink-700">
              {challenge.method === 'totp'
                ? 'Введите шестизначный код из приложения.'
                : 'Код отправлен на почту аккаунта.'}{' '}
              {mode === 'enable' ? 'Это включит защиту.' : 'Это выключит защиту.'}
            </p>

            <div className="space-y-2">
              <Label htmlFor="twoFactorCode">
                {challenge.method === 'totp'
                  ? 'Код из приложения'
                  : 'Код из письма'}
              </Label>
              <Input
                id="twoFactorCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={confirm.isPending || !/^[0-9]{6}$/.test(code.trim())}
                onClick={() => confirm.mutate()}
              >
                {confirm.isPending ? 'Проверяем…' : 'Подтвердить'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMode(null);
                  setChallenge(null);
                  setCode('');
                  setError(null);
                }}
              >
                Отмена
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-4"
            noValidate
            onSubmit={form.handleSubmit((values) => start.mutate(values))}
          >
            {!enabled ? (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-ink-900">
                  Второй фактор
                </legend>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-paper-200 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="twoFactorMethod"
                    value="email"
                    checked={method === 'email'}
                    onChange={() => setMethod('email')}
                  />
                  Код на почту
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-paper-200 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="twoFactorMethod"
                    value="totp"
                    checked={method === 'totp'}
                    onChange={() => setMethod('totp')}
                  />
                  Приложение-аутентификатор (Google Authenticator)
                </label>
              </fieldset>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="twoFactorPassword">Текущий пароль</Label>
              <Input
                id="twoFactorPassword"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(form.formState.errors.currentPassword)}
                aria-describedby={
                  form.formState.errors.currentPassword
                    ? 'twoFactorPassword-error'
                    : undefined
                }
                {...form.register('currentPassword')}
              />
              {form.formState.errors.currentPassword ? (
                <p id="twoFactorPassword-error" className="text-xs text-red-700">
                  {form.formState.errors.currentPassword.message}
                </p>
              ) : null}
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={start.isPending}>
              {start.isPending
                ? 'Проверяем…'
                : enabled
                  ? 'Выключить 2FA'
                  : 'Включить 2FA'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
