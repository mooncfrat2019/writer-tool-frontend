import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { getApiErrorMessage } from '@/shared/api/errors';
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
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import type { components } from '@/shared/api/schema';
import {
  addTimelineEventLink,
  createCalendar,
  createPlotThread,
  createTimelineEvent,
  deleteCalendar,
  deletePlotThread,
  deleteTimelineEvent,
  removeTimelineEventLink,
  updateCalendar,
  updatePlotThread,
  updateTimelineEvent,
  type Calendar,
  type PlotThread,
  type TimelineDateMode,
  type TimelineEvent,
  type TimelineEventCreate,
  type TimelineEventLink,
  type TimelineEventUpdate,
  type TimelineLinkEntityType,
  type TimelinePrecision,
} from './api';
import {
  useTimelineLinkOptions,
  type TimelineLinkOption,
} from './useTimelineLinkOptions';
import {
  formatAbsolute,
  fromAbsoluteDay,
  parseCalendarConfig,
  toAbsoluteValue,
  validateCalendarConfig,
  type CalendarConfig,
} from './calendar';
import {
  calendarPresets,
  dateModeOptions,
  gregorianCalendar,
  importanceOptions,
  linkTypeLabels,
  precisionOptions,
  threadColors,
} from './constants';
import type { CanvasCreatePoint } from './TimelineCanvas';
import type { StructureNode } from './useProjectStructure';

type Character = components['schemas']['Character'];

const CLEAR_ID = '00000000-0000-0000-0000-000000000000';
const NONE = 'none';

type DialogBase = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function invalidateTimeline(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  return queryClient.invalidateQueries({ queryKey: ['timeline', projectId] });
}

type FormShellProps = DialogBase & {
  title: string;
  description: string;
  pending: boolean;
  submitLabel: string;
  onSubmit: () => void;
  children: ReactNode;
  footerExtra?: ReactNode;
};

function FormShell({
  open,
  onOpenChange,
  title,
  description,
  pending,
  submitLabel,
  onSubmit,
  children,
  footerExtra,
}: FormShellProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={submit}>
          {children}
          <DialogFooter className="gap-2 sm:justify-between">
            <div>{footerExtra}</div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Отмена
              </Button>
              <Button type="submit" variant="accent" disabled={pending}>
                {pending ? 'Сохраняем…' : submitLabel}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── Calendars ─────────────────────────── */

type CalendarDialogProps = DialogBase & {
  projectId: string;
  calendars: Calendar[];
  canEdit: boolean;
};

export function CalendarDialog({
  projectId,
  calendars,
  canEdit,
  open,
  onOpenChange,
}: CalendarDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('Календарь мира');
  const [presetId, setPresetId] = useState<string>('gregorian');
  const [customConfig, setCustomConfig] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null);

  const resetForm = () => {
    setEditingCalendar(null);
    setName('Календарь мира');
    setPresetId('gregorian');
    setCustomConfig('');
    setError(null);
  };

  const startEdit = (calendar: Calendar) => {
    setEditingCalendar(calendar);
    setName(calendar.name);
    setPresetId('custom');
    setCustomConfig(JSON.stringify(calendar.config ?? {}, null, 2));
    setError(null);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let config: CalendarConfig;
      if (presetId === 'custom') {
        let parsed: unknown;
        try {
          parsed = JSON.parse(customConfig);
        } catch {
          throw new Error('Конфиг календаря должен быть корректным JSON');
        }
        const calendarConfig = parseCalendarConfig(parsed);
        if (!calendarConfig) {
          throw new Error(
            validateCalendarConfig(parsed as CalendarConfig) ??
              'Не удалось разобрать конфиг календаря',
          );
        }
        config = calendarConfig;
      } else {
        config =
          calendarPresets.find((preset) => preset.id === presetId)?.config ??
          gregorianCalendar;
      }
      if (editingCalendar) {
        return updateCalendar(editingCalendar.id, {
          name: name.trim(),
          config: config as unknown as Record<string, unknown>,
          version: editingCalendar.version,
        });
      }
      return createCalendar(projectId, {
        name: name.trim(),
        config: config as unknown as Record<string, unknown>,
        isDefault: calendars.length === 0,
      });
    },
    onSuccess: () => {
      void invalidateTimeline(queryClient, projectId);
      toast.success(
        editingCalendar ? 'Календарь обновлён' : 'Календарь создан',
      );
      resetForm();
      onOpenChange(false);
    },
    onError: (mutationError) => {
      setError(
        getApiErrorMessage(
          mutationError,
          editingCalendar
            ? 'Не удалось сохранить календарь'
            : 'Не удалось создать календарь',
        ),
      );
    },
  });

  const makeDefaultMutation = useMutation({
    mutationFn: (calendar: Calendar) =>
      updateCalendar(calendar.id, {
        isDefault: true,
        version: calendar.version,
      }),
    onSuccess: () => {
      void invalidateTimeline(queryClient, projectId);
      toast.success('Основной календарь обновлён');
    },
    onError: (mutationError) =>
      toast.error(getApiErrorMessage(mutationError, 'Не удалось изменить календарь')),
  });

  const deleteMutation = useMutation({
    mutationFn: (calendarId: string) => deleteCalendar(calendarId),
    onSuccess: () => {
      void invalidateTimeline(queryClient, projectId);
      toast.success('Календарь удалён');
    },
    onError: (mutationError) =>
      toast.error(getApiErrorMessage(mutationError, 'Не удалось удалить календарь')),
  });

  return (
    <FormShell
      open={open}
      onOpenChange={onOpenChange}
      title="Календари проекта"
      description="Эпохи, месяцы и високосные дни. По календарю считаются позиции событий на оси времени."
      pending={saveMutation.isPending || !canEdit}
      submitLabel={editingCalendar ? 'Сохранить календарь' : 'Добавить календарь'}
      onSubmit={() => saveMutation.mutate()}
    >
      <div className="space-y-3">
        {calendars.length === 0 ? (
          <p className="rounded-md border border-dashed border-paper-300 px-3 py-4 text-sm text-ink-500">
            Календарей пока нет. Добавьте первый — события можно создавать и без
            календаря, но даты будут вводиться вручную.
          </p>
        ) : (
          calendars.map((calendar) => (
            <div
              key={calendar.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-paper-200 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-ink-800">{calendar.name}</p>
                <p className="text-[11px] text-ink-500">
                  {Array.isArray(calendar.config?.months)
                    ? `${(calendar.config.months as unknown[]).length} мес.`
                    : 'конфиг не задан'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {calendar.isDefault ? <Badge tone="success">основной</Badge> : null}
                {canEdit && !calendar.isDefault ? (
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    disabled={makeDefaultMutation.isPending}
                    onClick={() => makeDefaultMutation.mutate(calendar)}
                  >
                    Сделать основным
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button
                    aria-label="Редактировать календарь"
                    size="sm"
                    type="button"
                    variant="ghost"
                    disabled={saveMutation.isPending}
                    onClick={() => startEdit(calendar)}
                  >
                    <Pencil size={14} />
                  </Button>
                ) : null}
                {canEdit ? (
                  <Button
                    aria-label="Удалить календарь"
                    size="sm"
                    type="button"
                    variant="ghost"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(calendar.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid gap-3 rounded-md border border-paper-200 bg-paper-50/60 p-3 sm:grid-cols-2">
        {editingCalendar ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-accent-500 bg-paper-100 px-3 py-2 text-xs text-accent-700 sm:col-span-2">
            <span>Редактирование: {editingCalendar.name}</span>
            <button
              className="font-medium underline"
              onClick={resetForm}
              type="button"
            >
              Новый календарь
            </button>
          </div>
        ) : null}
        <label className="block">
          <Label htmlFor="calendar-name">Название</Label>
          <Input
            id="calendar-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="block">
          <Label htmlFor="calendar-preset">Шаблон</Label>
          <Select value={presetId} onValueChange={setPresetId}>
            <SelectTrigger id="calendar-preset">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {calendarPresets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Свой JSON</SelectItem>
            </SelectContent>
          </Select>
        </label>
        {presetId === 'custom' ? (
          <label className="block sm:col-span-2">
            <Label htmlFor="calendar-json">Конфиг (JSON)</Label>
            <Textarea
              id="calendar-json"
              className="min-h-40 font-mono text-xs"
              value={customConfig}
              onChange={(event) => setCustomConfig(event.target.value)}
            />
          </label>
        ) : (
          <p className="text-xs text-ink-500 sm:col-span-2">
            {calendarPresets.find((preset) => preset.id === presetId)?.description}
          </p>
        )}
        {error ? <p className="text-sm text-red-700 sm:col-span-2">{error}</p> : null}
      </div>
    </FormShell>
  );
}

/* ────────────────────────── Plot threads ────────────────────────── */

type ThreadDialogProps = DialogBase & {
  projectId: string;
  threads: PlotThread[];
  canEdit: boolean;
};

export function PlotThreadDialog({
  projectId,
  threads,
  canEdit,
  open,
  onOpenChange,
}: ThreadDialogProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PlotThread | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(threadColors[0]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return updatePlotThread(editing.id, {
          name: name.trim(),
          color,
          version: editing.version,
        });
      }
      return createPlotThread(projectId, { name: name.trim(), color });
    },
    onSuccess: () => {
      void invalidateTimeline(queryClient, projectId);
      toast.success(editing ? 'Линия обновлена' : 'Линия создана');
      setEditing(null);
      setName('');
    },
    onError: (mutationError) =>
      toast.error(getApiErrorMessage(mutationError, 'Не удалось сохранить линию')),
  });

  const deleteMutation = useMutation({
    mutationFn: (threadId: string) => deletePlotThread(threadId),
    onSuccess: () => {
      void invalidateTimeline(queryClient, projectId);
      toast.success('Линия удалена');
    },
    onError: (mutationError) =>
      toast.error(getApiErrorMessage(mutationError, 'Не удалось удалить линию')),
  });

  return (
    <FormShell
      open={open}
      onOpenChange={onOpenChange}
      title="Линии сюжета"
      description="Дорожки таймлайна. Событие можно перетащить на другую линию."
      pending={saveMutation.isPending || !canEdit}
      submitLabel={editing ? 'Сохранить линию' : 'Добавить линию'}
      onSubmit={() => {
        if (!name.trim()) {
          toast.error('Название линии не может быть пустым');
          return;
        }
        saveMutation.mutate();
      }}
    >
      <div className="space-y-2">
        {threads.length === 0 ? (
          <p className="rounded-md border border-dashed border-paper-300 px-3 py-4 text-sm text-ink-500">
            Линий пока нет. Все события будут на дорожке «Без линии».
          </p>
        ) : (
          threads.map((thread) => (
            <div
              key={thread.id}
              className="flex items-center justify-between gap-2 rounded-md border border-paper-200 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm text-ink-800">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: thread.color || '#8a5a2b' }}
                />
                {thread.name}
                <span className="text-[11px] text-ink-400">
                  {thread.description || ''}
                </span>
              </span>
              {canEdit ? (
                <span className="flex items-center gap-1">
                  <Button
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditing(thread);
                      setName(thread.name);
                      setColor(thread.color || threadColors[0]);
                    }}
                  >
                    Изменить
                  </Button>
                  <Button
                    aria-label="Удалить линию"
                    size="sm"
                    type="button"
                    variant="ghost"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(thread.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="grid gap-3 rounded-md border border-paper-200 bg-paper-50/60 p-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <Label htmlFor="thread-name">Название линии</Label>
          <Input
            id="thread-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Основная линия"
          />
        </label>
        <label className="block">
          <Label htmlFor="thread-color">Цвет</Label>
          <Input
            id="thread-color"
            className="h-9 w-16 p-1"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </label>
        {editing ? (
          <Button
            className="justify-self-start"
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              setEditing(null);
              setName('');
            }}
          >
            Отменить редактирование
          </Button>
        ) : null}
      </div>
    </FormShell>
  );
}

/* ─────────────────────────── Event dialog ─────────────────────────── */

type EventDialogProps = DialogBase & {
  projectId: string;
  event?: TimelineEvent;
  draft?: CanvasCreatePoint;
  calendars: Calendar[];
  threads: PlotThread[];
  characters: Character[];
  structureNodes: StructureNode[];
  canEdit: boolean;
};

function configForCalendar(calendar: Calendar | undefined): CalendarConfig {
  return parseCalendarConfig(calendar?.config) ?? gregorianCalendar;
}

function initialParts(value: number | null | undefined, config: CalendarConfig) {
  if (value == null) {
    return { year: '', month: '', day: '' };
  }
  const date = fromAbsoluteDay(config, value);
  if (!date) {
    return { year: '', month: '', day: '' };
  }
  return {
    year: String(date.year),
    month: String(date.month),
    day: String(date.day),
  };
}

export function TimelineEventDialog({
  projectId,
  event,
  draft,
  calendars,
  threads,
  characters,
  structureNodes,
  canEdit,
  open,
  onOpenChange,
}: EventDialogProps) {
  const queryClient = useQueryClient();
  const initialCalendar =
    calendars.find((calendar) => calendar.id === event?.calendarId) ??
    calendars.find((calendar) => calendar.isDefault) ??
    calendars[0];
  const initialConfig = configForCalendar(initialCalendar);
  const initialStart =
    event?.startValue ?? draft?.startValue ?? null;
  const initialEnd = event?.endValue ?? null;
  const initialStartParts = initialParts(initialStart, initialConfig);
  const initialEndParts = initialParts(initialEnd, initialConfig);
  const initialPrecision = event?.precision ?? ('day' as TimelinePrecision);
  const generatedInitialStart =
    initialStart != null
      ? formatAbsolute(initialConfig, initialStart, initialPrecision)
      : '';
  const generatedInitialEnd =
    initialEnd != null
      ? formatAbsolute(initialConfig, initialEnd, initialPrecision)
      : '';

  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [dateMode, setDateMode] = useState<TimelineDateMode>(
    event?.dateMode ?? 'exact',
  );
  const [precision, setPrecision] =
    useState<TimelinePrecision>(initialPrecision);
  const [importance, setImportance] = useState(String(event?.importance ?? 3));
  const [calendarId, setCalendarId] = useState(
    initialCalendar?.id ?? NONE,
  );
  const [threadId, setThreadId] = useState(
    event?.plotThreadId ?? draft?.plotThreadId ?? '',
  );
  const [nodeId, setNodeId] = useState(
    event?.narrativeNodeId ?? draft?.narrativeNodeId ?? '',
  );
  const [tags, setTags] = useState((event?.tags ?? []).join(', '));
  const [color, setColor] = useState(event?.color ?? '');
  const [startYear, setStartYear] = useState(initialStartParts.year);
  const [startMonth, setStartMonth] = useState(initialStartParts.month);
  const [startDay, setStartDay] = useState(initialStartParts.day);
  const [endEnabled, setEndEnabled] = useState(initialEnd != null);
  const [endYear, setEndYear] = useState(initialEndParts.year);
  const [endMonth, setEndMonth] = useState(initialEndParts.month);
  const [endDay, setEndDay] = useState(initialEndParts.day);
  const [displayStart, setDisplayStart] = useState(
    event?.displayStart && event.displayStart !== generatedInitialStart
      ? event.displayStart
      : '',
  );
  const [displayEnd, setDisplayEnd] = useState(
    event?.displayEnd && event.displayEnd !== generatedInitialEnd ? event.displayEnd : '',
  );
  const [linkEntityType, setLinkEntityType] =
    useState<TimelineLinkEntityType>('character');
  const [linkEntityId, setLinkEntityId] = useState('');
  const [linkRole, setLinkRole] = useState('');

  const linkOptionsQuery = useTimelineLinkOptions(projectId, Boolean(event));
  const linkOptions: Record<TimelineLinkEntityType, TimelineLinkOption[]> = {
    character: characters.map((character) => ({
      id: character.id,
      name: character.name,
    })),
    location: linkOptionsQuery.data?.location ?? [],
    faction: linkOptionsQuery.data?.faction ?? [],
    lore: linkOptionsQuery.data?.lore ?? [],
  };
  const linkEntities = linkOptions[linkEntityType];
  const linkLabel = (link: TimelineEventLink) =>
    linkOptions[link.entityType]?.find((option) => option.id === link.entityId)
      ?.name ?? linkTypeLabels[link.entityType];

  const selectedCalendar = calendars.find((calendar) => calendar.id === calendarId);
  const config = configForCalendar(selectedCalendar);

  const startValue =
    dateMode === 'unknown'
      ? null
      : toAbsoluteValue(config, {
          year: Number(startYear),
          month: Number(startMonth),
          day: Number(startDay),
        });
  const endValue =
    dateMode === 'unknown' || !endEnabled
      ? null
      : toAbsoluteValue(config, {
          year: Number(endYear),
          month: Number(endMonth),
          day: Number(endDay),
        });
  const generatedStart =
    startValue != null ? formatAbsolute(config, startValue, precision) : '';
  const generatedEnd =
    endValue != null ? formatAbsolute(config, endValue, precision) : '';

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) {
        throw new Error('Название события не может быть пустым');
      }
      if (dateMode !== 'unknown' && startValue == null) {
        throw new Error('Укажите корректную дату начала в выбранном календаре');
      }
      if (dateMode !== 'unknown' && endEnabled && endValue == null) {
        throw new Error('Укажите корректную дату окончания');
      }
      if (
        dateMode !== 'unknown' &&
        startValue != null &&
        endValue != null &&
        endValue < startValue
      ) {
        throw new Error('Дата окончания раньше даты начала');
      }
      const common: TimelineEventCreate = {
        title: title.trim(),
        description,
        dateMode,
        precision,
        importance: Number(importance),
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
      if (color) {
        common.color = color;
      }
      if (calendarId !== NONE) {
        common.calendarId = calendarId;
      }
      if (threadId) {
        common.plotThreadId = threadId;
      }
      if (nodeId) {
        common.narrativeNodeId = nodeId;
      }
      if (dateMode !== 'unknown' && startValue != null) {
        common.startValue = startValue;
        common.displayStart = displayStart.trim() || generatedStart;
      }
      if (dateMode !== 'unknown' && endValue != null) {
        common.endValue = endValue;
        common.displayEnd = displayEnd.trim() || generatedEnd;
      }
      if (event) {
        const update: TimelineEventUpdate = {
          ...common,
          version: event.version,
          calendarId: calendarId === NONE ? CLEAR_ID : calendarId,
          plotThreadId: threadId || CLEAR_ID,
          narrativeNodeId: nodeId || CLEAR_ID,
          clearEnd: dateMode !== 'unknown' && !endEnabled,
        };
        return updateTimelineEvent(event.id, update);
      }
      return createTimelineEvent(projectId, common);
    },
    onSuccess: () => {
      void invalidateTimeline(queryClient, projectId);
      toast.success(event ? 'Событие обновлено' : 'Событие создано');
      onOpenChange(false);
    },
    onError: (mutationError) =>
      toast.error(getApiErrorMessage(mutationError, 'Не удалось сохранить событие')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTimelineEvent(event?.id ?? ''),
    onSuccess: () => {
      void invalidateTimeline(queryClient, projectId);
      toast.success('Событие удалено');
      onOpenChange(false);
    },
    onError: (mutationError) =>
      toast.error(getApiErrorMessage(mutationError, 'Не удалось удалить событие')),
  });

  const addLinkMutation = useMutation({
    mutationFn: () =>
      addTimelineEventLink(event?.id ?? '', {
        entityType: linkEntityType,
        entityId: linkEntityId,
        role: linkRole.trim() || undefined,
      }),
    onSuccess: () => {
      void invalidateTimeline(queryClient, projectId);
      setLinkEntityId('');
      setLinkRole('');
      toast.success('Связь добавлена');
    },
    onError: (mutationError) =>
      toast.error(getApiErrorMessage(mutationError, 'Не удалось добавить связь')),
  });

  const removeLinkMutation = useMutation({
    mutationFn: (linkId: string) =>
      removeTimelineEventLink(event?.id ?? '', linkId),
    onSuccess: () => {
      void invalidateTimeline(queryClient, projectId);
      toast.success('Связь удалена');
    },
    onError: (mutationError) =>
      toast.error(getApiErrorMessage(mutationError, 'Не удалось удалить связь')),
  });

  const monthLabel = (index: number) =>
    config.months[Number(index)]?.name ?? String(index);

  return (
    <FormShell
      open={open}
      onOpenChange={onOpenChange}
      title={event ? 'Событие таймлайна' : 'Новое событие'}
      description="Дата хранится числом дней от эпохи календаря; отображаемую подпись можно задать вручную."
      pending={saveMutation.isPending || !canEdit}
      submitLabel={event ? 'Сохранить' : 'Создать событие'}
      onSubmit={() => saveMutation.mutate()}
      footerExtra={
        event && canEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="text-red-700"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm('Удалить событие?')) {
                deleteMutation.mutate();
              }
            }}
          >
            <Trash2 size={14} />
            Удалить
          </Button>
        ) : null
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <Label htmlFor="event-title">Название</Label>
          <Input
            id="event-title"
            value={title}
            onChange={(eventValue) => setTitle(eventValue.target.value)}
            placeholder="Основание города"
            maxLength={300}
          />
        </label>
        <label className="block sm:col-span-2">
          <Label htmlFor="event-description">Описание</Label>
          <Textarea
            id="event-description"
            value={description}
            onChange={(eventValue) => setDescription(eventValue.target.value)}
            placeholder="Что произошло, кто участвовал, почему это важно"
          />
        </label>

        <label className="block">
          <Label htmlFor="event-mode">Тип даты</Label>
          <Select
            value={dateMode}
            onValueChange={(value) => setDateMode(value as TimelineDateMode)}
          >
            <SelectTrigger id="event-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateModeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="block">
          <Label htmlFor="event-precision">Точность</Label>
          <Select
            value={precision}
            onValueChange={(value) => setPrecision(value as TimelinePrecision)}
          >
            <SelectTrigger id="event-precision">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {precisionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {dateMode !== 'unknown' ? (
          <div className="space-y-2 rounded-md border border-paper-200 bg-paper-50/60 p-3 sm:col-span-2">
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="block">
                <Label htmlFor="event-year">Год</Label>
                <Input
                  id="event-year"
                  inputMode="numeric"
                  value={startYear}
                  onChange={(value) => setStartYear(value.target.value)}
                  placeholder="342"
                />
              </label>
              <label className="block">
                <Label htmlFor="event-month">Месяц</Label>
                <Select value={startMonth} onValueChange={setStartMonth}>
                  <SelectTrigger id="event-month">
                    <SelectValue placeholder="Месяц" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.months.map((month, index) => (
                      <SelectItem key={month.name} value={String(index)}>
                        {month.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="block">
                <Label htmlFor="event-day">День</Label>
                <Input
                  id="event-day"
                  inputMode="numeric"
                  value={startDay}
                  onChange={(value) => setStartDay(value.target.value)}
                  placeholder="1"
                />
              </label>
            </div>
            <p className="text-xs text-ink-500">
              {startValue != null
                ? `Начало: ${generatedStart}`
                : 'Введите год, месяц и день в календаре проекта.'}
            </p>

            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={endEnabled}
                onChange={(eventValue) => setEndEnabled(eventValue.target.checked)}
              />
              У события есть дата окончания
            </label>
            {endEnabled ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="block">
                  <Label htmlFor="event-end-year">Год конца</Label>
                  <Input
                    id="event-end-year"
                    inputMode="numeric"
                    value={endYear}
                    onChange={(value) => setEndYear(value.target.value)}
                  />
                </label>
                <label className="block">
                  <Label htmlFor="event-end-month">Месяц конца</Label>
                  <Select value={endMonth} onValueChange={setEndMonth}>
                    <SelectTrigger id="event-end-month">
                      <SelectValue placeholder="Месяц" />
                    </SelectTrigger>
                    <SelectContent>
                      {config.months.map((month, index) => (
                        <SelectItem key={month.name} value={String(index)}>
                          {month.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="block">
                  <Label htmlFor="event-end-day">День конца</Label>
                  <Input
                    id="event-end-day"
                    inputMode="numeric"
                    value={endDay}
                    onChange={(value) => setEndDay(value.target.value)}
                  />
                </label>
              </div>
            ) : null}
            {endEnabled && endValue != null ? (
              <p className="text-xs text-ink-500">Окончание: {generatedEnd}</p>
            ) : null}
          </div>
        ) : null}

        <label className="block">
          <Label htmlFor="event-calendar">Календарь</Label>
          <Select value={calendarId} onValueChange={setCalendarId}>
            <SelectTrigger id="event-calendar">
              <SelectValue placeholder="Без календаря" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Без календаря</SelectItem>
              {calendars.map((calendar) => (
                <SelectItem key={calendar.id} value={calendar.id}>
                  {calendar.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="block">
          <Label htmlFor="event-thread">Линия сюжета</Label>
          <Select
            value={threadId || NONE}
            onValueChange={(value) => setThreadId(value === NONE ? '' : value)}
          >
            <SelectTrigger id="event-thread">
              <SelectValue placeholder="Без линии" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Без линии</SelectItem>
              {threads.map((thread) => (
                <SelectItem key={thread.id} value={thread.id}>
                  {thread.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="block">
          <Label htmlFor="event-node">Глава или сцена</Label>
          <Select
            value={nodeId || NONE}
            onValueChange={(value) => setNodeId(value === NONE ? '' : value)}
          >
            <SelectTrigger id="event-node">
              <SelectValue placeholder="Без привязки" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Без привязки</SelectItem>
              {structureNodes
                .filter((node) => node.type !== 'part')
                .map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    {`${'— '.repeat(node.depth)}${node.title}`}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </label>
        <label className="block">
          <Label htmlFor="event-importance">Важность</Label>
          <Select value={importance} onValueChange={setImportance}>
            <SelectTrigger id="event-importance">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {importanceOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="block">
          <Label htmlFor="event-color">Цвет метки</Label>
          <Input
            id="event-color"
            className="h-9 w-16 p-1"
            type="color"
            value={color || '#8a5a2b'}
            onChange={(eventValue) => setColor(eventValue.target.value)}
          />
        </label>
        <label className="block sm:col-span-2">
          <Label htmlFor="event-tags">Теги (через запятую)</Label>
          <Input
            id="event-tags"
            value={tags}
            onChange={(eventValue) => setTags(eventValue.target.value)}
            placeholder="город, пророчество"
          />
        </label>
        <label className="block">
          <Label htmlFor="event-display-start">Своя подпись начала</Label>
          <Input
            id="event-display-start"
            value={displayStart}
            onChange={(eventValue) => setDisplayStart(eventValue.target.value)}
            placeholder={generatedStart || 'весна 342 г. от Основания'}
          />
        </label>
        <label className="block">
          <Label htmlFor="event-display-end">Своя подпись конца</Label>
          <Input
            id="event-display-end"
            value={displayEnd}
            onChange={(eventValue) => setDisplayEnd(eventValue.target.value)}
            placeholder={generatedEnd || 'лето 343 г. от Основания'}
          />
        </label>
      </div>

      {event ? (
        <div className="space-y-2 rounded-md border border-paper-200 bg-paper-50/60 p-3">
          <p className="text-sm font-medium text-ink-800">Связи</p>
          {event.links.length === 0 ? (
            <p className="text-xs text-ink-500">Связей пока нет.</p>
          ) : (
            <ul className="space-y-1">
              {event.links.map((link) => (
                <li
                  key={link.id}
                  className="flex items-center justify-between gap-2 text-xs text-ink-700"
                >
                  <span>
                    <span className="text-ink-400">
                      {linkTypeLabels[link.entityType]}:{' '}
                    </span>
                    {linkLabel(link)}
                    {link.role ? ` — ${link.role}` : ''}
                  </span>
                  {canEdit ? (
                    <Button
                      aria-label="Удалить связь"
                      size="sm"
                      type="button"
                      variant="ghost"
                      disabled={removeLinkMutation.isPending}
                      onClick={() => removeLinkMutation.mutate(link.id)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {canEdit ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <Label htmlFor="event-link-type">Тип связи</Label>
                <Select
                  value={linkEntityType}
                  onValueChange={(value) => {
                    setLinkEntityType(value as TimelineLinkEntityType);
                    setLinkEntityId('');
                  }}
                >
                  <SelectTrigger id="event-link-type" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(linkTypeLabels) as TimelineLinkEntityType[]
                    ).map((type) => (
                      <SelectItem key={type} value={type}>
                        {linkTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="block min-w-48 flex-1">
                <Label htmlFor="event-link-entity">Сущность</Label>
                <Select
                  value={linkEntityId || NONE}
                  onValueChange={(value) =>
                    setLinkEntityId(value === NONE ? '' : value)
                  }
                >
                  <SelectTrigger id="event-link-entity">
                    <SelectValue
                      placeholder={
                        linkOptionsQuery.isLoading && linkEntityType !== 'character'
                          ? 'Загружаем…'
                          : 'Выберите сущность'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Не выбрана</SelectItem>
                    {linkEntities.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.worldName
                          ? `${option.name} · ${option.worldName}`
                          : option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="block">
                <Label htmlFor="event-link-role">Роль</Label>
                <Input
                  id="event-link-role"
                  className="w-40"
                  value={linkRole}
                  onChange={(value) => setLinkRole(value.target.value)}
                  placeholder="участник"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={!linkEntityId || addLinkMutation.isPending}
                onClick={() => addLinkMutation.mutate()}
              >
                Добавить связь
              </Button>
              {linkOptionsQuery.isError ? (
                <p className="w-full text-xs text-red-700">
                  {getApiErrorMessage(
                    linkOptionsQuery.error,
                    'Не удалось загрузить локации, фракции и лор.',
                  )}
                </p>
              ) : null}
              {!linkOptionsQuery.isLoading &&
              linkEntityType !== 'character' &&
              linkEntities.length === 0 ? (
                <p className="w-full text-xs text-ink-500">
                  В проекте нет сущностей этого типа.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!canEdit ? (
        <p className="text-sm text-ink-500">
          У вас режим просмотра: сохранение и удаление недоступны.
        </p>
      ) : null}
      {selectedCalendar ? (
        <p className="text-[11px] text-ink-400">
          Календарь: {selectedCalendar.name}. Месяцы:{' '}
          {config.months.map((_, index) => monthLabel(index)).join(', ')}.
        </p>
      ) : (
        <p className="text-[11px] text-ink-400">
          Календарь не выбран — даты считаются по григорианскому календарю, а
          подпись сохраняется в событии.
        </p>
      )}
    </FormShell>
  );
}
