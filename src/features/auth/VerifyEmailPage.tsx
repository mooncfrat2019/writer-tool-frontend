import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { AuthLayout } from './AuthLayout';
import { setSessionFromAuth } from './session';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = useSearch({ from: '/verify-email' }) as { token?: string };
  const started = useRef(false);
  const [email, setEmail] = useState('');

  const verify = useMutation({
    mutationFn: async (value: string) =>
      unwrap(
        await api.POST('/auth/verify-email', {
          body: { token: value },
        }),
      ),
    onSuccess: (data) => {
      setSessionFromAuth(data);
      queryClient.clear();
      toast.success('Почта подтверждена. Добро пожаловать в мастерскую.');
      void navigate({ to: '/projects' });
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
          body: { email: value },
        }),
      ),
    onSuccess: () => {
      toast.success('Если аккаунт существует, письмо отправлено ещё раз.');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось отправить письмо. Попробуйте позже.'));
    },
  });

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
