import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { BookOpen, KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage, getApiProblemCode } from '@/shared/api/errors';
import { ApiError } from '@/shared/api/request';
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
import { TwoFactorCard } from './TwoFactorCard';
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from '@/features/auth/schemas';
import { useSession } from '@/features/auth/session';
import { UserMenu } from '@/features/auth/UserMenu';

export function SettingsPage() {
  const { user } = useSession();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const changePassword = useMutation({
    mutationFn: async (values: ChangePasswordValues) => {
      const result = await api.POST('/auth/change-password', {
        body: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
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
      reset();
      toast.success('Пароль изменён. Остальные сессии завершены.');
    },
    onError: (error) => {
      const code = getApiProblemCode(error);
      if (code === 'invalid_current_password') {
        setFormError('Текущий пароль неверен.');
        return;
      }
      if (code === 'password_unchanged') {
        setFormError('Новый пароль должен отличаться от текущего.');
        return;
      }
      setFormError(
        getApiErrorMessage(error, 'Не удалось изменить пароль. Попробуйте ещё раз.'),
      );
    },
  });

  return (
    <div className="min-h-screen bg-paper-50">
      <header className="border-b border-paper-200 bg-paper-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link className="flex items-center gap-3" to="/projects">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink-900 text-paper-50">
              <BookOpen size={17} />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-none">
                Writer Tool
              </span>
              <span className="mt-1 hidden text-xs text-ink-500 sm:block">
                мастерская текста
              </span>
            </span>
          </Link>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-700">
          Аккаунт
        </p>
        <h1 className="mt-3 font-serif text-3xl text-ink-900">Настройки</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-500">
          {user?.hasPassword
            ? 'Управляйте доступом к своей мастерской. Смена пароля завершит все остальные сессии, но оставит текущую открытой.'
            : 'Аккаунт создан через внешний сервис входа. Почта и пароль в нём не используются.'}
        </p>

        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-accent-700" />
              <CardTitle>Профиль</CardTitle>
            </div>
            <CardDescription>
              Псевдоним, под которым вас видят участники проектов.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-ink-500">
                  Псевдоним
                </dt>
                <dd className="mt-1 text-sm text-ink-900">
                  {user?.displayName ?? '—'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {user?.hasPassword ? (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound size={18} className="text-accent-700" />
              <CardTitle>Смена пароля</CardTitle>
            </div>
            <CardDescription>
              Минимум 8 символов. Новый пароль не должен совпадать с текущим.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              noValidate
              onSubmit={handleSubmit((values) => changePassword.mutate(values))}
            >
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Текущий пароль</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.currentPassword)}
                  aria-describedby={
                    errors.currentPassword ? 'currentPassword-error' : undefined
                  }
                  {...register('currentPassword')}
                />
                {errors.currentPassword ? (
                  <p id="currentPassword-error" className="text-xs text-red-700">
                    {errors.currentPassword.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Новый пароль</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(errors.newPassword)}
                  aria-describedby={
                    errors.newPassword ? 'newPassword-error' : undefined
                  }
                  {...register('newPassword')}
                />
                {errors.newPassword ? (
                  <p id="newPassword-error" className="text-xs text-red-700">
                    {errors.newPassword.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Повторите новый пароль</Label>
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

              <Button type="submit" disabled={changePassword.isPending}>
                {changePassword.isPending ? 'Меняем пароль…' : 'Изменить пароль'}
              </Button>
            </form>
          </CardContent>
        </Card>
        ) : null}

        {user?.hasPassword ? <TwoFactorCard /> : null}
      </main>
    </div>
  );
}
