import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, type ReactNode } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage, isVersionConflict } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { Button } from '@/shared/ui/button';
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
import {
  CustomFieldsInputs,
  customFieldValueToString,
} from '@/features/customFields/CustomFieldsInputs';
import { useCustomFields } from '@/features/customFields/queries';
import {
  characterColorPalette,
  characterRoleOptions,
  characterStatusOptions,
} from './constants';
import {
  characterProfileSchema,
  characterToProfileValues,
  profileValuesToPayload,
  type CharacterProfileValues,
} from './schemas';

type Character = components['schemas']['Character'];

type CharacterProfileFormProps = {
  character: Character;
  canEdit: boolean;
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-paper-200 bg-white/50 p-5">
      <h2 className="font-serif text-xl text-ink-900">{title}</h2>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed text-ink-500">{description}</p>
      ) : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function CharacterProfileForm({
  character,
  canEdit,
}: CharacterProfileFormProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isDirty },
  } = useForm<CharacterProfileValues>({
    resolver: zodResolver(characterProfileSchema),
    defaultValues: characterToProfileValues(character),
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'customFields',
  });
  const role = watch('role');
  const status = watch('status');
  const color = watch('color');

  const { data: customFieldsData } = useCustomFields(character.projectId, 'character');
  const customDefinitions = useMemo(
    () => customFieldsData?.items ?? [],
    [customFieldsData],
  );
  const definedKeys = useMemo(
    () => new Set(customDefinitions.map((definition) => definition.key)),
    [customDefinitions],
  );
  const customPairs = watch('customFields');
  const customValues = useMemo(
    () => Object.fromEntries(customPairs.map((pair) => [pair.key, pair.value])),
    [customPairs],
  );
  const setCustomFieldValue = (key: string, value: unknown) => {
    const index = customPairs.findIndex((pair) => pair.key === key);
    const text = customFieldValueToString(value);
    if (index >= 0) {
      setValue(`customFields.${index}.value`, text, { shouldDirty: true });
    } else {
      append({ key, value: text });
    }
  };
  const freeFormFields = fields
    .map((field, index) => ({ field, index }))
    .filter(({ field }) => !definedKeys.has(field.key));

  useEffect(() => {
    reset(characterToProfileValues(character));
  }, [character, reset]);

  const update = useMutation({
    mutationFn: async (values: CharacterProfileValues) =>
      unwrap(
        await api.PATCH('/characters/{characterId}', {
          params: { path: { characterId: character.id } },
          body: {
            ...profileValuesToPayload(values),
            version: character.version,
          },
        }),
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(['character', character.id], updated);
      void queryClient.invalidateQueries({ queryKey: ['characters', character.projectId] });
      void queryClient.invalidateQueries({ queryKey: ['project', character.projectId] });
      reset(characterToProfileValues(updated));
      toast.success('Профиль сохранён.');
    },
    onError: (error) => {
      if (isVersionConflict(error)) {
        void queryClient.invalidateQueries({ queryKey: ['character', character.id] });
        toast.error('Профиль уже изменили в другом окне. Загружена свежая версия.');
        return;
      }
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить профиль.'));
    },
  });

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={handleSubmit((values) => update.mutate(values))}
    >
      <fieldset className="space-y-5" disabled={!canEdit || update.isPending}>
        <Section title="Основа" description="Как персонаж представлен в истории.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Имя</Label>
              <Input
                id="profile-name"
                aria-invalid={Boolean(errors.name)}
                {...register('name')}
              />
              {errors.name ? (
                <p className="text-xs text-red-700">{errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-full-name">Полное имя</Label>
              <Input id="profile-full-name" {...register('fullName')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-role">Роль</Label>
              <Select
                value={role}
                onValueChange={(value) =>
                  setValue('role', value as CharacterProfileValues['role'], {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="profile-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {characterRoleOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-status">Статус</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setValue('status', value as CharacterProfileValues['status'], {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="profile-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {characterStatusOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-aliases">Псевдонимы</Label>
              <Input
                id="profile-aliases"
                placeholder="Свидетельница, Седьмая"
                {...register('aliases')}
              />
              <p className="text-xs text-ink-500">Через запятую.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-tags">Теги</Label>
              <Input
                id="profile-tags"
                placeholder="память, архив, союзник"
                {...register('tags')}
              />
              <p className="text-xs text-ink-500">Через запятую.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-age">Возраст</Label>
              <Input id="profile-age" placeholder="27" {...register('age')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-birth">Дата рождения</Label>
              <Input
                id="profile-birth"
                placeholder="год 1024 от Основания"
                {...register('birthDate')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-color">Цвет аватара</Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="profile-color"
                type="color"
                className="h-10 w-12 cursor-pointer rounded-md border border-paper-300 bg-white p-1"
                aria-label="Выбрать цвет"
                {...register('color')}
              />
              <span className="rounded bg-paper-100 px-2 py-1 font-mono text-xs text-ink-500">
                {color}
              </span>
              {characterColorPalette.map((paletteColor) => (
                <button
                  key={paletteColor}
                  type="button"
                  className="h-7 w-7 rounded-full border border-white ring-1 ring-paper-300 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  style={{ backgroundColor: paletteColor }}
                  aria-label={`Выбрать цвет ${paletteColor}`}
                  onClick={() =>
                    setValue('color', paletteColor, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              ))}
            </div>
            {errors.color ? (
              <p className="text-xs text-red-700">{errors.color.message}</p>
            ) : null}
          </div>
        </Section>

        <Section title="Внешность и характер">
          <div className="space-y-2">
            <Label htmlFor="profile-appearance">Внешность</Label>
            <Textarea id="profile-appearance" rows={3} {...register('appearance')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-personality">Характер</Label>
            <Textarea id="profile-personality" rows={3} {...register('personality')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-voice">Голос и речь</Label>
            <Textarea id="profile-voice" rows={2} {...register('voice')} />
          </div>
        </Section>

        <Section title="Движущие силы">
          <div className="space-y-2">
            <Label htmlFor="profile-motivation">Мотивация</Label>
            <Textarea id="profile-motivation" rows={2} {...register('motivation')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-goal">Цель</Label>
              <Textarea id="profile-goal" rows={3} {...register('goal')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-conflict">Конфликт</Label>
              <Textarea id="profile-conflict" rows={3} {...register('conflict')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-arc">Арка</Label>
            <Textarea id="profile-arc" rows={2} {...register('arc')} />
          </div>
        </Section>

        <Section title="Предыстория и тайны">
          <div className="space-y-2">
            <Label htmlFor="profile-backstory">Предыстория</Label>
            <Textarea id="profile-backstory" rows={4} {...register('backstory')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-secrets">Секреты</Label>
            <Textarea id="profile-secrets" rows={3} {...register('secrets')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-notes">Заметки</Label>
            <Textarea id="profile-notes" rows={3} {...register('notes')} />
          </div>
        </Section>

        <Section
          title="Дополнительные поля"
          description="Поля проекта с типами и свободные пары «ключ — значение» для всего остального."
        >
          {customDefinitions.length ? (
            <CustomFieldsInputs
              definitions={customDefinitions}
              values={customValues}
              onChange={setCustomFieldValue}
              canEdit={canEdit}
              idPrefix={`profile-${character.id}`}
            />
          ) : null}
          {freeFormFields.length ? (
            <div className="space-y-2">
              {freeFormFields.map(({ field, index }) => (
                <div key={field.id} className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    className="sm:w-48"
                    placeholder="Ключ"
                    aria-label={`Ключ дополнительного поля ${index + 1}`}
                    {...register(`customFields.${index}.key` as const)}
                  />
                  <Input
                    className="flex-1"
                    placeholder="Значение"
                    aria-label={`Значение дополнительного поля ${index + 1}`}
                    {...register(`customFields.${index}.value` as const)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Удалить дополнительное поле ${index + 1}`}
                    onClick={() => remove(index)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
          {!customDefinitions.length && !freeFormFields.length ? (
            <p className="text-xs text-ink-500">Дополнительных полей пока нет.</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ key: '', value: '' })}
          >
            <Plus size={14} />
            Добавить свободное поле
          </Button>
        </Section>
      </fieldset>

      {canEdit ? (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-lg border border-paper-200 bg-paper-50/95 px-4 py-3 shadow-lg backdrop-blur">
          <p className="text-xs text-ink-500">
            {isDirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены'}
          </p>
          <Button type="submit" disabled={!isDirty || update.isPending}>
            <Save size={15} />
            {update.isPending ? 'Сохраняем…' : 'Сохранить профиль'}
          </Button>
        </div>
      ) : (
        <p className="rounded-md border border-paper-200 bg-paper-100/60 px-3 py-2 text-xs text-ink-500">
          У вас есть доступ только для чтения.
        </p>
      )}
    </form>
  );
}
