import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ChevronLeft, Globe2, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import { formatDate } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { deleteWorld } from './api';
import { optionLabel, worldTypeOptions } from './constants';
import { worldKeys, useWorld } from './queries';
import { WorldFormDialog } from './WorldDialogs';
import { FactionsTab, LocationsTab, LoreTab, RulesTab } from './WorldTabs';

function OverviewBlock({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-lg border border-paper-200 bg-white/55 p-5">
      <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-ink-500">
        {title}
      </h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700">
        {text}
      </p>
    </section>
  );
}

export function WorldDetailPage() {
  const { projectId, worldId } = useParams({ strict: false }) as {
    projectId: string;
    worldId: string;
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}', {
          params: { path: { projectId } },
        }),
      ),
  });
  const worldQuery = useWorld(worldId);
  const canEdit = projectQuery.data?.role !== 'viewer';

  const remove = useMutation({
    mutationFn: () => deleteWorld(worldId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: worldKeys.list(projectId) });
      void queryClient.removeQueries({ queryKey: worldKeys.detail(worldId) });
      toast.success('Мир удалён.');
      void navigate({ to: '/projects/$projectId/worlds', params: { projectId } });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Не удалось удалить мир.')),
  });

  if (worldQuery.isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-10 w-2/3" />
        <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        <Skeleton className="mt-10 h-72 w-full" />
      </main>
    );
  }

  if (worldQuery.isError || !worldQuery.data) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8">
        <ErrorState
          title="Мир не загрузился"
          description={getApiErrorMessage(
            worldQuery.error,
            'Не удалось получить мир. Возможно, он был удалён.',
          )}
          onRetry={() => void worldQuery.refetch()}
        />
      </main>
    );
  }

  const world = worldQuery.data;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8">
      <Link
        to="/projects/$projectId/worlds"
        params={{ projectId }}
        className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 transition hover:text-ink-900"
      >
        <ChevronLeft size={14} />
        Все миры
      </Link>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-700">
              <Globe2 size={14} />
              Мир
            </span>
            {world.type ? (
              <Badge tone="accent">
                {optionLabel(worldTypeOptions, world.type, world.type)}
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
            {world.name}
          </h1>
          {world.summary ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
              {world.summary}
            </p>
          ) : null}
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil size={14} />
              Настроить мир
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-800 hover:bg-red-50 hover:text-red-900"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={14} />
              Удалить
            </Button>
          </div>
        ) : (
          <Badge className="h-8 px-3" tone="neutral">
            Только чтение
          </Badge>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {world.description ? (
          <div className="md:col-span-2">
            <OverviewBlock title="Описание" text={world.description} />
          </div>
        ) : null}
        {world.rulesSummary ? (
          <OverviewBlock title="Законы мира" text={world.rulesSummary} />
        ) : null}
        {world.history ? (
          <OverviewBlock title="История" text={world.history} />
        ) : null}
        {world.geography ? (
          <div className="md:col-span-2">
            <OverviewBlock title="География" text={world.geography} />
          </div>
        ) : null}
        {!world.description && !world.rulesSummary && !world.history && !world.geography ? (
          <div className="md:col-span-2 rounded-lg border border-dashed border-paper-300 px-6 py-10 text-center text-sm text-ink-500">
            Описание мира пока пустое. Нажмите «Настроить мир», чтобы добавить
            законы, историю и географию.
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-[11px] text-ink-500">
        Обновлён {formatDate(world.updatedAt)}
      </p>

      <Tabs defaultValue="locations" className="mt-8">
        <TabsList>
          <TabsTrigger value="locations">Локации</TabsTrigger>
          <TabsTrigger value="factions">Фракции</TabsTrigger>
          <TabsTrigger value="rules">Законы</TabsTrigger>
          <TabsTrigger value="lore">Лор</TabsTrigger>
        </TabsList>
        <TabsContent value="locations">
          <LocationsTab
            worldId={world.id}
            canEdit={canEdit}
            mapUrl={world.mapUrl ?? null}
          />
        </TabsContent>
        <TabsContent value="factions">
          <FactionsTab worldId={world.id} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="rules">
          <RulesTab worldId={world.id} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="lore">
          <LoreTab worldId={world.id} canEdit={canEdit} />
        </TabsContent>
      </Tabs>

      <WorldFormDialog
        key={`${editOpen}-${world.version}`}
        projectId={projectId}
        world={world}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Удалить мир?"
        description={`«${world.name}» и все его локации, фракции, законы и лор будут скрыты.`}
        confirmLabel="Удалить мир"
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </main>
  );
}
