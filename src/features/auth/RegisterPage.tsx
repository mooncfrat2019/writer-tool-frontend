import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { AuthLayout } from './AuthLayout';
import { registerSchema, type RegisterValues } from './schemas';
import { getAuthRedirect, redirectQuery } from './redirect';
import { setSessionFromAuth } from './session';

const isMockMode =
  import.meta.env.DEV && (import.meta.env.VITE_API_MODE ?? 'mock') === 'mock';

export function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const redirect = getAuthRedirect();
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  const signUp = useMutation({
    mutationFn: async (values: RegisterValues) =>
      unwrap(
        await api.POST('/auth/register', {
          body: redirect ? { ...values, redirect } : values,
        }),
      ),
    onMutate: () => setFormError(null),
    onSuccess: (data) => {
      setSubmittedEmail(data.email);
    },
    onError: (error) => {
      setFormError(getApiErrorMessage(error, 'Не удалось создать аккаунт. Попробуйте ещё раз.'));
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

  // The mock API has no mailbox. This button exercises the confirmation route
  // in local development without a backend.
  const mockVerify = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST('/auth/verify-email', {
          body: { token: 'mock-verification' },
        }),
      ),
    onSuccess: (data) => {
      setSessionFromAuth(data);
      queryClient.clear();
      if (redirect) {
        window.location.assign(redirect);
        return;
      }
      void navigate({ to: '/projects' });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось подтвердить почту.'));
    },
  });

  if (submittedEmail) {
    return (
      <AuthLayout
        eyebrow="Почти готово"
        title="Проверьте почту"
        description="Мы отправили ссылку для подтверждения аккаунта."
        footer={
          <p>
            Уже подтвердили?{' '}
            <a
              className="font-medium text-accent-700 underline-offset-4 hover:underline"
              href={`/login${redirectQuery(redirect)}`}
            >
              Войти
            </a>
          </p>
        }
      >
        <div className="space-y-5">
          <p className="rounded-md border border-paper-200 bg-paper-100/70 px-3 py-2 text-sm leading-relaxed text-ink-700">
            Письмо отправлено на <strong>{submittedEmail}</strong>. Перейдите по ссылке
            из него, чтобы подтвердить адрес и войти.
          </p>

          <Button
            className="w-full"
            type="button"
            variant="outline"
            disabled={resend.isPending}
            onClick={() => resend.mutate(submittedEmail)}
          >
            {resend.isPending ? 'Отправляем…' : 'Отправить ещё раз'}
          </Button>

          {isMockMode ? (
            <Button
              className="w-full"
              type="button"
              variant="ghost"
              disabled={mockVerify.isPending}
              onClick={() => mockVerify.mutate()}
            >
              {mockVerify.isPending ? 'Подтверждаем…' : 'Демо: подтвердить почту'}
            </Button>
          ) : null}

          <p className="text-xs leading-relaxed text-ink-500">
            Письма нет? Проверьте папку «Спам» и правильность адреса. Повторная
            отправка доступна раз в минуту.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Начало работы"
      title="Создать аккаунт"
      description="Одно пространство для книги, её героев и всех версий рукописи."
      footer={
        <p>
          Уже есть аккаунт?{' '}
          <a
            className="font-medium text-accent-700 underline-offset-4 hover:underline"
            href={`/login${redirectQuery(redirect)}`}
          >
            Войти
          </a>
        </p>
      }
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit((values) => signUp.mutate(values))}
      >
        <div className="space-y-2">
          <Label htmlFor="displayName">Как вас зовут</Label>
          <Input
            id="displayName"
            autoComplete="name"
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={errors.displayName ? 'displayName-error' : undefined}
            {...register('displayName')}
          />
          {errors.displayName ? (
            <p id="displayName-error" className="text-xs text-red-700">
              {errors.displayName.message}
            </p>
          ) : null}
        </div>

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
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby="password-hint"
            {...register('password')}
          />
          <p id="password-hint" className="text-xs text-ink-500">
            Не короче 8 символов.
          </p>
          {errors.password ? (
            <p className="text-xs text-red-700">{errors.password.message}</p>
          ) : null}
        </div>

        {formError ? (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </p>
        ) : null}

        <Button className="w-full" type="submit" disabled={signUp.isPending}>
          {signUp.isPending ? 'Создаём аккаунт…' : 'Создать аккаунт'}
        </Button>

        <p className="text-xs leading-relaxed text-ink-500">
          После регистрации мы отправим письмо для подтверждения адреса. Без него
          войти в аккаунт нельзя.
        </p>
      </form>
    </AuthLayout>
  );
}
