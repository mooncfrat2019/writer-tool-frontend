import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { countTreeNodes, type BookNode } from '@/shared/lib/tree';
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

type NodeDeleteDialogProps = {
  node: BookNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (nodeId: string) => void;
};

export function NodeDeleteDialog({
  node,
  open,
  onOpenChange,
  onDeleted,
}: NodeDeleteDialogProps) {
  const queryClient = useQueryClient();
  const [confirmedChildren, setConfirmedChildren] = useState(false);
  const childCount = node ? countTreeNodes(node.children ?? []) : 0;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmedChildren(false);
    }
    onOpenChange(nextOpen);
  };

  const deleteNode = useMutation({
    mutationFn: async (target: BookNode) =>
      api.DELETE('/nodes/{nodeId}', {
        params: {
          path: { nodeId: target.id },
          query: { strategy: childCount > 0 ? 'cascade' : 'reject_if_children' },
        },
      }),
    onSuccess: (_result, target) => {
      void queryClient.invalidateQueries({ queryKey: ['book-tree', target.bookId] });
      void queryClient.invalidateQueries({ queryKey: ['books'] });
      void queryClient.invalidateQueries({ queryKey: ['project'] });
      toast.success('Элемент структуры удалён.');
      handleOpenChange(false);
      onDeleted(target.id);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить элемент.'));
    },
  });

  const blockedByChildren = childCount > 0 && !confirmedChildren;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Удалить элемент?</DialogTitle>
          <DialogDescription>
            {node ? (
              <>
                «{node.title}» будет удалён из структуры книги.
                {node.documentId ? ' Текст документа тоже будет удалён безвозвратно.' : ''}
              </>
            ) : (
              'Элемент будет удалён безвозвратно.'
            )}
          </DialogDescription>
        </DialogHeader>

        {childCount > 0 ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="flex items-start gap-2 text-sm font-medium text-red-900">
              <AlertTriangle className="mt-0.5 shrink-0" size={16} />
              Внутри{' '}
              {childCount === 1
                ? 'находится 1 вложенный элемент'
                : `находятся ${childCount} вложенных элементов`}
              .
            </p>
            <p className="mt-2 text-xs leading-relaxed text-red-800">
              Вместе с ними удалятся все вложенные документы и их текст. Это действие
              нельзя отменить.
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs font-medium text-red-900">
              <Checkbox
                checked={confirmedChildren}
                onChange={(event) => setConfirmedChildren(event.target.checked)}
              />
              Понимаю, что вложенные элементы тоже будут удалены
            </label>
          </div>
        ) : (
          <p className="rounded-md border border-paper-200 bg-paper-100/60 px-3 py-2 text-xs text-ink-500">
            Это действие нельзя отменить.
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={deleteNode.isPending}
          >
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!node || blockedByChildren || deleteNode.isPending}
            onClick={() => node && deleteNode.mutate(node)}
          >
            {deleteNode.isPending ? 'Удаляем…' : 'Удалить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
