import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { ImageIcon, Images } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { formatDate } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

type Attachment = components['schemas']['Attachment'];

function TargetLink({
  attachment,
  projectId,
}: {
  attachment: Attachment;
  projectId: string;
}) {
  if (!attachment.targetName) {
    return <span className="text-ink-500">Без привязки</span>;
  }
  const className =
    'font-medium text-ink-900 underline-offset-2 transition hover:text-accent-700 hover:underline';
  if (attachment.targetType === 'character') {
    return (
      <Link
        className={className}
        to="/projects/$projectId/characters/$characterId"
        params={{ projectId, characterId: attachment.targetId }}
      >
        {attachment.targetName}
      </Link>
    );
  }
  if (attachment.targetType === 'world') {
    return (
      <Link
        className={className}
        to="/projects/$projectId/worlds/$worldId"
        params={{ projectId, worldId: attachment.targetId }}
      >
        {attachment.targetName}
      </Link>
    );
  }
  return <span className="font-medium text-ink-900">{attachment.targetName}</span>;
}

export function GalleryPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const [active, setActive] = useState<Attachment | null>(null);

  const galleryQuery = useQuery({
    queryKey: ['project-attachments', projectId, 'illustration'],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}/attachments', {
          params: {
            path: { projectId },
            query: { role: 'illustration', limit: 100 },
          },
        }),
      ),
  });

  const items = galleryQuery.data?.items ?? [];

  return (
    <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-8 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-700">
            <Images size={14} />
            Визуальная память проекта
          </div>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
            Галерея
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
            Все иллюстрации проекта в одном месте. Откройте картинку, чтобы
            рассмотреть детали, или перейдите к персонажу, которому она
            принадлежит.
          </p>
        </div>
        {!galleryQuery.isLoading && !galleryQuery.isError ? (
          <Badge tone="neutral">{items.length} иллюстраций</Badge>
        ) : null}
      </div>

      <div className="mt-6">
        {galleryQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="aspect-[4/3] w-full rounded-lg" />
            ))}
          </div>
        ) : galleryQuery.isError ? (
          <ErrorState
            title="Галерея не загрузилась"
            description={getApiErrorMessage(
              galleryQuery.error,
              'Не удалось получить иллюстрации проекта.',
            )}
            onRetry={() => void galleryQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-paper-300 px-6 py-16 text-center">
            <Images className="mx-auto text-ink-500" size={26} />
            <p className="mt-3 font-serif text-xl text-ink-900">Пока пусто</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
              Иллюстрации появляются здесь, когда вы загружаете их в профилях
              персонажей.
            </p>
          </div>
        ) : (
          <ul
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            data-testid="gallery-grid"
          >
            {items.map((attachment) => (
              <li
                key={attachment.id}
                className="group overflow-hidden rounded-lg border border-paper-200 bg-white/55"
                data-testid="gallery-card"
              >
                <button
                  type="button"
                  className="block aspect-[4/3] w-full bg-paper-100"
                  aria-label={`Открыть иллюстрацию ${attachment.caption || ''}`}
                  onClick={() => setActive(attachment)}
                >
                  {attachment.url ? (
                    <img
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      src={attachment.url}
                      alt={attachment.caption || 'Иллюстрация проекта'}
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-ink-500">
                      <ImageIcon size={28} />
                    </span>
                  )}
                </button>
                <div className="p-3">
                  <p className="line-clamp-2 min-h-5 text-sm font-medium text-ink-900">
                    {attachment.caption || 'Без подписи'}
                  </p>
                  <p className="mt-2 text-xs text-ink-500">
                    <TargetLink attachment={attachment} projectId={projectId} />
                    <span className="mx-1.5">·</span>
                    {formatDate(attachment.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={Boolean(active)}
        onOpenChange={(open) => {
          if (!open) {
            setActive(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{active?.caption || 'Иллюстрация'}</DialogTitle>
            <DialogDescription>
              {active ? (
                <TargetLink attachment={active} projectId={projectId} />
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {active?.url ? (
            <img
              className="max-h-[70vh] w-full rounded-md object-contain"
              src={active.url}
              alt={active.caption || 'Иллюстрация проекта'}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
