import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearch } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { api } from '@/shared/api/client';
import { getApiErrorMessage, getApiProblemCode } from '@/shared/api/errors';
import { ApiError } from '@/shared/api/request';
import { clearSessionState } from './session';
import { AuthLayout } from './AuthLayout';

export function ConfirmEmailChangePage() {
  const search = useSearch({ strict: false }) as { token?: string };
  const token = search.token?.trim() ?? '';
  const queryClient = useQueryClient();
  const started = useRef(false);

  const confirm = useMutation({
    mutationFn: async () => {
      const result = await api.POST('/auth/confirm-email-change', {
        body: { token },
      });
      if (result.error) {
        throw new ApiError(result.error);
      }
      if (result.response.status !== 204) {
        throw new Error(`Unexpected status ${result.response.status}`);
      }
    },
    onSuccess: () => {
      clearSessionState();
      queryClient.clear();
    },
  });

  useEffect(() => {
    if (!token || started.current) {
      return;
    }
    started.current = true;
    confirm.mutate();
  }, [confirm, token]);

  if (!token) {
    return (
      <AuthLayout
        eyebrow="Смена email"
        title="Ссылка недействительна"
        description="В ссылке нет токена подтверждения."
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
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Запросите смену email ещё раз в настройках аккаунта.
        </p>
      </AuthLayout>
    );
  }

  if (confirm.isIdle || confirm.isPending) {
    return (
      <AuthLayout
        eyebrow="Смена email"
        title="Подтверждаем адрес"
        description="Это займёт несколько секунд."
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
        <p className="rounded-md border border-paper-200 bg-paper-100/70 px-4 py-3 text-sm text-ink-700">
          Проверяем ссылку…
        </p>
      </AuthLayout>
    );
  }

  if (confirm.isError) {
    const code = getApiProblemCode(confirm.error);
    return (
      <AuthLayout
        eyebrow="Смена email"
        title="Не удалось подтвердить"
        description={
          code === 'email_exists'
            ? 'Этот адрес уже используется другим аккаунтом.'
            : 'Ссылка недействительна, истекла или уже использована.'
        }
        footer={
          <p>
            <a
              className="font-medium text-accent-700 underline-offset-4 hover:underline"
              href="/settings"
            >
              Вернуться в настройки
            </a>
          </p>
        }
      >
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {getApiErrorMessage(confirm.error, 'Попробуйте запросить смену email ещё раз.')}
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Готово"
      title="Email обновлён"
      description="Все сессии завершены. Войдите с новым адресом и паролем."
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
        Если вы не запрашивали смену, напишите администратору.
      </p>
    </AuthLayout>
  );
}
