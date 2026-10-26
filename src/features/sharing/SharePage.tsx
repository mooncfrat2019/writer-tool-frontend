import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { ArrowLeft, Link2, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { isRealApiMode } from '@/shared/api/mode';
import { unwrap } from '@/shared/api/request';
import { useSession } from '@/features/auth/session';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

const reasonLabels: Record<string, string> = {
  expired: 'Срок действия ссылки истёк.',
  revoked: 'Ссылка была отозвана.',
  exhausted: 'Лимит использований ссылки исчерпан.',
};

export function SharePage() {
  const { token } = useParams({ strict: false }) as { token: string };
  const session = useSession();

  const previewQuery = useQuery({
    queryKey: ['share-preview', token],
    queryFn: async () =>
      unwrap(
        await api.GET('/share-links/{token}', {
          params: { path: { token } },
        }),
      ),
    enabled: isRealApiMode && Boolean(token),
    retry: false,
  });

  const accept = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST('/share-links/{token}/accept', {
          params: { path: { token } },
        }),
      ),
    onSuccess: (result) => {
      toast.success('Доступ получен.');
      if (result.targetType === 'project') {
        window.location.assign(`/projects/${result.projectId}/structure`);
        return;
      }
      if (result.documentId) {
        window.location.assign(`/shared/documents/${result.documentId}`);
        return;
      }
      window.location.assign('/projects');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось принять приглашение.'));
    },
  });

  if (!isRealApiMode) {
    return (
      <ShareShell>
        <p className="font-serif text-2xl">Ссылки доступны в режиме реального API</p>
        <p className="mt-2 text-sm text-ink-500">
          Запустите приложение с `pnpm dev:real` и откройте ссылку снова.
        </p>
      </ShareShell>
    );
  }

  if (previewQuery.isLoading || session.status === 'initializing') {
    return (
      <ShareShell>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-9 w-80 max-w-full" />
        <Skeleton className="mt-6 h-5 w-full" />
        <Skeleton className="mt-3 h-5 w-4/5" />
      </ShareShell>
    );
  }

  if (previewQuery.isError || !previewQuery.data) {
    return (
      <ShareShell>
        <ErrorState
          title="Ссылка недоступна"
          description={getApiErrorMessage(
            previewQuery.error,
            'Проверьте ссылку или попросите новую у автора.',
          )}
          onRetry={() => void previewQuery.refetch()}
        />
      </ShareShell>
    );
  }

  const preview = previewQuery.data;
  const redirect = encodeURIComponent(`/share/${token}`);
  const roleLabel = preview.role === 'editor' ? 'редактирование' : 'просмотр';
  const targetLabel = preview.targetType === 'project' ? 'проект' : 'глава';

  return (
    <ShareShell>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-ink-500">
        <Link2 size={14} />
        Приглашение в {targetLabel}
      </div>
      <h1 className="mt-3 font-serif text-3xl leading-tight text-ink-900">
        {preview.targetTitle}
      </h1>
      <p className="mt-2 text-sm text-ink-500">{preview.projectTitle}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="accent">{roleLabel}</Badge>
        <Badge tone="neutral">{targetLabel}</Badge>
      </div>

      {!preview.valid ? (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {preview.reason
            ? reasonLabels[preview.reason] ?? 'Ссылка больше не действует.'
            : 'Ссылка больше не действует.'}
        </div>
      ) : session.status === 'authenticated' ? (
        <div className="mt-6">
          <Button
            className="w-full"
            variant="accent"
            onClick={() => accept.mutate()}
            disabled={accept.isPending}
          >
            <Link2 size={16} />
            {accept.isPending ? 'Принимаем…' : 'Принять приглашение'}
          </Button>
          <p className="mt-3 text-center text-xs text-ink-500">
            Вы войдёте как {session.user?.displayName ?? 'пользователь'}.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          <Button className="w-full" variant="accent" asChild>
            <a href={`/login?redirect=${redirect}`}>
              <LogIn size={16} />
              Войти и принять
            </a>
          </Button>
          <Button className="w-full" variant="outline" asChild>
            <a href={`/register?redirect=${redirect}`}>
              <UserPlus size={16} />
              Создать аккаунт
            </a>
          </Button>
        </div>
      )}

      <a
        className="mt-8 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
        href="/projects"
      >
        <ArrowLeft size={15} />
        К проектам
      </a>
    </ShareShell>
  );
}

function ShareShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-50 px-5 py-12">
      <section className="w-full max-w-lg rounded-xl border border-paper-200 bg-white/70 p-7 shadow-sm sm:p-9">
        {children}
      </section>
    </main>
  );
}
