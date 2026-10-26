import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
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
import {
  characterRoleOptions,
  characterStatusOptions,
} from './constants';
import {
  characterCreateDefaults,
  characterCreateSchema,
  type CharacterCreateValues,
} from './schemas';

type Character = components['schemas']['Character'];

type CharacterCreateDialogProps = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (character: Character) => void;
};

export function CharacterCreateDialog({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: CharacterCreateDialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CharacterCreateValues>({
    resolver: zodResolver(characterCreateSchema),
    defaultValues: characterCreateDefaults,
  });
  const role = watch('role');
  const status = watch('status');

  useEffect(() => {
    if (!open) {
      reset(characterCreateDefaults);
    }
  }, [open, reset]);

  const createCharacter = useMutation({
    mutationFn: async (values: CharacterCreateValues) =>
      unwrap(
        await api.POST('/projects/{projectId}/characters', {
          params: { path: { projectId } },
          body: {
            name: values.name,
            fullName: values.fullName || undefined,
            role: values.role,
            status: values.status,
            tags: values.tags
              ? values.tags
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              : [],
            goal: values.goal || undefined,
          },
        }),
      ),
    onSuccess: (character) => {
      void queryClient.invalidateQueries({ queryKey: ['characters', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Персонаж добавлен в историю.');
      onOpenChange(false);
      onCreated(character);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось создать персонажа.'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый персонаж</DialogTitle>
          <DialogDescription>
            Начните с имени и роли. Остальные детали можно раскрыть в профиле.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          noValidate
          onSubmit={handleSubmit((values) => createCharacter.mutate(values))}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="character-name">Имя</Label>
              <Input
                id="character-name"
                autoFocus
                placeholder="Мира Вейн"
                aria-invalid={Boolean(errors.name)}
                {...register('name')}
              />
              {errors.name ? (
                <p className="text-xs text-red-700">{errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="character-full-name">Полное имя</Label>
              <Input
                id="character-full-name"
                placeholder="Мира Элеонора Вейн"
                {...register('fullName')}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="character-role">Роль</Label>
              <Select
                value={role}
                onValueChange={(value) =>
                  setValue('role', value as CharacterCreateValues['role'], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="character-role">
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
              <Label htmlFor="character-status">Статус</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setValue('status', value as CharacterCreateValues['status'], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="character-status">
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

          <div className="space-y-2">
            <Label htmlFor="character-tags">Теги</Label>
            <Input
              id="character-tags"
              placeholder="главная героиня, память, архив"
              {...register('tags')}
            />
            <p className="text-xs text-ink-500">Через запятую.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="character-goal">Цель</Label>
            <Textarea
              id="character-goal"
              rows={2}
              placeholder="Чего персонаж хочет добиться."
              {...register('goal')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createCharacter.isPending}
            >
              Отмена
            </Button>
            <Button type="submit" variant="accent" disabled={createCharacter.isPending}>
              {createCharacter.isPending ? 'Создаём…' : 'Создать персонажа'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
