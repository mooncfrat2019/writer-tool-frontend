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
import { languageLabels } from './constants';
import { projectFormDefaults, projectFormSchema, type ProjectFormValues } from './schemas';

type Project = components['schemas']['Project'];

type CreateProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (project: Project) => void;
};

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateProjectDialogProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: projectFormDefaults,
  });
  const language = watch('language');

  useEffect(() => {
    if (!open) {
      reset(projectFormDefaults);
    }
  }, [open, reset]);

  const createProject = useMutation({
    mutationFn: async (values: ProjectFormValues) =>
      unwrap(
        await api.POST('/projects', {
          body: {
            title: values.title,
            genre: values.genre,
            description: values.description,
            language: values.language,
          },
        }),
      ),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Проект создан. Теперь можно собрать структуру книги.');
      onOpenChange(false);
      onCreated(project);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось создать проект.'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый проект</DialogTitle>
          <DialogDescription>
            Назовите книгу или серию. Всё остальное можно уточнить позже.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          noValidate
          onSubmit={handleSubmit((values) => createProject.mutate(values))}
        >
          <div className="space-y-2">
            <Label htmlFor="project-title">Название</Label>
            <Input
              id="project-title"
              autoFocus
              placeholder="Например, Хроники Пепельной Луны"
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'project-title-error' : undefined}
              {...register('title')}
            />
            {errors.title ? (
              <p id="project-title-error" className="text-xs text-red-700">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-genre">Жанр</Label>
            <Input
              id="project-genre"
              placeholder="Тёмное фэнтези, роман, нон-фикшн…"
              aria-invalid={Boolean(errors.genre)}
              {...register('genre')}
            />
            {errors.genre ? <p className="text-xs text-red-700">{errors.genre.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">О книге</Label>
            <Textarea
              id="project-description"
              rows={3}
              placeholder="Одна-две фразы о замысле."
              aria-invalid={Boolean(errors.description)}
              {...register('description')}
            />
            {errors.description ? (
              <p className="text-xs text-red-700">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-language">Язык рукописи</Label>
            <Select
              value={language}
              onValueChange={(value) =>
                setValue('language', value as ProjectFormValues['language'], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="project-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(languageLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createProject.isPending}
            >
              Отмена
            </Button>
            <Button type="submit" variant="accent" disabled={createProject.isPending}>
              {createProject.isPending ? 'Создаём…' : 'Создать проект'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
