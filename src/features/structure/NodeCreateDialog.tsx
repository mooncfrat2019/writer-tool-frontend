import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { canContain, findTreeNode, type BookNode } from '@/shared/lib/tree';
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
import { nodeTypeCreateLabels, nodeTypeLabels } from './constants';
import {
  compatibleParents,
  nodeFormSchema,
  parseOptionalNumber,
  type NodeFormValues,
} from './schemas';

type BookNodeType = components['schemas']['BookNodeType'];
type Character = components['schemas']['Character'];

const ROOT_VALUE = 'root';
const NONE_VALUE = 'none';

function defaultParentId(
  nodes: BookNode[],
  type: BookNodeType,
  preferredParentId?: string | null,
): string {
  if (preferredParentId) {
    const preferred = findTreeNode(nodes, preferredParentId);
    if (preferred && canContain(preferred.type, type)) {
      return preferred.id;
    }
  }
  if (type === 'scene') {
    return compatibleParents(nodes, type)[0]?.id ?? '';
  }
  return ROOT_VALUE;
}

type NodeCreateDialogProps = {
  bookId: string;
  type: BookNodeType;
  nodes: BookNode[];
  characters: Character[];
  preferredParentId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (node: BookNode) => void;
};

export function NodeCreateDialog({
  bookId,
  type,
  nodes,
  characters,
  preferredParentId,
  open,
  onOpenChange,
  onCreated,
}: NodeCreateDialogProps) {
  const queryClient = useQueryClient();
  const dialogWasOpenRef = useRef(false);
  const parents = compatibleParents(nodes, type);
  const rootAllowed = type !== 'scene';
  const hasDestination = rootAllowed || parents.length > 0;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NodeFormValues>({
    resolver: zodResolver(nodeFormSchema),
    defaultValues: {
      title: '',
      parentId: defaultParentId(nodes, type, preferredParentId),
      synopsis: '',
      notes: '',
      status: 'idea',
      targetWordCount: '',
      povCharacterId: NONE_VALUE,
    },
  });

  const parentId = watch('parentId');
  const povCharacterId = watch('povCharacterId');

  useEffect(() => {
    if (open && !dialogWasOpenRef.current) {
      reset({
        title: '',
        parentId: defaultParentId(nodes, type, preferredParentId),
        synopsis: '',
        notes: '',
        status: 'idea',
        targetWordCount: '',
        povCharacterId: NONE_VALUE,
      });
    }
    dialogWasOpenRef.current = open;
  }, [nodes, open, preferredParentId, reset, type]);

  const createNode = useMutation({
    mutationFn: async (values: NodeFormValues) =>
      unwrap(
        await api.POST('/books/{bookId}/nodes', {
          params: { path: { bookId } },
          body: {
            type,
            title: values.title,
            parentId: values.parentId === ROOT_VALUE ? null : values.parentId,
            synopsis: values.synopsis || undefined,
            notes: values.notes || undefined,
            targetWordCount: parseOptionalNumber(values.targetWordCount),
            povCharacterId:
              values.povCharacterId === NONE_VALUE ? null : values.povCharacterId,
          },
        }),
      ),
    onSuccess: (node) => {
      void queryClient.invalidateQueries({ queryKey: ['book-tree', bookId] });
      void queryClient.invalidateQueries({ queryKey: ['books'] });
      void queryClient.invalidateQueries({ queryKey: ['project'] });
      toast.success(`${nodeTypeLabels[type]} создана.`);
      onOpenChange(false);
      onCreated(node);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось создать элемент структуры.'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{nodeTypeCreateLabels[type]}</DialogTitle>
          <DialogDescription>
            {type === 'scene'
              ? 'Сцена входит в главу или часть и получает собственный документ.'
              : 'Название можно изменить позже в карточке элемента.'}
          </DialogDescription>
        </DialogHeader>

        {!hasDestination ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Сначала создайте главу или часть — сцену нужно к чему-то прикрепить.
          </div>
        ) : (
          <form
            className="space-y-4"
            noValidate
            onSubmit={handleSubmit((values) => createNode.mutate(values))}
          >
            <div className="space-y-2">
              <Label htmlFor="node-title">Название</Label>
              <Input
                id="node-title"
                autoFocus
                placeholder={
                  type === 'part'
                    ? 'Часть I. Название'
                    : type === 'chapter'
                      ? 'Глава 1. Название'
                      : 'Сцена 1. Название'
                }
                aria-invalid={Boolean(errors.title)}
                {...register('title')}
              />
              {errors.title ? (
                <p className="text-xs text-red-700">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-parent">Куда добавить</Label>
              <Select
                value={parentId}
                onValueChange={(value) =>
                  setValue('parentId', value, { shouldValidate: true })
                }
              >
                <SelectTrigger id="node-parent">
                  <SelectValue placeholder="Выберите место" />
                </SelectTrigger>
                <SelectContent>
                  {rootAllowed ? (
                    <SelectItem value={ROOT_VALUE}>Корень книги</SelectItem>
                  ) : null}
                  {parents.map((parent) => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {nodeTypeLabels[parent.type]} · {parent.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-synopsis">Синопсис</Label>
              <Textarea
                id="node-synopsis"
                rows={2}
                placeholder="Коротко: что здесь происходит."
                {...register('synopsis')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="node-target">Целевой объём, слов</Label>
                <Input
                  id="node-target"
                  inputMode="numeric"
                  placeholder="3 500"
                  aria-invalid={Boolean(errors.targetWordCount)}
                  {...register('targetWordCount')}
                />
                {errors.targetWordCount ? (
                  <p className="text-xs text-red-700">{errors.targetWordCount.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="node-pov">POV</Label>
                <Select
                  value={povCharacterId}
                  onValueChange={(value) => setValue('povCharacterId', value)}
                >
                  <SelectTrigger id="node-pov">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Не выбран</SelectItem>
                    {characters.map((character) => (
                      <SelectItem key={character.id} value={character.id}>
                        {character.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-notes">Заметки</Label>
              <Textarea
                id="node-notes"
                rows={2}
                placeholder="Что важно не забыть в этой сцене."
                {...register('notes')}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createNode.isPending}
              >
                Отмена
              </Button>
              <Button type="submit" variant="accent" disabled={createNode.isPending}>
                {createNode.isPending ? 'Создаём…' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
