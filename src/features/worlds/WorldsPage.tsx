import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Globe2, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import { formatDate } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/error-state';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { CustomFieldsManager } from '@/features/customFields/CustomFieldsManager';
import { optionLabel, worldTypeOptions } from './constants';
import { useWorlds } from './queries';
import { WorldFormDialog } from './WorldDialogs';

function WorldsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="rounded-lg border border-paper-200 bg-white/55 p-5">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <Skeleton className="mt-5 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function WorldsPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}', {
          params: { path: { projectId } },
        }),
      ),
  });
  const worldsQuery = useWorlds(projectId);
  const canEdit = projectQuery.data?.role !== 'viewer';

  const query = search.trim().toLocaleLowerCase('ru');
  const worlds = useMemo(() => worldsQuery.data?.items ?? [], [worldsQuery.data]);
  const filtered = useMemo(
    () =>
      worlds.filter((world) => {
        if (!query) {
          return true;
        }
        return [world.name, world.type, world.summary, world.description]
          .join(' ')
          .toLocaleLowerCase('ru')
          .includes(query);
      }),
    [worlds, query],
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-700">
            <Globe2 size={14} />
            Мир истории
          </div>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
            Миры
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
            Законы, география, локации, фракции и лор — всё, на чём держится история.
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setFieldsOpen(true)}>
              Поля мира
            </Button>
            <Button variant="accent" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Новый мир
            </Button>
          </div>
        ) : (
          <Badge className="h-8 px-3" tone="neutral">
            Только чтение
          </Badge>
        )}
      </div>

      <div className="mt-8 rounded-lg border border-paper-200 bg-white/45 p-3 sm:p-4">
        <label className="relative block max-w-xl">
          <span className="sr-only">Поиск миров</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
            size={16}
          />
          <Input
            className="pl-9"
            type="search"
            value={search}
            placeholder="Название, тип или описание…"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {!worldsQuery.isLoading && !worldsQuery.isError ? (
          <p className="mt-3 text-xs text-ink-500" aria-live="polite">
            {query
              ? `Показано: ${filtered.length} из ${worlds.length}`
              : `В проекте ${worlds.length} ${worlds.length === 1 ? 'мир' : 'миров'}`}
          </p>
        ) : null}
      </div>

      <div className="mt-6">
        {worldsQuery.isLoading ? (
          <WorldsSkeleton />
        ) : worldsQuery.isError ? (
          <ErrorState
            title="Миры не загрузились"
            description={getApiErrorMessage(
              worldsQuery.error,
              'Не удалось получить список миров.',
            )}
            onRetry={() => void worldsQuery.refetch()}
          />
        ) : worlds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-paper-300 bg-white/35 px-6 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-paper-100 text-ink-500">
              <Globe2 size={22} />
            </span>
            <h2 className="mt-5 font-serif text-2xl text-ink-900">Мир ещё не создан</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
              Начните с одного мира: его законов и географии. Детали можно
              добавлять по мере работы над книгой.
            </p>
            {canEdit ? (
              <Button
                className="mt-6"
                variant="accent"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={16} />
                Создать мир
              </Button>
            ) : null}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-paper-300 px-6 py-14 text-center">
            <p className="font-serif text-2xl text-ink-900">Ничего не нашлось</p>
            <p className="mt-2 text-sm text-ink-500">
              Попробуйте другое название или тип мира.
            </p>
            <Button className="mt-5" variant="outline" onClick={() => setSearch('')}>
              Сбросить поиск
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((world) => (
              <Link
                key={world.id}
                to="/projects/$projectId/worlds/$worldId"
                params={{ projectId, worldId: world.id }}
                className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                data-testid="world-card"
              >
                <article className="flex h-full flex-col rounded-lg border border-paper-200 bg-white/65 p-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-paper-300 group-hover:shadow-[0_8px_28px_rgba(31,29,26,0.07)]">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-serif text-2xl leading-snug text-ink-900">
                      {world.name}
                    </h2>
                    {world.type ? (
                      <Badge tone="accent">
                        {optionLabel(worldTypeOptions, world.type, world.type)}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 line-clamp-3 min-h-12 text-sm leading-relaxed text-ink-500">
                    {world.summary || world.description || 'Описание пока не заполнено.'}
                  </p>
                  <p className="mt-auto border-t border-paper-200 pt-3 text-[11px] text-ink-500">
                    Обновлён {formatDate(world.updatedAt)}
                  </p>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>

      <WorldFormDialog
        key={createOpen ? 'open' : 'closed'}
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(world) => {
          void navigate({
            to: '/projects/$projectId/worlds/$worldId',
            params: { projectId, worldId: world.id },
          });
        }}
      />
      <CustomFieldsManager
        projectId={projectId}
        entityType="world"
        open={fieldsOpen}
        onOpenChange={setFieldsOpen}
      />
    </main>
  );
}
