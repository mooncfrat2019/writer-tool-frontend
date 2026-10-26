import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/shared/api/errors';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
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
import {
  createCustomField,
  deleteCustomField,
  reorderCustomFields,
  updateCustomField,
  type CustomFieldDef,
  type CustomFieldEntityType,
  type CustomFieldType,
} from './api';
import {
  customFieldEntityTitle,
  customFieldTypeLabels,
  customFieldTypeOptions,
} from './constants';
import { customFieldKeys, useCustomFields } from './queries';

type CustomFieldsManagerProps = {
  projectId: string;
  entityType: CustomFieldEntityType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CustomFieldsManager({
  projectId,
  entityType,
  open,
  onOpenChange,
}: CustomFieldsManagerProps) {
  const queryClient = useQueryClient();
  const query = useCustomFields(projectId, entityType);
  const [editing, setEditing] = useState<CustomFieldDef | null>(null);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<CustomFieldType>('text');
  const [optionsText, setOptionsText] = useState('');
  const [required, setRequired] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomFieldDef | null>(null);

  const reset = () => {
    setEditing(null);
    setLabel('');
    setType('text');
    setOptionsText('');
    setRequired(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
      setDeleteTarget(null);
    }
    onOpenChange(next);
  };

  const startEdit = (definition: CustomFieldDef) => {
    setEditing(definition);
    setLabel(definition.label);
    setType(definition.type);
    setOptionsText(definition.options.join(', '));
    setRequired(definition.required);
  };

  const save = useMutation({
    mutationFn: async () => {
      const options = optionsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const body = { label: label.trim(), type, options, required };
      if (editing) {
        return updateCustomField(editing.id, {
          ...body,
          version: editing.version,
        });
      }
      return createCustomField(projectId, { entityType, ...body });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: customFieldKeys.list(projectId, entityType),
      });
      toast.success(editing ? 'Поле изменено.' : 'Поле добавлено.');
      reset();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить поле.'));
    },
  });

  const remove = useMutation({
    mutationFn: (definition: CustomFieldDef) => deleteCustomField(definition.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: customFieldKeys.list(projectId, entityType),
      });
      toast.success('Поле удалено. Значения в карточках сохранены.');
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить поле.'));
    },
  });

  const needsOptions = type === 'select' || type === 'multiselect';
  const definitions = query.data?.items ?? [];

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      reorderCustomFields(projectId, { entityType, ids }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: customFieldKeys.list(projectId, entityType),
      });
      toast.success('Порядок полей обновлён.');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось изменить порядок полей.'));
    },
  });

  const moveField = (index: number, delta: number) => {
    const ids = definitions.map((definition) => definition.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) {
      return;
    }
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };

  const submit = () => {
    if (!label.trim()) {
      toast.error('Укажите название поля.');
      return;
    }
    if (needsOptions && !optionsText.split(',').some((item) => item.trim())) {
      toast.error('Добавьте хотя бы один вариант списка.');
      return;
    }
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customFieldEntityTitle[entityType]}</DialogTitle>
          <DialogDescription>
            Дополнительные поля с типами. Они появятся в карточке с подписями и
            подходящими элементами ввода.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-paper-200 bg-paper-50/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-ink-900">
              {editing ? 'Изменить поле' : 'Новое поле'}
            </h3>
            {editing ? (
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                <X size={14} />
                Отменить изменение
              </Button>
            ) : null}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="custom-field-label">Название</Label>
              <Input
                id="custom-field-label"
                value={label}
                placeholder="Например, Рост"
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-field-type">Тип</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as CustomFieldType)}
              >
                <SelectTrigger id="custom-field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customFieldTypeOptions.map(([value, text]) => (
                    <SelectItem key={value} value={value}>
                      {text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsOptions ? (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="custom-field-options">Варианты</Label>
                <Input
                  id="custom-field-options"
                  value={optionsText}
                  placeholder="низкий, средний, высокий"
                  onChange={(event) => setOptionsText(event.target.value)}
                />
                <p className="text-xs text-ink-500">Через запятую.</p>
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <Checkbox
                checked={required}
                onChange={(event) => setRequired(event.target.checked)}
              />
              Обязательное поле
            </label>
          </div>
          <Button
            type="button"
            className="mt-4"
            variant="accent"
            size="sm"
            disabled={save.isPending}
            onClick={submit}
          >
            <Plus size={14} />
            {save.isPending
              ? 'Сохраняем…'
              : editing
                ? 'Сохранить поле'
                : 'Добавить поле'}
          </Button>
        </div>

        <div className="mt-4">
          {query.isLoading ? (
            <p className="text-sm text-ink-500">Загружаем поля…</p>
          ) : definitions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-paper-300 px-4 py-6 text-center text-sm text-ink-500">
              Дополнительных полей пока нет.
            </p>
          ) : (
            <ul className="space-y-2">
              {definitions.map((definition, index) => (
                <li
                  key={definition.id}
                  className="flex items-start gap-3 rounded-lg border border-paper-200 bg-white/60 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-ink-900">
                        {definition.label}
                      </span>
                      <Badge tone="neutral">
                        {customFieldTypeLabels[definition.type]}
                      </Badge>
                      {definition.required ? (
                        <Badge tone="warning">Обязательное</Badge>
                      ) : null}
                    </div>
                    {definition.options.length ? (
                      <p className="mt-1 text-xs text-ink-500">
                        {definition.options.join(' · ')}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Переместить поле ${definition.label} выше`}
                      disabled={index === 0 || reorder.isPending}
                      onClick={() => moveField(index, -1)}
                    >
                      <ChevronUp size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Переместить поле ${definition.label} ниже`}
                      disabled={
                        index === definitions.length - 1 || reorder.isPending
                      }
                      onClick={() => moveField(index, 1)}
                    >
                      <ChevronDown size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Изменить поле ${definition.label}`}
                      onClick={() => startEdit(definition)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Удалить поле ${definition.label}`}
                      onClick={() => setDeleteTarget(definition)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Закрыть
          </Button>
        </DialogFooter>
        {deleteTarget ? (
          <div className="rounded-lg border border-red-200 bg-red-50/70 p-3">
            <p className="text-sm leading-relaxed text-red-950">
              Удалить поле «{deleteTarget.label}»? Уже сохранённые значения
              останутся в данных.
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
              >
                Отмена
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate(deleteTarget)}
              >
                {remove.isPending ? 'Удаляем…' : 'Удалить поле'}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
