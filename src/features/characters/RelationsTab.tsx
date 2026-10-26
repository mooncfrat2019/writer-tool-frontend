import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, ArrowRight, Link2, Plus, Trash2, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
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
import { Textarea } from '@/shared/ui/textarea';
import { CharacterAvatar } from './CharacterAvatar';
import { relationTypeLabels, relationTypeOptions } from './constants';
import {
  relationCreateSchema,
  type RelationCreateValues,
} from './schemas';

type Character = components['schemas']['Character'];
type CharacterRelation = components['schemas']['CharacterRelation'];

type RelationCreateDialogProps = {
  character: Character;
  characters: Character[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function RelationCreateDialog({
  character,
  characters,
  open,
  onOpenChange,
}: RelationCreateDialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RelationCreateValues>({
    resolver: zodResolver(relationCreateSchema),
    defaultValues: {
      toCharacterId: '',
      type: 'ally',
      label: '',
      strength: '0',
      isMutual: false,
      notes: '',
    },
  });
  const type = watch('type');
  const isMutual = watch('isMutual');
  const candidates = useMemo(
    () => characters.filter((candidate) => candidate.id !== character.id),
    [character.id, characters],
  );

  useEffect(() => {
    if (open) {
      reset({
        toCharacterId: candidates[0]?.id ?? '',
        type: 'ally',
        label: '',
        strength: '0',
        isMutual: false,
        notes: '',
      });
    }
  }, [open, reset, candidates]);

  const createRelation = useMutation({
    mutationFn: async (values: RelationCreateValues) =>
      unwrap(
        await api.POST('/characters/{characterId}/relations', {
          params: { path: { characterId: character.id } },
          body: {
            toCharacterId: values.toCharacterId,
            type: values.type,
            label: values.label || undefined,
            strength: values.strength === '' ? 0 : Number(values.strength),
            isMutual: values.isMutual,
            notes: values.notes || undefined,
          },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['character-relations', character.id],
      });
      toast.success('Связь добавлена.');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось создать связь.'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая связь</DialogTitle>
          <DialogDescription>
            Связи помогают увидеть конфликты и союзы между героями.
          </DialogDescription>
        </DialogHeader>

        {candidates.length === 0 ? (
          <div className="rounded-md border border-dashed border-paper-300 px-4 py-6 text-center text-sm text-ink-500">
            Для связи нужен хотя бы ещё один персонаж в проекте.
          </div>
        ) : (
          <form
            className="space-y-4"
            noValidate
            onSubmit={handleSubmit((values) => createRelation.mutate(values))}
          >
            <div className="space-y-2">
              <Label htmlFor="relation-target">С кем</Label>
              <Select
                value={watch('toCharacterId')}
                onValueChange={(value) =>
                  setValue('toCharacterId', value, { shouldValidate: true })
                }
              >
                <SelectTrigger id="relation-target">
                  <SelectValue placeholder="Выберите персонажа" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.toCharacterId ? (
                <p className="text-xs text-red-700">{errors.toCharacterId.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="relation-type">Тип связи</Label>
              <Select
                value={type}
                onValueChange={(value) =>
                  setValue('type', value as RelationCreateValues['type'], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="relation-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {relationTypeOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <div className="space-y-2">
                <Label htmlFor="relation-label">Подпись</Label>
                <Input
                  id="relation-label"
                  placeholder="союзники поневоле"
                  {...register('label')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relation-strength">Сила</Label>
                <Input
                  id="relation-strength"
                  inputMode="numeric"
                  placeholder="от -100 до 100"
                  aria-invalid={Boolean(errors.strength)}
                  {...register('strength')}
                />
                {errors.strength ? (
                  <p className="text-xs text-red-700">{errors.strength.message}</p>
                ) : null}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
              <Checkbox
                checked={isMutual}
                onChange={(event) =>
                  setValue('isMutual', event.target.checked, { shouldDirty: true })
                }
              />
              Связь взаимна
            </label>

            <div className="space-y-2">
              <Label htmlFor="relation-notes">Заметки</Label>
              <Textarea
                id="relation-notes"
                rows={2}
                placeholder="Что важно помнить об этой связи."
                {...register('notes')}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createRelation.isPending}
              >
                Отмена
              </Button>
              <Button type="submit" variant="accent" disabled={createRelation.isPending}>
                {createRelation.isPending ? 'Создаём…' : 'Добавить связь'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

type RelationsTabProps = {
  character: Character;
  characters: Character[];
  canEdit: boolean;
};

export function RelationsTab({ character, characters, canEdit }: RelationsTabProps) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CharacterRelation | null>(null);

  const relationsQuery = useQuery({
    queryKey: ['character-relations', character.id],
    queryFn: async () =>
      unwrap(
        await api.GET('/characters/{characterId}/relations', {
          params: { path: { characterId: character.id } },
        }),
      ),
  });

  const characterMap = new Map(characters.map((item) => [item.id, item]));

  const deleteRelation = useMutation({
    mutationFn: async (relation: CharacterRelation) =>
      api.DELETE('/character-relations/{relationId}', {
        params: { path: { relationId: relation.id } },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['character-relations', character.id],
      });
      toast.success('Связь удалена.');
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить связь.'));
    },
  });

  const relations = relationsQuery.data?.items ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-ink-900">Связи</h2>
          <p className="mt-1 text-sm text-ink-500">
            Кем {character.name} приходится другим героям и что это меняет.
          </p>
        </div>
        {canEdit ? (
          <Button
            variant="outline"
            onClick={() => setCreateOpen(true)}
            disabled={characters.length < 2}
          >
            <Plus size={15} />
            Добавить связь
          </Button>
        ) : null}
      </div>

      <div className="mt-6">
        {relationsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : relationsQuery.isError ? (
          <ErrorState
            title="Связи не загрузились"
            description={getApiErrorMessage(
              relationsQuery.error,
              'Не удалось получить связи персонажа.',
            )}
            onRetry={() => void relationsQuery.refetch()}
          />
        ) : relations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-paper-300 px-6 py-12 text-center">
            <Users className="mx-auto text-ink-500" size={24} />
            <p className="mt-3 font-serif text-xl text-ink-900">Связей пока нет</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
              Добавьте того, кто влияет на историю {character.name}: союзника,
              соперника или тайного врага.
            </p>
            {canEdit && characters.length >= 2 ? (
              <Button className="mt-5" variant="outline" onClick={() => setCreateOpen(true)}>
                <Link2 size={15} />
                Создать первую связь
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-3">
            {relations.map((relation) => {
              const otherId =
                relation.fromCharacterId === character.id
                  ? relation.toCharacterId
                  : relation.fromCharacterId;
              const other = characterMap.get(otherId);
              const incoming = relation.toCharacterId === character.id;
              const Icon = relation.isMutual ? ArrowLeftRight : ArrowRight;
              return (
                <li
                  key={relation.id}
                  className="rounded-lg border border-paper-200 bg-white/55 p-4"
                >
                  <div className="flex items-start gap-3">
                    <CharacterAvatar
                      size="sm"
                      name={other?.name ?? 'Персонаж'}
                      color={other?.color}
                      avatarUrl={other?.avatarUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-ink-900">
                          {other?.name ?? 'Неизвестный персонаж'}
                        </p>
                        <Badge tone="accent">{relationTypeLabels[relation.type]}</Badge>
                        {relation.isMutual ? (
                          <Badge tone="success">Взаимно</Badge>
                        ) : null}
                      </div>
                      {relation.label ? (
                        <p className="mt-1 text-xs italic text-ink-500">
                          «{relation.label}»
                        </p>
                      ) : null}
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
                        <Icon size={13} />
                        {relation.isMutual
                          ? 'Связь в обе стороны'
                          : incoming
                            ? `${other?.name ?? 'Он(а)'} → ${character.name}`
                            : `${character.name} → ${other?.name ?? 'он(а)'}`}
                        {typeof relation.strength === 'number'
                          ? ` · сила ${relation.strength > 0 ? '+' : ''}${relation.strength}`
                          : null}
                      </p>
                      {relation.notes ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                          {relation.notes}
                        </p>
                      ) : null}
                    </div>
                    {canEdit ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Удалить связь"
                        onClick={() => setDeleteTarget(relation)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <RelationCreateDialog
        character={character}
        characters={characters}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Удалить связь?"
        description="Связь исчезнет из профилей обоих персонажей. Это действие нельзя отменить."
        confirmLabel="Удалить связь"
        pending={deleteRelation.isPending}
        onConfirm={() => deleteTarget && deleteRelation.mutate(deleteTarget)}
      />
    </div>
  );
}
