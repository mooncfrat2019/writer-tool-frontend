import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/shared/api/errors';
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
import { CustomFieldsInputs } from '@/features/customFields/CustomFieldsInputs';
import { useCustomFields } from '@/features/customFields/queries';
import {
  createFaction,
  createLocation,
  createLore,
  createRule,
  createWorld,
  moveLocation,
  updateFaction,
  updateLocation,
  updateLore,
  updateRule,
  updateWorld,
  type Faction,
  type Location,
  type LoreEntry,
  type World,
  type WorldRule,
} from './api';
import {
  factionTypeOptions,
  importanceLabels,
  locationTypeOptions,
  loreTypeOptions,
  ruleCategoryOptions,
  worldTypeOptions,
} from './constants';
import { worldKeys } from './queries';

type DialogBase = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormShellProps = DialogBase & {
  title: string;
  description: string;
  pending: boolean;
  submitLabel: string;
  onSubmit: () => void;
  children: ReactNode;
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
}: FormShellProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={submit}>
          {children}
          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Datalist({ id, options }: { id: string; options: readonly (readonly [string, string])[] }) {
  return (
    <datalist id={id}>
      {options.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </datalist>
  );
}

type WorldFormDialogProps = DialogBase & {
  projectId: string;
  world?: World;
  onSaved?: (world: World) => void;
};

export function WorldFormDialog({
  projectId,
  world,
  open,
  onOpenChange,
  onSaved,
}: WorldFormDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(world?.name ?? '');
  const [type, setType] = useState(world?.type ?? '');
  const [summary, setSummary] = useState(world?.summary ?? '');
  const [description, setDescription] = useState(world?.description ?? '');
  const [rulesSummary, setRulesSummary] = useState(world?.rulesSummary ?? '');
  const [history, setHistory] = useState(world?.history ?? '');
  const [geography, setGeography] = useState(world?.geography ?? '');
  const [customFields, setCustomFields] = useState<Record<string, unknown>>(
    world?.customFields ?? {},
  );
  const { data: customFieldsData } = useCustomFields(projectId, 'world');


  const mutation = useMutation({
    mutationFn: async () => {
      const values = {
        name: name.trim(),
        type: type.trim() || undefined,
        summary: summary.trim() || undefined,
        description: description.trim() || undefined,
        rulesSummary: rulesSummary.trim() || undefined,
        history: history.trim() || undefined,
        geography: geography.trim() || undefined,
        customFields,
      };
      if (world) {
        return updateWorld(world.id, { ...values, version: world.version });
      }
      return createWorld(projectId, values);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: worldKeys.list(projectId) });
      if (world) {
        void queryClient.invalidateQueries({ queryKey: worldKeys.detail(world.id) });
      }
      toast.success(world ? 'Мир обновлён.' : 'Мир создан.');
      onOpenChange(false);
      onSaved?.(saved);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить мир.'));
    },
  });

  return (
    <FormShell
      open={open}
      onOpenChange={onOpenChange}
      title={world ? 'Настройки мира' : 'Новый мир'}
      description="Мир хранит законы, географию, локации и лор проекта."
      pending={mutation.isPending}
      submitLabel={world ? 'Сохранить' : 'Создать мир'}
      onSubmit={() => {
        if (!name.trim()) {
          toast.error('Укажите название мира.');
          return;
        }
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="world-name">Название</Label>
          <Input
            id="world-name"
            autoFocus
            value={name}
            placeholder="Астрал"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="world-type">Тип</Label>
          <Input
            id="world-type"
            list="world-type-options"
            value={type}
            placeholder="fantasy"
            onChange={(event) => setType(event.target.value)}
          />
          <Datalist id="world-type-options" options={worldTypeOptions} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="world-summary">Кратко</Label>
        <Textarea
          id="world-summary"
          rows={2}
          value={summary}
          placeholder="Одна фраза, которая задаёт тон мира."
          onChange={(event) => setSummary(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="world-description">Описание</Label>
        <Textarea
          id="world-description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="world-rules">Законы мира</Label>
          <Textarea
            id="world-rules"
            rows={3}
            value={rulesSummary}
            placeholder="Как здесь работает магия или физика."
            onChange={(event) => setRulesSummary(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="world-history">История</Label>
          <Textarea
            id="world-history"
            rows={3}
            value={history}
            onChange={(event) => setHistory(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="world-geography">География</Label>
        <Textarea
          id="world-geography"
          rows={3}
          value={geography}
          onChange={(event) => setGeography(event.target.value)}
        />
      </div>
      {customFieldsData?.items.length ? (
        <div className="space-y-2 border-t border-paper-200 pt-4">
          <Label>Дополнительные поля</Label>
          <CustomFieldsInputs
            definitions={customFieldsData.items}
            values={customFields}
            onChange={(key, value) =>
              setCustomFields((previous) => ({ ...previous, [key]: value }))
            }
            canEdit
            idPrefix="world-custom-field"
          />
        </div>
      ) : null}
    </FormShell>
  );
}

type LocationDialogProps = DialogBase & {
  worldId: string;
  locations: Location[];
  location?: Location;
  parentId?: string | null;
};

export function LocationDialog({
  worldId,
  locations,
  location,
  parentId,
  open,
  onOpenChange,
}: LocationDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(location?.name ?? '');
  const [type, setType] = useState(location?.type ?? '');
  const [description, setDescription] = useState(location?.description ?? '');
  const [parent, setParent] = useState(location?.parentId ?? parentId ?? 'root');
  const [mapX, setMapX] = useState(location?.mapX?.toString() ?? '');
  const [mapY, setMapY] = useState(location?.mapY?.toString() ?? '');

  const excluded = new Set<string>();
  if (location) {
    excluded.add(location.id);
    const children = new Map<string, string[]>();
    for (const item of locations) {
      if (!item.parentId) {
        continue;
      }
      const list = children.get(item.parentId) ?? [];
      list.push(item.id);
      children.set(item.parentId, list);
    }
    const stack = [location.id];
    while (stack.length) {
      const current = stack.pop();
      if (!current) {
        continue;
      }
      for (const child of children.get(current) ?? []) {
        if (excluded.has(child)) {
          continue;
        }
        excluded.add(child);
        stack.push(child);
      }
    }
  }
  const parentOptions = locations.filter((item) => !excluded.has(item.id));

  const mutation = useMutation({
    mutationFn: async () => {
      const nextMapX = mapX.trim() === '' ? undefined : Number(mapX);
      const nextMapY = mapY.trim() === '' ? undefined : Number(mapY);
      if (location) {
        const updated = await updateLocation(location.id, {
          name: name.trim(),
          type: type.trim(),
          description: description.trim(),
          mapX: nextMapX,
          mapY: nextMapY,
          version: location.version,
        });
        const nextParent = parent === 'root' ? null : parent;
        if ((location.parentId ?? null) !== nextParent) {
          return moveLocation(location.id, { parentId: nextParent });
        }
        return updated;
      }
      return createLocation(worldId, {
        name: name.trim(),
        type: type.trim() || undefined,
        description: description.trim() || undefined,
        parentId: parent === 'root' ? undefined : parent,
        mapX: nextMapX,
        mapY: nextMapY,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: worldKeys.locations(worldId) });
      toast.success(location ? 'Локация обновлена.' : 'Локация добавлена.');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить локацию.'));
    },
  });

  return (
    <FormShell
      open={open}
      onOpenChange={onOpenChange}
      title={location ? 'Изменить локацию' : 'Новая локация'}
      description="Локации образуют дерево: город, район, здание, комната."
      pending={mutation.isPending}
      submitLabel={location ? 'Сохранить' : 'Добавить'}
      onSubmit={() => {
        if (!name.trim()) {
          toast.error('Укажите название локации.');
          return;
        }
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location-name">Название</Label>
          <Input
            id="location-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location-type">Тип</Label>
          <Input
            id="location-type"
            list="location-type-options"
            value={type}
            placeholder="city"
            onChange={(event) => setType(event.target.value)}
          />
          <Datalist id="location-type-options" options={locationTypeOptions} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location-parent">Родительская локация</Label>
        <Select value={parent} onValueChange={setParent}>
          <SelectTrigger id="location-parent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="root">Без родителя</SelectItem>
            {parentOptions.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location-map-x">X на карте, %</Label>
          <Input
            id="location-map-x"
            type="number"
            min={0}
            max={100}
            step="any"
            value={mapX}
            onChange={(event) => setMapX(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location-map-y">Y на карте, %</Label>
          <Input
            id="location-map-y"
            type="number"
            min={0}
            max={100}
            step="any"
            value={mapY}
            onChange={(event) => setMapY(event.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-ink-500">
        Координаты от 0 до 100. Точка появится на вкладке «Карта».
      </p>
      <div className="space-y-2">
        <Label htmlFor="location-description">Описание</Label>
        <Textarea
          id="location-description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
    </FormShell>
  );
}

type FactionDialogProps = DialogBase & {
  worldId: string;
  faction?: Faction;
};

export function FactionDialog({ worldId, faction, open, onOpenChange }: FactionDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(faction?.name ?? '');
  const [type, setType] = useState(faction?.type ?? '');
  const [goals, setGoals] = useState(faction?.goals ?? '');
  const [resources, setResources] = useState(faction?.resources ?? '');
  const [allies, setAllies] = useState(faction?.allies ?? '');
  const [enemies, setEnemies] = useState(faction?.enemies ?? '');
  const [description, setDescription] = useState(faction?.description ?? '');


  const mutation = useMutation({
    mutationFn: async () => {
      const values = {
        name: name.trim(),
        type: type.trim(),
        goals: goals.trim(),
        resources: resources.trim(),
        allies: allies.trim(),
        enemies: enemies.trim(),
        description: description.trim(),
      };
      if (faction) {
        return updateFaction(faction.id, { ...values, version: faction.version });
      }
      return createFaction(worldId, values);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: worldKeys.factions(worldId) });
      toast.success(faction ? 'Фракция обновлена.' : 'Фракция добавлена.');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить фракцию.'));
    },
  });

  return (
    <FormShell
      open={open}
      onOpenChange={onOpenChange}
      title={faction ? 'Изменить фракцию' : 'Новая фракция'}
      description="Кто действует в мире, чего хочет и с кем враждует."
      pending={mutation.isPending}
      submitLabel={faction ? 'Сохранить' : 'Добавить'}
      onSubmit={() => {
        if (!name.trim()) {
          toast.error('Укажите название фракции.');
          return;
        }
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="faction-name">Название</Label>
          <Input
            id="faction-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="faction-type">Тип</Label>
          <Input
            id="faction-type"
            list="faction-type-options"
            value={type}
            placeholder="order"
            onChange={(event) => setType(event.target.value)}
          />
          <Datalist id="faction-type-options" options={factionTypeOptions} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="faction-goals">Цели</Label>
          <Textarea
            id="faction-goals"
            rows={3}
            value={goals}
            onChange={(event) => setGoals(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="faction-resources">Ресурсы</Label>
          <Textarea
            id="faction-resources"
            rows={3}
            value={resources}
            onChange={(event) => setResources(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="faction-allies">Союзники</Label>
          <Textarea
            id="faction-allies"
            rows={2}
            value={allies}
            onChange={(event) => setAllies(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="faction-enemies">Враги</Label>
          <Textarea
            id="faction-enemies"
            rows={2}
            value={enemies}
            onChange={(event) => setEnemies(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="faction-description">Описание</Label>
        <Textarea
          id="faction-description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
    </FormShell>
  );
}

type RuleDialogProps = DialogBase & {
  worldId: string;
  rule?: WorldRule;
};

export function RuleDialog({ worldId, rule, open, onOpenChange }: RuleDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(rule?.title ?? '');
  const [category, setCategory] = useState(rule?.category ?? '');
  const [description, setDescription] = useState(rule?.description ?? '');
  const [consequences, setConsequences] = useState(rule?.consequences ?? '');
  const [exceptions, setExceptions] = useState(rule?.exceptions ?? '');
  const [importance, setImportance] = useState(String(rule?.importance ?? 3));


  const mutation = useMutation({
    mutationFn: async () => {
      const values = {
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        consequences: consequences.trim(),
        exceptions: exceptions.trim(),
        importance: Number(importance),
      };
      if (rule) {
        return updateRule(rule.id, { ...values, version: rule.version });
      }
      return createRule(worldId, values);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: worldKeys.rules(worldId) });
      toast.success(rule ? 'Закон обновлён.' : 'Закон добавлен.');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить закон.'));
    },
  });

  return (
    <FormShell
      open={open}
      onOpenChange={onOpenChange}
      title={rule ? 'Изменить закон' : 'Новый закон'}
      description="Магия, физика, общество — всё, что нельзя нарушать без последствий."
      pending={mutation.isPending}
      submitLabel={rule ? 'Сохранить' : 'Добавить'}
      onSubmit={() => {
        if (!title.trim()) {
          toast.error('Укажите название закона.');
          return;
        }
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
        <div className="space-y-2">
          <Label htmlFor="rule-title">Название</Label>
          <Input
            id="rule-title"
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-importance">Важность</Label>
          <Select value={importance} onValueChange={setImportance}>
            <SelectTrigger id="rule-importance">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(importanceLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rule-category">Категория</Label>
        <Input
          id="rule-category"
          list="rule-category-options"
          value={category}
          placeholder="magic"
          onChange={(event) => setCategory(event.target.value)}
        />
        <Datalist id="rule-category-options" options={ruleCategoryOptions} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="rule-description">Правило</Label>
        <Textarea
          id="rule-description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rule-consequences">Последствия</Label>
          <Textarea
            id="rule-consequences"
            rows={3}
            value={consequences}
            onChange={(event) => setConsequences(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-exceptions">Исключения</Label>
          <Textarea
            id="rule-exceptions"
            rows={3}
            value={exceptions}
            onChange={(event) => setExceptions(event.target.value)}
          />
        </div>
      </div>
    </FormShell>
  );
}

type LoreDialogProps = DialogBase & {
  worldId: string;
  entry?: LoreEntry;
};

export function LoreDialog({ worldId, entry, open, onOpenChange }: LoreDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(entry?.title ?? '');
  const [type, setType] = useState(entry?.type ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [tags, setTags] = useState(entry?.tags.join(', ') ?? '');


  const mutation = useMutation({
    mutationFn: async () => {
      const values = {
        title: title.trim(),
        type: type.trim(),
        content: content.trim(),
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
      if (entry) {
        return updateLore(entry.id, { ...values, version: entry.version });
      }
      return createLore(worldId, values);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: worldKeys.lore(worldId) });
      toast.success(entry ? 'Запись лора обновлена.' : 'Запись лора добавлена.');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить запись лора.'));
    },
  });

  return (
    <FormShell
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? 'Изменить запись лора' : 'Новая запись лора'}
      description="Легенды, обычаи, артефакты и всё, что делает мир живым."
      pending={mutation.isPending}
      submitLabel={entry ? 'Сохранить' : 'Добавить'}
      onSubmit={() => {
        if (!title.trim()) {
          toast.error('Укажите название записи.');
          return;
        }
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lore-title">Название</Label>
          <Input
            id="lore-title"
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lore-type">Тип</Label>
          <Input
            id="lore-type"
            list="lore-type-options"
            value={type}
            placeholder="legend"
            onChange={(event) => setType(event.target.value)}
          />
          <Datalist id="lore-type-options" options={loreTypeOptions} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="lore-content">Текст</Label>
        <Textarea
          id="lore-content"
          rows={7}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lore-tags">Теги</Label>
        <Input
          id="lore-tags"
          value={tags}
          placeholder="сон, город, пророчество"
          onChange={(event) => setTags(event.target.value)}
        />
        <p className="text-xs text-ink-500">Через запятую.</p>
      </div>
    </FormShell>
  );
}
