import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDeferredValue, useMemo, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  CalendarDays,
  GitBranch,
  GitCommitHorizontal,
  Plus,
  Search,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
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
import {
  updateTimelineEvent,
  type TimelineEvent,
  type TimelineEventUpdate,
  type TimelineFilters,
  type TimelineMode,
} from './api';
import { parseCalendarConfig } from './calendar';
import { gregorianCalendar } from './constants';
import {
  CalendarDialog,
  PlotThreadDialog,
  TimelineEventDialog,
} from './TimelineDialogs';
import { TimelineCanvas, type CanvasCreatePoint, type CanvasMovePatch } from './TimelineCanvas';
import { timelineKeys, useTimeline } from './queries';
import { useProjectStructure } from './useProjectStructure';

const CLEAR_ID = '00000000-0000-0000-0000-000000000000';
const ALL = 'all';

type EventDialogState =
  | { kind: 'create'; draft: CanvasCreatePoint; key: number }
  | { kind: 'edit'; eventId: string };

export function TimelinePage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<TimelineMode>('world');
  const [threadFilter, setThreadFilter] = useState(ALL);
  const [characterFilter, setCharacterFilter] = useState(ALL);
  const [importanceMin, setImportanceMin] = useState('0');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [eventDialog, setEventDialog] = useState<EventDialogState | null>(null);
  const [createKey, setCreateKey] = useState(0);

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}', {
          params: { path: { projectId } },
        }),
      ),
  });
  const charactersQuery = useQuery({
    queryKey: ['characters', projectId, 'options'],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}/characters', {
          params: { path: { projectId }, query: { limit: 100 } },
        }),
      ),
  });
  const structure = useProjectStructure(projectId);

  const filters: TimelineFilters = useMemo(
    () => ({
      mode,
      plotThreadId: threadFilter === ALL ? undefined : threadFilter,
      characterId: characterFilter === ALL ? undefined : characterFilter,
      q: deferredSearch.length >= 2 ? deferredSearch : undefined,
      importanceMin: Number(importanceMin) > 0 ? Number(importanceMin) : undefined,
    }),
    [mode, threadFilter, characterFilter, deferredSearch, importanceMin],
  );

  const timelineQuery = useTimeline(projectId, filters);
  const view = timelineQuery.data;
  const events = view?.items ?? [];
  const threads = view?.plotThreads ?? [];
  const calendars = view?.calendars ?? [];
  const characters = charactersQuery.data?.items ?? [];
  const canEdit = projectQuery.data ? projectQuery.data.role !== 'viewer' : false;

  const defaultCalendar =
    calendars.find((calendar) => calendar.isDefault) ?? calendars[0];
  const calendarConfig =
    parseCalendarConfig(defaultCalendar?.config) ?? gregorianCalendar;

  const clearFilters = () => {
    setThreadFilter(ALL);
    setCharacterFilter(ALL);
    setImportanceMin('0');
    setSearch('');
  };
  const filtersActive =
    threadFilter !== ALL ||
    characterFilter !== ALL ||
    importanceMin !== '0' ||
    search.trim().length > 0;

  const moveMutation = useMutation({
    mutationFn: ({
      event,
      patch,
    }: {
      event: TimelineEvent;
      patch: CanvasMovePatch;
    }) => {
      const body: TimelineEventUpdate = { version: event.version };
      if (patch.startValue !== undefined) {
        body.startValue = patch.startValue;
        body.dateMode = event.dateMode === 'unknown' ? 'exact' : event.dateMode;
      }
      if (patch.plotThreadId !== undefined) {
        body.plotThreadId = patch.plotThreadId ?? CLEAR_ID;
      }
      if (patch.narrativeNodeId !== undefined) {
        body.narrativeNodeId = patch.narrativeNodeId ?? CLEAR_ID;
      }
      return updateTimelineEvent(event.id, body);
    },
    onMutate: async ({ event, patch }) => {
      const key = timelineKeys.view(projectId, filters);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (current) => {
        if (!current || typeof current !== 'object' || !('items' in current)) {
          return current;
        }
        const value = current as typeof view;
        if (!value) {
          return current;
        }
        return {
          ...value,
          items: value.items.map((item) =>
            item.id === event.id
              ? {
                  ...item,
                  startValue:
                    patch.startValue !== undefined
                      ? patch.startValue
                      : item.startValue,
                  dateMode:
                    patch.startValue !== undefined && item.dateMode === 'unknown'
                      ? 'exact'
                      : item.dateMode,
                  plotThreadId:
                    patch.plotThreadId !== undefined
                      ? patch.plotThreadId
                      : item.plotThreadId,
                  narrativeNodeId:
                    patch.narrativeNodeId !== undefined
                      ? patch.narrativeNodeId
                      : item.narrativeNodeId,
                }
              : item,
          ),
        };
      });
      return { previous, key };
    },
    onError: (error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(context.key, context.previous);
      }
      toast.error(
        getApiErrorMessage(
          error,
          'Не удалось переместить событие. Возможно, его изменил другой автор.',
        ),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['timeline', projectId] });
    },
  });

  const openCreate = (draft: CanvasCreatePoint) => {
    if (!canEdit) {
      return;
    }
    setCreateKey((value) => value + 1);
    setEventDialog({ kind: 'create', draft, key: createKey + 1 });
  };

  const editingEvent =
    eventDialog?.kind === 'edit'
      ? events.find((event) => event.id === eventDialog.eventId)
      : undefined;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-8 sm:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-700">
            <GitCommitHorizontal size={14} />
            Хронология истории
          </div>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
            Таймлайн
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
            События мира на оси календаря и в порядке повествования. Перетаскивайте
            карточки по горизонтали, чтобы менять дату или главу, и по вертикали —
            чтобы переносить их между линиями сюжета.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-paper-200 bg-white/60 p-1">
            <button
              className={
                mode === 'world'
                  ? 'rounded bg-ink-900 px-3 py-1.5 text-xs font-medium text-paper-50'
                  : 'rounded px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-paper-100'
              }
              onClick={() => setMode('world')}
              type="button"
            >
              Мир
            </button>
            <button
              className={
                mode === 'narrative'
                  ? 'rounded bg-ink-900 px-3 py-1.5 text-xs font-medium text-paper-50'
                  : 'rounded px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-paper-100'
              }
              onClick={() => setMode('narrative')}
              type="button"
            >
              Повествование
            </button>
          </div>
          <Button
            variant="outline"
            onClick={() => setCalendarOpen(true)}
            type="button"
          >
            <CalendarDays size={15} />
            Календарь
          </Button>
          <Button
            variant="outline"
            onClick={() => setThreadsOpen(true)}
            type="button"
          >
            <GitBranch size={15} />
            Линии
          </Button>
          {canEdit ? (
            <Button
              variant="accent"
              onClick={() =>
                openCreate({ plotThreadId: threads[0]?.id ?? null })
              }
              type="button"
            >
              <Plus size={15} />
              Событие
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-paper-200 bg-white/45 p-3 sm:p-4">
        <label className="relative block min-w-56 flex-1">
          <span className="sr-only">Поиск по событиям</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            size={16}
          />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по названию и описанию"
          />
        </label>
        <div className="min-w-44">
          <Label
            className="text-[11px] uppercase tracking-[0.1em] text-ink-500"
            htmlFor="timeline-thread-filter"
          >
            Линия сюжета
          </Label>
          <Select value={threadFilter} onValueChange={setThreadFilter}>
            <SelectTrigger id="timeline-thread-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Все линии</SelectItem>
              {threads.map((thread) => (
                <SelectItem key={thread.id} value={thread.id}>
                  {thread.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-44">
          <Label
            className="text-[11px] uppercase tracking-[0.1em] text-ink-500"
            htmlFor="timeline-character-filter"
          >
            Персонаж
          </Label>
          <Select value={characterFilter} onValueChange={setCharacterFilter}>
            <SelectTrigger id="timeline-character-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Все персонажи</SelectItem>
              {characters.map((character) => (
                <SelectItem key={character.id} value={character.id}>
                  {character.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-36">
          <Label
            className="text-[11px] uppercase tracking-[0.1em] text-ink-500"
            htmlFor="timeline-importance-filter"
          >
            Важность от
          </Label>
          <Select value={importanceMin} onValueChange={setImportanceMin}>
            <SelectTrigger id="timeline-importance-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Любая</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="5">5</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filtersActive ? (
          <Button variant="ghost" onClick={clearFilters} type="button">
            Сбросить
          </Button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-500">
        <Badge tone="neutral">{events.length} событий</Badge>
        {defaultCalendar ? (
          <span>Календарь: {defaultCalendar.name}</span>
        ) : (
          <span>Календарь не настроен — подписи дат задаются вручную.</span>
        )}
        <span className="inline-flex items-center gap-1">
          <Settings2 size={12} />
          {mode === 'world'
            ? 'Ось X — дни календаря'
            : 'Ось X — главы и сцены книги'}
        </span>
      </div>

      <div className="mt-3">
        {timelineQuery.isLoading || structure.loading ? (
          <div className="space-y-2 rounded-lg border border-paper-200 bg-white/45 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : timelineQuery.isError ? (
          <ErrorState
            title="Не удалось загрузить таймлайн"
            description={getApiErrorMessage(
              timelineQuery.error,
              'Проверьте соединение и повторите попытку.',
            )}
            onRetry={() => void timelineQuery.refetch()}
          />
        ) : (
          <TimelineCanvas
            calendarConfig={calendarConfig}
            canEdit={canEdit}
            events={events}
            mode={mode}
            onCreate={openCreate}
            onMove={(event, patch) => moveMutation.mutate({ event, patch })}
            onSelect={(event) =>
              setEventDialog({ kind: 'edit', eventId: event.id })
            }
            selectedId={
              eventDialog?.kind === 'edit' ? eventDialog.eventId : null
            }
            structureNodes={structure.nodes}
            threads={threads}
          />
        )}
      </div>

      {calendarOpen ? (
        <CalendarDialog
          calendars={calendars}
          canEdit={canEdit}
          open
          onOpenChange={setCalendarOpen}
          projectId={projectId}
        />
      ) : null}
      {threadsOpen ? (
        <PlotThreadDialog
          canEdit={canEdit}
          open
          onOpenChange={setThreadsOpen}
          projectId={projectId}
          threads={threads}
        />
      ) : null}
      {eventDialog?.kind === 'create' ? (
        <TimelineEventDialog
          key={`create-${eventDialog.key}`}
          calendars={calendars}
          canEdit={canEdit}
          characters={characters}
          draft={eventDialog.draft}
          mode={mode}
          open
          onOpenChange={(open) => {
            if (!open) {
              setEventDialog(null);
            }
          }}
          projectId={projectId}
          structureNodes={structure.nodes}
          threads={threads}
        />
      ) : null}
      {eventDialog?.kind === 'edit' && editingEvent ? (
        <TimelineEventDialog
          key={editingEvent.id}
          calendars={calendars}
          canEdit={canEdit}
          characters={characters}
          event={editingEvent}
          mode={mode}
          open
          onOpenChange={(open) => {
            if (!open) {
              setEventDialog(null);
            }
          }}
          projectId={projectId}
          structureNodes={structure.nodes}
          threads={threads}
        />
      ) : null}
    </main>
  );
}
