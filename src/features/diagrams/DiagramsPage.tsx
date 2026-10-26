import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDeferredValue, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Network, Plus, Search, Workflow } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/shared/api/errors';
import { formatDate } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { ErrorState } from '@/shared/ui/error-state';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { createDiagram, type DiagramType } from './api';
import { diagramTypeLabels, diagramTypeOptions } from './constants';
import { useDiagrams } from './queries';

export function DiagramsPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search.trim());
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DiagramType>('relationship');
  const diagramsQuery = useDiagrams(projectId, deferred);
  const diagrams = diagramsQuery.data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      createDiagram(projectId, {
        title: title.trim(),
        type,
        canonical: {
          schemaVersion: 1,
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      }),
    onSuccess: (diagram) => {
      void queryClient.invalidateQueries({ queryKey: ['diagrams', projectId] });
      setCreateOpen(false);
      setTitle('');
      void navigate({
        to: '/projects/$projectId/diagrams/$diagramId',
        params: { projectId, diagramId: diagram.id },
      });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, 'Не удалось создать схему')),
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-700">
            <Workflow size={14} />
            Схемы истории
          </div>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
            Схемы
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
            Карты связей персонажей, сюжетные линии и свободные доски. Схемы
            редактируются совместно и сохраняются автоматически.
          </p>
        </div>
        <Button variant="accent" onClick={() => setCreateOpen(true)} type="button">
          <Plus size={15} />
          Новая схема
        </Button>
      </div>

      <label className="relative mt-6 block max-w-md">
        <span className="sr-only">Поиск схем</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          size={16}
        />
        <Input
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Найти схему по названию"
        />
      </label>

      <div className="mt-6">
        {diagramsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="rounded-lg border border-paper-200 bg-white/55 p-5"
              >
                <Skeleton className="h-32 w-full" />
                <Skeleton className="mt-3 h-5 w-1/2" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : diagramsQuery.isError ? (
          <ErrorState
            title="Не удалось загрузить схемы"
            description={getApiErrorMessage(
              diagramsQuery.error,
              'Проверьте соединение и повторите попытку.',
            )}
            onRetry={() => void diagramsQuery.refetch()}
          />
        ) : diagrams.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-paper-300 bg-white/40 px-6 py-16 text-center">
            <Network size={26} className="text-ink-400" />
            <p className="font-serif text-lg text-ink-800">
              {deferred ? 'Схемы не найдены' : 'Схем пока нет'}
            </p>
            <p className="max-w-md text-sm text-ink-500">
              {deferred
                ? 'Попробуйте другой запрос.'
                : 'Создайте карту связей персонажей или свободную доску и наполните её из палитры.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {diagrams.map((diagram) => (
              <Link
                key={diagram.id}
                className="group overflow-hidden rounded-lg border border-paper-200 bg-white/60 transition hover:border-accent-300 hover:shadow-sm"
                params={{ projectId, diagramId: diagram.id }}
                to="/projects/$projectId/diagrams/$diagramId"
              >
                <div className="flex h-36 items-center justify-center border-b border-paper-200 bg-paper-100/60">
                  {diagram.thumbnailUrl ? (
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      src={diagram.thumbnailUrl}
                    />
                  ) : (
                    <Network
                      className="text-ink-300 transition group-hover:text-accent-500"
                      size={34}
                    />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="line-clamp-1 font-serif text-lg text-ink-900">
                      {diagram.title}
                    </h2>
                    <Badge tone="neutral">
                      {diagramTypeLabels[diagram.type]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[11px] text-ink-400">
                    Обновлена {formatDate(diagram.updatedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Новая схема</DialogTitle>
            <DialogDescription>
              Выберите тип — его можно изменить позже в настройках схемы.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block">
              <Label htmlFor="diagram-create-title">Название</Label>
              <Input
                id="diagram-create-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Связи героев"
                maxLength={200}
              />
            </label>
            <label className="block">
              <Label htmlFor="diagram-create-type">Тип</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as DiagramType)}
              >
                <SelectTrigger id="diagram-create-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {diagramTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setCreateOpen(false)}
              type="button"
              variant="outline"
            >
              Отмена
            </Button>
            <Button
              disabled={!title.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              type="button"
              variant="accent"
            >
              {createMutation.isPending ? 'Создаём…' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
