import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
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
import { Textarea } from '@/shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useWorlds } from '@/features/worlds/queries';
import {
  bookCreateDefaults,
  bookCreateSchema,
  parseOptionalNumber,
  type BookCreateValues,
} from './schemas';

type Book = components['schemas']['Book'];

type BookCreateDialogProps = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (book: Book) => void;
};

export function BookCreateDialog({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: BookCreateDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookCreateValues>({
    resolver: zodResolver(bookCreateSchema),
    defaultValues: bookCreateDefaults,
  });

  const worldId = watch('worldId');
  const worldsQuery = useWorlds(projectId);
  const worlds = worldsQuery.data?.items ?? [];

  useEffect(() => {
    if (!open) {
      reset(bookCreateDefaults);
    }
  }, [open, reset]);

  const createBook = useMutation({
    mutationFn: async (values: BookCreateValues) =>
      unwrap(
        await api.POST('/projects/{projectId}/books', {
          params: { path: { projectId } },
          body: {
            title: values.title,
            subtitle: values.subtitle || undefined,
            synopsis: values.synopsis || undefined,
            targetWordCount: parseOptionalNumber(values.targetWordCount),
            worldId: values.worldId || undefined,
          },
        }),
      ),
    onSuccess: (book) => {
      toast.success('Книга добавлена в проект.');
      onOpenChange(false);
      onCreated(book);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось создать книгу.'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая книга</DialogTitle>
          <DialogDescription>
            Книга внутри проекта помогает разделить серию или несколько томов.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          noValidate
          onSubmit={handleSubmit((values) => createBook.mutate(values))}
        >
          <div className="space-y-2">
            <Label htmlFor="book-title">Название</Label>
            <Input
              id="book-title"
              autoFocus
              placeholder="Книга первая. Пепел"
              aria-invalid={Boolean(errors.title)}
              {...register('title')}
            />
            {errors.title ? (
              <p className="text-xs text-red-700">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="book-subtitle">Подзаголовок</Label>
            <Input
              id="book-subtitle"
              placeholder="Например, название серии"
              aria-invalid={Boolean(errors.subtitle)}
              {...register('subtitle')}
            />
            {errors.subtitle ? (
              <p className="text-xs text-red-700">{errors.subtitle.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="book-synopsis">Синопсис</Label>
            <Textarea
              id="book-synopsis"
              rows={3}
              placeholder="Коротко о сюжете книги."
              aria-invalid={Boolean(errors.synopsis)}
              {...register('synopsis')}
            />
            {errors.synopsis ? (
              <p className="text-xs text-red-700">{errors.synopsis.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="book-world">Мир книги</Label>
            <Select
              value={worldId || 'none'}
              onValueChange={(value) =>
                setValue('worldId', value === 'none' ? '' : value)
              }
            >
              <SelectTrigger id="book-world">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без мира</SelectItem>
                {worlds.map((world) => (
                  <SelectItem key={world.id} value={world.id}>
                    {world.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-ink-500">
              Основной мир, в котором происходит действие книги.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="book-target">Целевой объём, слов</Label>
            <Input
              id="book-target"
              inputMode="numeric"
              placeholder="120 000"
              aria-invalid={Boolean(errors.targetWordCount)}
              {...register('targetWordCount')}
            />
            {errors.targetWordCount ? (
              <p className="text-xs text-red-700">{errors.targetWordCount.message}</p>
            ) : (
              <p className="text-xs text-ink-500">Можно оставить пустым.</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createBook.isPending}
            >
              Отмена
            </Button>
            <Button type="submit" variant="accent" disabled={createBook.isPending}>
              {createBook.isPending ? 'Создаём…' : 'Создать книгу'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
