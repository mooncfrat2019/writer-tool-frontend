import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import type { CalendarConfig } from './calendar';
import { buildTicks, formatAbsolute } from './calendar';
import type { PlotThread, TimelineEvent, TimelineMode } from './api';
import type { StructureNode } from './useProjectStructure';

export type CanvasCreatePoint = {
  plotThreadId: string | null;
  startValue?: number;
  narrativeNodeId?: string | null;
};

export type CanvasMovePatch = {
  startValue?: number;
  plotThreadId?: string | null;
  narrativeNodeId?: string | null;
};

type TimelineCanvasProps = {
  mode: TimelineMode;
  events: TimelineEvent[];
  threads: PlotThread[];
  structureNodes: StructureNode[];
  calendarConfig: CalendarConfig | null;
  canEdit: boolean;
  selectedId: string | null;
  onSelect: (event: TimelineEvent) => void;
  onCreate: (point: CanvasCreatePoint) => void;
  onMove: (event: TimelineEvent, patch: CanvasMovePatch) => void;
};

type Lane = {
  id: string | null;
  name: string;
  color: string;
  events: TimelineEvent[];
};

const CARD_ROWS_HEIGHT = 58;
const LANE_HEADER_HEIGHT = 34;
const NARRATIVE_COLUMN_WIDTH = 230;

function eventLabel(event: TimelineEvent, calendar: CalendarConfig | null): string {
  if (event.displayStart) {
    return event.displayStart;
  }
  if (event.startValue != null && calendar) {
    return formatAbsolute(calendar, event.startValue, event.precision);
  }
  return event.dateMode === 'unknown' ? 'Без даты' : 'Дата не указана';
}

function eventSpan(event: TimelineEvent, span: number): number {
  if (event.startValue == null) {
    return 0;
  }
  if (event.endValue != null && event.endValue > event.startValue) {
    return Math.max(event.endValue - event.startValue, span * 0.012);
  }
  return span * 0.03;
}

function packRows(events: TimelineEvent[], span: number) {
  const rows: TimelineEvent[][] = [];
  const rowEnds: number[] = [];
  const sorted = [...events].sort(
    (left, right) => (left.startValue ?? 0) - (right.startValue ?? 0),
  );
  for (const event of sorted) {
    const start = event.startValue ?? 0;
    let row = rowEnds.findIndex((end) => start > end);
    if (row === -1) {
      row = rows.length;
      rows.push([]);
      rowEnds.push(0);
    }
    rows[row].push(event);
    rowEnds[row] = start + eventSpan(event, span);
  }
  return rows;
}

function hasKnownDate(event: TimelineEvent): boolean {
  return event.startValue != null;
}

export function TimelineCanvas({
  mode,
  events,
  threads,
  structureNodes,
  calendarConfig,
  canEdit,
  selectedId,
  onSelect,
  onCreate,
  onMove,
}: TimelineCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(
    null,
  );
  const dragState = useRef<{
    event: TimelineEvent;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const dated = events.filter(hasKnownDate);
  const values = dated.map((event) => event.startValue as number);
  const baseMin = values.length ? Math.min(...values) : 0;
  const baseMax = values.length ? Math.max(...values) : 365;
  const padding = Math.max((baseMax - baseMin) * 0.08, 1);
  const fullMin = baseMin - padding;
  const fullMax = baseMax + padding;
  const center = (fullMin + fullMax) / 2;
  const span = Math.max((fullMax - fullMin) / zoom, 1);
  const domainMin = center - span / 2;
  const domainMax = center + span / 2;

  const ticks = useMemo(
    () =>
      calendarConfig
        ? buildTicks(calendarConfig, domainMin, domainMax, 7)
        : Array.from({ length: 8 }, (_, index) => {
            const value = domainMin + ((domainMax - domainMin) / 7) * index;
            return { value, label: String(Math.round(value)) };
          }),
    [calendarConfig, domainMin, domainMax],
  );

  const lanes: Lane[] = threads.map((thread) => ({
    id: thread.id,
    name: thread.name,
    color: thread.color || '#8a5a2b',
    events: events.filter((event) => event.plotThreadId === thread.id),
  }));
  lanes.push({
    id: null,
    name: 'Без линии',
    color: '#a8a29e',
    events: events.filter((event) => !event.plotThreadId),
  });

  const narrativeColumns = structureNodes.filter((node) => node.type !== 'part');
  const unassignedEvents = events.filter(
    (event) =>
      !event.narrativeNodeId ||
      !narrativeColumns.some((node) => node.id === event.narrativeNodeId),
  );

  const positionFor = (event: TimelineEvent): number | null => {
    if (mode === 'narrative') {
      const index = narrativeColumns.findIndex(
        (node) => node.id === event.narrativeNodeId,
      );
      return index === -1 ? null : index;
    }
    if (event.startValue == null) {
      return null;
    }
    return ((event.startValue - domainMin) / span) * 100;
  };

  const beginDrag = (event: TimelineEvent, pointer: PointerEvent) => {
    if (!canEdit || pointer.button !== 0) {
      return;
    }
    pointer.stopPropagation();
    (pointer.currentTarget as HTMLElement).setPointerCapture(pointer.pointerId);
    dragState.current = {
      event,
      startX: pointer.clientX,
      startY: pointer.clientY,
      moved: false,
    };
  };

  const updateDrag = (pointer: PointerEvent) => {
    const state = dragState.current;
    if (!state) {
      return;
    }
    const dx = pointer.clientX - state.startX;
    const dy = pointer.clientY - state.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      state.moved = true;
    }
    setDrag({ id: state.event.id, dx, dy });
  };

  const finishDrag = (pointer: PointerEvent, areaWidth: number) => {
    const state = dragState.current;
    dragState.current = null;
    setDrag(null);
    if (!state) {
      return;
    }
    if (!state.moved) {
      onSelect(state.event);
      return;
    }
    const dx = pointer.clientX - state.startX;
    const dy = pointer.clientY - state.startY;
    const patch: CanvasMovePatch = {};
    if (mode === 'world' && state.event.startValue != null && areaWidth > 0) {
      const delta = (dx / areaWidth) * span;
      patch.startValue = Math.round(state.event.startValue + delta);
    }
    if (Math.abs(dy) > 20) {
      const target = document
        .elementFromPoint(pointer.clientX, pointer.clientY)
        ?.closest<HTMLElement>('[data-lane-id]');
      const targetLaneId = target?.dataset.laneId;
      if (targetLaneId === 'none') {
        if (state.event.plotThreadId) {
          patch.plotThreadId = null;
        }
      } else if (targetLaneId) {
        const lane = lanes.find((item) => item.id === targetLaneId);
        if (lane && lane.id !== state.event.plotThreadId) {
          patch.plotThreadId = lane.id;
        }
      }
    }
    if (mode === 'narrative') {
      const index = Math.round(dx / NARRATIVE_COLUMN_WIDTH);
      const currentIndex = narrativeColumns.findIndex(
        (node) => node.id === state.event.narrativeNodeId,
      );
      const base = currentIndex === -1 ? 0 : currentIndex;
      const target = Math.min(
        Math.max(base + index, -1),
        narrativeColumns.length - 1,
      );
      patch.narrativeNodeId = target === -1 ? null : narrativeColumns[target].id;
    }
    if (Object.keys(patch).length > 0) {
      onMove(state.event, patch);
    }
  };

  const createAt = (
    lane: Lane,
    area: HTMLElement,
    clientX: number,
    storyNodeId?: string,
  ) => {
    if (!canEdit) {
      return;
    }
    const rect = area.getBoundingClientRect();
    if (mode === 'narrative') {
      const column = Math.floor((clientX - rect.left) / NARRATIVE_COLUMN_WIDTH);
      const node = narrativeColumns[Math.max(0, Math.min(column, narrativeColumns.length - 1))];
      onCreate({
        plotThreadId: lane.id,
        narrativeNodeId: node ? node.id : null,
      });
      return;
    }
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    onCreate({
      plotThreadId: lane.id,
      startValue: Math.round(domainMin + ratio * span),
      narrativeNodeId: storyNodeId ?? null,
    });
  };

  const zoomIn = () => setZoom((value) => Math.min(value * 2, 16));
  const zoomOut = () => setZoom((value) => Math.max(value / 2, 1));

  if (events.length === 0 && threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-paper-300 bg-white/40 px-6 py-16 text-center">
        <CalendarDays size={26} className="text-ink-400" />
        <p className="font-serif text-lg text-ink-800">Событий пока нет</p>
        <p className="max-w-md text-sm text-ink-500">
          {canEdit
            ? 'Нажмите на дорожку, чтобы добавить первое событие, или создайте его кнопкой «Событие».'
            : 'В этом проекте ещё не добавлены события таймлайна.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-paper-200 bg-white/45">
      <div className="flex items-center justify-between gap-3 border-b border-paper-200 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <CalendarDays size={14} />
          {mode === 'world'
            ? 'Хронология мира: ось дней от эпохи календаря'
            : 'Порядок повествования: главы и сцены слева направо'}
        </div>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Приблизить"
            disabled={zoom >= 16}
            onClick={zoomIn}
            size="sm"
            variant="ghost"
          >
            +
          </Button>
          <Button
            aria-label="Отдалить"
            disabled={zoom <= 1}
            onClick={zoomOut}
            size="sm"
            variant="ghost"
          >
            −
          </Button>
          <Button
            disabled={zoom === 1}
            onClick={() => setZoom(1)}
            size="sm"
            variant="outline"
          >
            Вся хронология
          </Button>
        </div>
      </div>

      {mode === 'narrative' ? (
        <div className="flex items-center gap-2 border-b border-paper-200 px-4 py-2 text-[11px] text-ink-500">
          <ChevronLeft size={12} />
          <span>Раньше в повествовании</span>
          <span className="flex-1" />
          <span>Позже</span>
          <ChevronRight size={12} />
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div
          className="relative"
          style={{
            minWidth:
              mode === 'narrative'
                ? NARRATIVE_COLUMN_WIDTH * Math.max(narrativeColumns.length + 1, 1) + 180
                : undefined,
          }}
        >
          {mode === 'world' ? (
            <div className="grid grid-cols-[180px_1fr] border-b border-paper-200 bg-paper-100/60">
              <div className="px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-ink-500">
                Линия сюжета
              </div>
              <div className="relative h-10">
                {ticks.map((tick) => {
                  const position = ((tick.value - domainMin) / span) * 100;
                  return (
                    <div
                      key={`${tick.value}-${tick.label}`}
                      className="absolute top-0 h-full border-l border-paper-200 pl-1.5 text-[10px] leading-10 text-ink-500"
                      style={{ left: `${position}%` }}
                    >
                      <span className="whitespace-nowrap">{tick.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[180px_1fr] border-b border-paper-200 bg-paper-100/60">
              <div className="px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-ink-500">
                Линия сюжета
              </div>
              <div className="flex">
                {narrativeColumns.map((node) => (
                  <div
                    key={node.id}
                    className="shrink-0 border-l border-paper-200 px-2 py-2"
                    style={{ width: NARRATIVE_COLUMN_WIDTH }}
                    title={`${node.bookTitle} · ${node.title}`}
                  >
                    <p className="truncate text-[11px] font-medium text-ink-700">
                      {node.title}
                    </p>
                    <p className="truncate text-[10px] text-ink-400">
                      {node.bookTitle}
                    </p>
                  </div>
                ))}
                <div
                  className="shrink-0 border-l border-paper-200 px-2 py-2"
                  style={{ width: NARRATIVE_COLUMN_WIDTH }}
                >
                  <p className="text-[11px] font-medium text-ink-500">Без привязки</p>
                </div>
              </div>
            </div>
          )}

          {lanes.map((lane) => {
            const known = lane.events.filter(hasKnownDate);
            const unknown = lane.events.filter((event) => !hasKnownDate(event));
            const narrativePositions = new Map<
              string,
              { column: number; row: number }
            >();
            let narrativeRows = 1;
            if (mode === 'narrative') {
              const counters = new Map<number, number>();
              for (const event of lane.events) {
                const column = positionFor(event) ?? narrativeColumns.length;
                const row = counters.get(column) ?? 0;
                counters.set(column, row + 1);
                narrativePositions.set(event.id, { column, row });
                narrativeRows = Math.max(narrativeRows, row + 1);
              }
            }
            const rows = mode === 'world' ? packRows(known, span) : [];
            const height =
              (mode === 'narrative'
                ? narrativeRows
                : Math.max(rows.length, 1)) *
                CARD_ROWS_HEIGHT +
              LANE_HEADER_HEIGHT +
              (mode === 'world' && unknown.length > 0 ? 26 : 0);
            return (
              <div
                key={lane.id ?? 'unassigned'}
                className="grid grid-cols-[180px_1fr] border-b border-paper-200 last:border-b-0"
              >
                <div className="flex items-start gap-2 px-3 py-3">
                  <span
                    className="mt-1 h-3 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: lane.color }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-800">
                      {lane.name}
                    </p>
                    <p className="text-[11px] text-ink-400">
                      {lane.events.length} событ.
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    'relative',
                    canEdit && 'cursor-copy hover:bg-paper-100/40',
                  )}
                  data-lane-id={lane.id ?? 'none'}
                  style={{
                    height,
                    minWidth:
                      mode === 'narrative'
                        ? NARRATIVE_COLUMN_WIDTH * (narrativeColumns.length + 1)
                        : undefined,
                  }}
                  onClick={(event) =>
                    createAt(lane, event.currentTarget, event.clientX)
                  }
                >
                  {mode === 'world'
                    ? ticks.map((tick) => (
                        <span
                          key={`grid-${lane.id ?? 'none'}-${tick.value}`}
                          aria-hidden
                          className="pointer-events-none absolute top-0 h-full border-l border-paper-200/60"
                          style={{
                            left: `${((tick.value - domainMin) / span) * 100}%`,
                          }}
                        />
                      ))
                    : Array.from(
                        { length: narrativeColumns.length + 1 },
                        (_, index) => (
                          <span
                            key={`grid-${lane.id ?? 'none'}-${index}`}
                            aria-hidden
                            className="pointer-events-none absolute top-0 h-full border-l border-paper-200/60"
                            style={{ left: index * NARRATIVE_COLUMN_WIDTH }}
                          />
                        ),
                      )}

                  {mode === 'world'
                    ? rows.map((row, rowIndex) =>
                        row.map((event) => {
                          const position = positionFor(event);
                          if (position == null) {
                            return null;
                          }
                          return (
                            <EventCard
                              key={event.id}
                              event={event}
                              selected={selectedId === event.id}
                              label={eventLabel(event, calendarConfig)}
                              color={lane.color}
                              style={{
                                left: `${position}%`,
                                top: rowIndex * CARD_ROWS_HEIGHT + 8,
                              }}
                              dragging={drag?.id === event.id}
                              dragOffset={drag?.id === event.id ? drag : null}
                              onPointerDown={(pointer) => beginDrag(event, pointer)}
                              onPointerMove={updateDrag}
                              onPointerUp={(pointer) =>
                                finishDrag(pointer, pointer.currentTarget.parentElement?.clientWidth ?? 0)
                              }
                            />
                          );
                        }),
                      )
                    : lane.events.map((event) => {
                        const placement = narrativePositions.get(event.id);
                        const left =
                          (placement?.column ?? narrativeColumns.length) *
                          NARRATIVE_COLUMN_WIDTH;
                        return (
                          <EventCard
                            key={event.id}
                            event={event}
                            selected={selectedId === event.id}
                            label={eventLabel(event, calendarConfig)}
                            color={lane.color}
                            style={{
                              left: left + 8,
                              top: (placement?.row ?? 0) * CARD_ROWS_HEIGHT + 8,
                            }}
                            dragging={drag?.id === event.id}
                            dragOffset={drag?.id === event.id ? drag : null}
                            onPointerDown={(pointer) => beginDrag(event, pointer)}
                            onPointerMove={updateDrag}
                            onPointerUp={(pointer) =>
                              finishDrag(pointer, pointer.currentTarget.parentElement?.clientWidth ?? 0)
                            }
                          />
                        );
                      })}

                  {mode === 'world' && unknown.length > 0 ? (
                    <div className="absolute inset-x-2 bottom-1 flex flex-wrap gap-1.5">
                      {unknown.map((event) => (
                        <button
                          key={event.id}
                          className={cn(
                            'rounded border border-dashed border-paper-300 bg-paper-50 px-2 py-1 text-[11px] text-ink-600 hover:border-accent-400',
                            selectedId === event.id && 'border-accent-500 bg-white',
                          )}
                          onClick={(pointer) => {
                            pointer.stopPropagation();
                            onSelect(event);
                          }}
                          type="button"
                        >
                          {event.title}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {mode === 'narrative' && unassignedEvents.length > 0 ? (
        <p className="border-t border-paper-200 px-4 py-2 text-[11px] text-ink-500">
          Событий без привязки к главе: {unassignedEvents.length}. Они показаны в
          колонке «Без привязки».
        </p>
      ) : null}
    </div>
  );
}

type EventCardProps = {
  event: TimelineEvent;
  label: string;
  color: string;
  selected: boolean;
  dragging: boolean;
  dragOffset: { dx: number; dy: number } | null;
  style: { left: string | number; top: number };
  onPointerDown: (pointer: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (pointer: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (pointer: PointerEvent<HTMLButtonElement>) => void;
};

function EventCard({
  event,
  label,
  color,
  selected,
  dragging,
  dragOffset,
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: EventCardProps) {
  return (
    <button
      className={cn(
        'absolute w-[190px] rounded-md border bg-white/95 px-2.5 py-1.5 text-left shadow-sm transition',
        'hover:z-20 hover:border-accent-400 hover:shadow',
        selected && 'z-10 border-accent-500 ring-2 ring-accent-200',
        dragging && 'z-30 cursor-grabbing opacity-90 shadow-lg',
      )}
      style={{
        ...style,
        borderLeftColor: event.color || color,
        borderLeftWidth: 4,
        transform: dragOffset
          ? `translate(calc(-50% + ${dragOffset.dx}px), ${dragOffset.dy}px)`
          : 'translateX(-50%)',
        touchAction: 'none',
      }}
      onClick={(pointer) => pointer.stopPropagation()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      title={event.title}
      type="button"
    >
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-ink-400">
        <GripVertical size={10} />
        <span className="truncate">{label}</span>
      </span>
      <span className="mt-0.5 line-clamp-2 text-xs font-medium text-ink-800">
        {event.title}
      </span>
      <span className="mt-1 flex items-center gap-1">
        {event.importance >= 4 ? (
          <Badge tone="danger">важно</Badge>
        ) : event.importance === 3 ? null : (
          <Badge tone="neutral">{event.importance}</Badge>
        )}
        {event.links.length > 0 ? (
          <span className="text-[10px] text-ink-400">
            {event.links.length} связ.
          </span>
        ) : null}
      </span>
    </button>
  );
}
