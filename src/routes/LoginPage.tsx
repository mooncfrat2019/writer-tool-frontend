import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import { setAccessToken } from '@/shared/api/token';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

const schema = z.object({
  email: z.email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: 'author@example.com',
      password: 'password123',
    },
  });

  const login = useMutation({
    mutationFn: async (values: FormValues) =>
      unwrap(
        await api.POST('/auth/login', {
          body: values,
        }),
      ),
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      void navigate({ to: '/projects' });
    },
  });

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-ink-950 p-12 text-paper-50 lg:flex">
        <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-paper-300">
          <span className="h-2 w-2 rounded-full bg-accent-500" />
          Writer Tool
        </div>
        <div className="max-w-md">
          <p className="mb-4 font-serif text-5xl leading-tight">
            Место, где книга собирается из идей.
          </p>
          <p className="text-paper-300">
            Персонажи, миры, структура, таймлайн и рукопись — в одном пространстве.
          </p>
        </div>
        <p className="text-xs text-paper-300/70">Phase 1 · mock-first frontend</p>
      </section>

      <section className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-ink-500">
              <span className="h-2 w-2 rounded-full bg-accent-500" />
              Writer Tool
            </div>
          </div>
          <h1 className="mb-2 font-serif text-3xl">{t('login')}</h1>
          <p className="mb-8 text-sm text-ink-500">Продолжите работу над книгой.</p>

          <form
            className="space-y-4"
            onSubmit={handleSubmit((values) => login.mutate(values))}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                {t('email')}
              </label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email ? (
                <p className="text-xs text-red-700">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                {t('password')}
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password ? (
                <p className="text-xs text-red-700">{errors.password.message}</p>
              ) : null}
            </div>

            {login.error ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                {login.error.message}
              </p>
            ) : null}

            <Button className="w-full" type="submit" disabled={login.isPending}>
              {login.isPending ? t('loading') : t('login')}
            </Button>
          </form>

          <p className="mt-6 text-sm text-ink-500">
            Нет аккаунта?{' '}
            <Link className="font-medium text-accent-700 hover:underline" to="/register">
              {t('register')}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
