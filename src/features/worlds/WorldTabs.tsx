import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Map as MapIcon,
  MapPin,
  Pencil,
  Plus,
  Scale,
  Trash2,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/shared/api/errors';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { ErrorState } from '@/shared/ui/error-state';
import { ImageUrlField } from '@/shared/ui/image-url-field';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  clearWorldMap,
  deleteFaction,
  deleteLocation,
  deleteLore,
  deleteRule,
  moveLocation,
  setWorldMap,
  type Faction,
  type Location,
  type LoreEntry,
  type WorldRule,
} from './api';
import {
  factionTypeOptions,
  importanceLabels,
  locationTypeOptions,
  loreTypeOptions,
  optionLabel,
  ruleCategoryOptions,
} from './constants';
import {
  FactionDialog,
  LocationDialog,
  LoreDialog,
  RuleDialog,
} from './WorldDialogs';
import { worldKeys, useFactions, useLocations, useLore, useRules } from './queries';

type TabProps = {
  worldId: string;
  canEdit: boolean;
};

function TabHeader({
  title,
  description,
  addLabel,
  canEdit,
  onAdd,
}: {
  title: string;
  description: string;
  addLabel: string;
  canEdit: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-serif text-2xl text-ink-900">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>
      </div>
      {canEdit ? (
        <Button variant="accent" size="sm" onClick={onAdd}>
          <Plus size={15} />
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}

function TabLoading() {
  return (
    <div className="mt-5 space-y-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="rounded-lg border border-paper-200 bg-white/50 p-4">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function TabError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="mt-5">
      <ErrorState
        title="Данные не загрузились"
        description={getApiErrorMessage(error, 'Не удалось получить данные мира.')}
        onRetry={retry}
      />
    </div>
  );
}

function EmptyState({
  text,
  addLabel,
  canEdit,
  onAdd,
}: {
  text: string;
  addLabel: string;
  canEdit: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-paper-300 px-6 py-12 text-center">
      <p className="text-sm text-ink-500">{text}</p>
      {canEdit ? (
        <Button className="mt-4" variant="outline" onClick={onAdd}>
          <Plus size={15} />
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}

type LocationNode = Location & { children: LocationNode[] };

function buildLocationTree(items: Location[]): LocationNode[] {
  const nodes = new Map<string, LocationNode>();
  for (const item of items) {
    nodes.set(item.id, { ...item, children: [] });
  }
  const roots: LocationNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sort = (list: LocationNode[]) => {
    list.sort((left, right) => left.sortKey.localeCompare(right.sortKey));
    list.forEach((node) => sort(node.children));
  };
  sort(roots);
  return roots;
}

function LocationRow({
  node,
  level,
  canEdit,
  onEdit,
  onDelete,
  onMove,
  canMove,
}: {
  node: LocationNode;
  level: number;
  canEdit: boolean;
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
  onMove: (location: Location, direction: 'up' | 'down') => void;
  canMove: (location: Location, direction: 'up' | 'down') => boolean;
}) {
  return (
    <li>
      <div
        className="group flex items-start gap-3 rounded-md border border-transparent px-2 py-2 hover:border-paper-200 hover:bg-white/60"
        style={{ marginLeft: `${level * 20}px` }}
      >
        <MapPin className="mt-0.5 shrink-0 text-accent-700" size={15} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink-900">{node.name}</span>
            {node.type ? (
              <Badge tone="neutral">
                {optionLabel(locationTypeOptions, node.type, node.type)}
              </Badge>
            ) : null}
          </div>
          {node.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-500">
              {node.description}
            </p>
          ) : null}
        </div>
        {canEdit ? (
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Переместить локацию ${node.name} выше`}
              disabled={!canMove(node, 'up')}
              onClick={() => onMove(node, 'up')}
            >
              <ChevronUp size={14} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Переместить локацию ${node.name} ниже`}
              disabled={!canMove(node, 'down')}
              onClick={() => onMove(node, 'down')}
            >
              <ChevronDown size={14} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Изменить локацию ${node.name}`}
              onClick={() => onEdit(node)}
            >
              <Pencil size={14} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Удалить локацию ${node.name}`}
              onClick={() => onDelete(node)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ) : null}
      </div>
      {node.children.length ? (
        <ul className="mt-1 space-y-1">
          {node.children.map((child) => (
            <LocationRow
              key={child.id}
              node={child}
              level={level + 1}
              canEdit={canEdit}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
              canMove={canMove}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function LocationMap({
  items,
  canEdit,
  mapUrl,
  mapPending,
  onEdit,
  onAdd,
  onSetMapUrl,
  onClearMap,
}: {
  items: Location[];
  canEdit: boolean;
  mapUrl: string | null;
  mapPending: boolean;
  onEdit: (location: Location) => void;
  onAdd: () => void;
  onSetMapUrl: (url: string) => void;
  onClearMap: () => void;
}) {
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapDraft, setMapDraft] = useState('');
  const [mapDraftValid, setMapDraftValid] = useState(false);
  const mapped = items.flatMap((item) =>
    item.mapX != null && item.mapY != null
      ? [{ ...item, mapX: item.mapX, mapY: item.mapY }]
      : [],
  );

  return (
    <div className="mt-5" data-testid="location-map-panel">
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-paper-200 bg-paper-50"
        data-testid="location-map"
      >
        {mapUrl ? (
          <img
            alt="Фон карты мира"
            className="absolute inset-0 h-full w-full object-cover"
            data-testid="location-map-background"
            referrerPolicy="no-referrer"
            src={mapUrl}
          />
        ) : null}
        <div
          aria-hidden="true"
          className={
            mapUrl
              ? 'absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.25)_1px,transparent_1px)] bg-[size:10%_10%]'
              : 'absolute inset-0 bg-[linear-gradient(to_right,rgba(120,113,108,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,113,108,0.08)_1px,transparent_1px)] bg-[size:10%_10%]'
          }
        />
        {mapped.map((location) => (
          <button
            key={location.id}
            type="button"
            aria-label={`Открыть локацию ${location.name}`}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-md px-1 py-0.5 text-[11px] text-ink-700 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            style={{ left: `${location.mapX}%`, top: `${location.mapY}%` }}
            onClick={() => onEdit(location)}
          >
            <MapPin className="text-accent-700 drop-shadow" size={18} />
            <span className="max-w-32 truncate rounded bg-white/85 px-1.5 py-0.5 shadow-sm">
              {location.name}
            </span>
          </button>
        ))}
        {mapped.length === 0 && !mapUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-ink-500">
            <MapPin size={22} />
            <p>
              Укажите ссылку на фон карты или задайте координаты в карточке
              локации, чтобы поставить точку.
            </p>
            {canEdit ? (
              <Button variant="outline" size="sm" onClick={onAdd}>
                <Plus size={14} />
                Добавить локацию
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {canEdit ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={mapPending}
              onClick={() => {
                setMapDraft('');
                setMapDraftValid(false);
                setMapDialogOpen(true);
              }}
            >
              <Plus size={14} />
              {mapPending ? 'Сохраняем…' : mapUrl ? 'Заменить фон' : 'Указать фон'}
            </Button>
            {mapUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={mapPending}
                onClick={onClearMap}
              >
                <Trash2 size={14} />
                Убрать фон
              </Button>
            ) : null}
          </>
        ) : null}
        <p className="text-xs text-ink-500">
          Координаты задаются в карточке локации (0–100%). Нажмите на точку,
          чтобы изменить локацию.
        </p>
      </div>
      {mapped.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {mapped.map((location) => (
            <Button
              key={location.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(location)}
            >
              <MapPin size={13} />
              {location.name}
            </Button>
          ))}
        </div>
      ) : null}

      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Фон карты мира</DialogTitle>
            <DialogDescription>
              Вставьте прямую ссылку на изображение карты. Оно будет
              загружаться со стороннего сайта.
            </DialogDescription>
          </DialogHeader>
          <ImageUrlField
            id="world-map-url"
            label="Ссылка на карту"
            value={mapDraft}
            onChange={setMapDraft}
            onValidityChange={setMapDraftValid}
            disabled={mapPending}
            helpText="Превью появится после успешной загрузки изображения."
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={mapPending}
              onClick={() => setMapDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="accent"
              disabled={!mapDraftValid || mapPending}
              onClick={() => {
                onSetMapUrl(mapDraft.trim());
                setMapDialogOpen(false);
              }}
            >
              {mapPending ? 'Сохраняем…' : 'Сохранить фон'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type LocationsTabProps = TabProps & {
  mapUrl: string | null;
};

export function LocationsTab({ worldId, canEdit, mapUrl }: LocationsTabProps) {
  const queryClient = useQueryClient();
  const query = useLocations(worldId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Location | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [view, setView] = useState<'tree' | 'map'>('tree');

  const tree = useMemo(() => buildLocationTree(query.data?.items ?? []), [query.data]);
  const items = query.data?.items ?? [];

  const remove = useMutation({
    mutationFn: (location: Location) => deleteLocation(location.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: worldKeys.locations(worldId) });
      toast.success('Локация удалена.');
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Не удалось удалить локацию.')),
  });

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  const setMap = useMutation({
    mutationFn: (url: string) => setWorldMap(worldId, url),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: worldKeys.detail(worldId) });
      toast.success('Фон карты обновлён.');
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить фон карты.')),
  });

  const clearMap = useMutation({
    mutationFn: () => clearWorldMap(worldId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: worldKeys.detail(worldId) });
      toast.success('Фон карты убран.');
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, 'Не удалось убрать фон карты.')),
  });

  const move = useMutation({
    mutationFn: ({
      id,
      parentId,
      beforeId,
      afterId,
    }: {
      id: string;
      parentId: string | null;
      beforeId?: string;
      afterId?: string;
    }) => moveLocation(id, { parentId, beforeId, afterId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: worldKeys.locations(worldId) });
      toast.success('Порядок локаций обновлён.');
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, 'Не удалось переместить локацию.')),
  });

  const siblingsOf = (location: Location) =>
    items
      .filter(
        (item) => (item.parentId ?? null) === (location.parentId ?? null),
      )
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey));

  const canMove = (location: Location, direction: 'up' | 'down') => {
    const siblings = siblingsOf(location);
    const index = siblings.findIndex((item) => item.id === location.id);
    return direction === 'up'
      ? index > 0
      : index >= 0 && index < siblings.length - 1;
  };

  const moveBy = (location: Location, direction: 'up' | 'down') => {
    const siblings = siblingsOf(location);
    const index = siblings.findIndex((item) => item.id === location.id);
    if (index < 0) {
      return;
    }
    if (direction === 'up' && index > 0) {
      move.mutate({
        id: location.id,
        parentId: location.parentId ?? null,
        beforeId: siblings[index - 1].id,
      });
      return;
    }
    if (direction === 'down' && index < siblings.length - 1) {
      move.mutate({
        id: location.id,
        parentId: location.parentId ?? null,
        afterId: siblings[index + 1].id,
      });
    }
  };

  const openEdit = (location: Location) => {
    setEditing(location);
    setDialogOpen(true);
  };

  return (
    <div>
      <TabHeader
        title="Локации"
        description="Города, регионы, здания и комнаты. Дерево помогает не терять масштаб."
        addLabel="Добавить локацию"
        canEdit={canEdit}
        onAdd={openCreate}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={view === 'tree' ? 'accent' : 'outline'}
          onClick={() => setView('tree')}
        >
          Дерево
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === 'map' ? 'accent' : 'outline'}
          onClick={() => setView('map')}
        >
          <MapIcon size={14} />
          Карта
        </Button>
      </div>
      {query.isLoading ? (
        <TabLoading />
      ) : query.isError ? (
        <TabError error={query.error} retry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          text="Локаций пока нет. Начните со столицы или региона."
          addLabel="Добавить локацию"
          canEdit={canEdit}
          onAdd={openCreate}
        />
      ) : view === 'map' ? (
        <LocationMap
          items={items}
          canEdit={canEdit}
          mapUrl={mapUrl}
          mapPending={setMap.isPending || clearMap.isPending}
          onEdit={openEdit}
          onAdd={openCreate}
          onSetMapUrl={(url) => setMap.mutate(url)}
          onClearMap={() => clearMap.mutate()}
        />
      ) : (
        <ul
          className="mt-5 space-y-1 rounded-lg border border-paper-200 bg-white/40 p-3"
          data-testid="location-tree"
        >
          {tree.map((node) => (
            <LocationRow
              key={node.id}
              node={node}
              level={0}
              canEdit={canEdit}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onMove={moveBy}
              canMove={canMove}
            />
          ))}
        </ul>
      )}

      <LocationDialog
        key={`${dialogOpen}-${editing?.id ?? 'new'}`}
        worldId={worldId}
        locations={items}
        location={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Удалить локацию?"
        description={
          deleteTarget
            ? `«${deleteTarget.name}» и все вложенные локации будут удалены.`
            : ''
        }
        confirmLabel="Удалить"
        pending={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget)}
      />
    </div>
  );
}

export function FactionsTab({ worldId, canEdit }: TabProps) {
  const queryClient = useQueryClient();
  const query = useFactions(worldId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Faction | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Faction | null>(null);

  const remove = useMutation({
    mutationFn: (faction: Faction) => deleteFaction(faction.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: worldKeys.factions(worldId) });
      toast.success('Фракция удалена.');
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Не удалось удалить фракцию.')),
  });

  const items = query.data?.items ?? [];
  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  return (
    <div>
      <TabHeader
        title="Фракции"
        description="Силы, которые действуют в мире: государства, ордена, гильдии и культы."
        addLabel="Добавить фракцию"
        canEdit={canEdit}
        onAdd={openCreate}
      />
      {query.isLoading ? (
        <TabLoading />
      ) : query.isError ? (
        <TabError error={query.error} retry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          text="Фракций пока нет. Добавьте первую силу, с которой придётся считаться."
          addLabel="Добавить фракцию"
          canEdit={canEdit}
          onAdd={openCreate}
        />
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {items.map((faction) => (
            <article
              key={faction.id}
              className="rounded-lg border border-paper-200 bg-white/60 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Users className="text-accent-700" size={15} />
                    <h3 className="font-serif text-xl text-ink-900">{faction.name}</h3>
                    {faction.type ? (
                      <Badge tone="accent">
                        {optionLabel(factionTypeOptions, faction.type, faction.type)}
                      </Badge>
                    ) : null}
                  </div>
                  {faction.goals ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-500">
                      {faction.goals}
                    </p>
                  ) : null}
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Изменить фракцию ${faction.name}`}
                      onClick={() => {
                        setEditing(faction);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Удалить фракцию ${faction.name}`}
                      onClick={() => setDeleteTarget(faction)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ) : null}
              </div>
              <dl className="mt-4 grid gap-2 text-xs text-ink-500 sm:grid-cols-2">
                {faction.allies ? (
                  <div>
                    <dt className="font-medium text-ink-700">Союзники</dt>
                    <dd>{faction.allies}</dd>
                  </div>
                ) : null}
                {faction.enemies ? (
                  <div>
                    <dt className="font-medium text-ink-700">Враги</dt>
                    <dd>{faction.enemies}</dd>
                  </div>
                ) : null}
                {faction.resources ? (
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-ink-700">Ресурсы</dt>
                    <dd>{faction.resources}</dd>
                  </div>
                ) : null}
              </dl>
            </article>
          ))}
        </div>
      )}

      <FactionDialog
        key={`${dialogOpen}-${editing?.id ?? 'new'}`}
        worldId={worldId}
        faction={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Удалить фракцию?"
        description={deleteTarget ? `«${deleteTarget.name}» будет удалена.` : ''}
        confirmLabel="Удалить"
        pending={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget)}
      />
    </div>
  );
}

export function RulesTab({ worldId, canEdit }: TabProps) {
  const queryClient = useQueryClient();
  const query = useRules(worldId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorldRule | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<WorldRule | null>(null);

  const remove = useMutation({
    mutationFn: (rule: WorldRule) => deleteRule(rule.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: worldKeys.rules(worldId) });
      toast.success('Закон удалён.');
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Не удалось удалить закон.')),
  });

  const items = query.data?.items ?? [];
  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  return (
    <div>
      <TabHeader
        title="Законы мира"
        description="Что можно и нельзя: магия, физика, общество и цена нарушений."
        addLabel="Добавить закон"
        canEdit={canEdit}
        onAdd={openCreate}
      />
      {query.isLoading ? (
        <TabLoading />
      ) : query.isError ? (
        <TabError error={query.error} retry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          text="Законов пока нет. Опишите хотя бы одно правило, которое двигает сюжет."
          addLabel="Добавить закон"
          canEdit={canEdit}
          onAdd={openCreate}
        />
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((rule) => (
            <li
              key={rule.id}
              className="rounded-lg border border-paper-200 bg-white/60 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Scale className="text-accent-700" size={15} />
                    <h3 className="font-serif text-lg text-ink-900">{rule.title}</h3>
                    {rule.category ? (
                      <Badge tone="neutral">
                        {optionLabel(ruleCategoryOptions, rule.category, rule.category)}
                      </Badge>
                    ) : null}
                    <Badge tone={rule.importance >= 4 ? 'warning' : 'neutral'}>
                      {importanceLabels[rule.importance] ?? `Важность ${rule.importance}`}
                    </Badge>
                  </div>
                  {rule.description ? (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-500">
                      {rule.description}
                    </p>
                  ) : null}
                  {rule.consequences ? (
                    <p className="mt-2 text-xs leading-relaxed text-ink-500">
                      <span className="font-medium text-ink-700">Последствия: </span>
                      {rule.consequences}
                    </p>
                  ) : null}
                  {rule.exceptions ? (
                    <p className="mt-1 text-xs leading-relaxed text-ink-500">
                      <span className="font-medium text-ink-700">Исключения: </span>
                      {rule.exceptions}
                    </p>
                  ) : null}
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Изменить закон ${rule.title}`}
                      onClick={() => {
                        setEditing(rule);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Удалить закон ${rule.title}`}
                      onClick={() => setDeleteTarget(rule)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <RuleDialog
        key={`${dialogOpen}-${editing?.id ?? 'new'}`}
        worldId={worldId}
        rule={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Удалить закон?"
        description={deleteTarget ? `«${deleteTarget.title}» будет удалён.` : ''}
        confirmLabel="Удалить"
        pending={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget)}
      />
    </div>
  );
}

export function LoreTab({ worldId, canEdit }: TabProps) {
  const queryClient = useQueryClient();
  const query = useLore(worldId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LoreEntry | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<LoreEntry | null>(null);

  const remove = useMutation({
    mutationFn: (entry: LoreEntry) => deleteLore(entry.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: worldKeys.lore(worldId) });
      toast.success('Запись лора удалена.');
      setDeleteTarget(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Не удалось удалить запись.')),
  });

  const items = query.data?.items ?? [];
  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  return (
    <div>
      <TabHeader
        title="Лор"
        description="Легенды, обычаи, артефакты и детали, из которых складывается мир."
        addLabel="Добавить запись"
        canEdit={canEdit}
        onAdd={openCreate}
      />
      {query.isLoading ? (
        <TabLoading />
      ) : query.isError ? (
        <TabError error={query.error} retry={() => void query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          text="Записей пока нет. Начните с легенды или обычая, который знают все."
          addLabel="Добавить запись"
          canEdit={canEdit}
          onAdd={openCreate}
        />
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {items.map((entry) => (
            <article
              key={entry.id}
              className="rounded-lg border border-paper-200 bg-white/60 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <BookOpen className="text-accent-700" size={15} />
                    <h3 className="font-serif text-lg text-ink-900">{entry.title}</h3>
                    {entry.type ? (
                      <Badge tone="neutral">
                        {optionLabel(loreTypeOptions, entry.type, entry.type)}
                      </Badge>
                    ) : null}
                  </div>
                  {entry.content ? (
                    <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-ink-500">
                      {entry.content}
                    </p>
                  ) : null}
                  {entry.tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-paper-100 px-2 py-0.5 text-[11px] text-ink-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Изменить запись ${entry.title}`}
                      onClick={() => {
                        setEditing(entry);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Удалить запись ${entry.title}`}
                      onClick={() => setDeleteTarget(entry)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <LoreDialog
        key={`${dialogOpen}-${editing?.id ?? 'new'}`}
        worldId={worldId}
        entry={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Удалить запись лора?"
        description={deleteTarget ? `«${deleteTarget.title}» будет удалена.` : ''}
        confirmLabel="Удалить"
        pending={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget)}
      />
    </div>
  );
}
