import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { formatAuthorSheets, formatDateTime, formatWords } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

type DocumentVersion = components['schemas']['DocumentVersion'];

const sourceLabels: Record<string, string> = {
  client: 'Сохранение',
  collab: 'Совместное редактирование',
  manual: 'Вручную',
  restore: 'Восстановление',
};

type VersionHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  canEdit: boolean;
};

export function VersionHistoryDialog({
  open,
  onOpenChange,
  documentId,
  canEdit,
}: VersionHistoryDialogProps) {
  const queryClient = useQueryClient();
  const [restoreTarget, setRestoreTarget] = useState<DocumentVersion | null>(null);

  const versionsQuery = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: async () =>
      unwrap(
        await api.GET('/documents/{documentId}/versions', {
          params: { path: { documentId } },
        }),
      ),
    enabled: open,
  });

  const createVersion = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST('/documents/{documentId}/versions', {
          params: { path: { documentId } },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['document-versions', documentId],
      });
      toast.success('Версия сохранена.');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить версию.'));
    },
  });

  const restoreVersion = useMutation({
    mutationFn: async (versionId: string) =>
      unwrap(
        await api.POST('/documents/{documentId}/versions/{versionId}/restore', {
          params: { path: { documentId, versionId } },
        }),
      ),
    onSuccess: () => {
      toast.success('Версия восстановлена. Перезагружаем документ.');
      setRestoreTarget(null);
      onOpenChange(false);
      window.setTimeout(() => window.location.reload(), 250);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось восстановить версию.'));
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>История версий</DialogTitle>
            <DialogDescription>
              Снимки текста создаются автоматически и вручную. При восстановлении
              активные соавторы будут отключены, документ перезагрузится.
            </DialogDescription>
          </DialogHeader>

          {canEdit ? (
            <Button
              variant="accent"
              className="w-full"
              onClick={() => createVersion.mutate()}
              disabled={createVersion.isPending}
            >
              <History size={16} />
              {createVersion.isPending ? 'Сохраняем…' : 'Сохранить версию сейчас'}
            </Button>
          ) : null}

          <div className="mt-4">
            {versionsQuery.isLoading ? (
              <p className="text-sm text-ink-500">Загрузка…</p>
            ) : versionsQuery.error ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                {getApiErrorMessage(versionsQuery.error, 'История не загрузилась.')}
              </p>
            ) : versionsQuery.data?.items.length ? (
              <ul className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                {versionsQuery.data.items.map((version) => (
                  <li
                    key={version.id}
                    className="flex items-center gap-3 rounded-md border border-paper-200 bg-white/60 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-ink-900">
                          {formatDateTime(version.createdAt)}
                        </span>
                        <Badge tone="neutral">
                          {sourceLabels[version.source] ?? version.source}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-ink-500">
                        {formatWords(version.wordCount)} ·{' '}
                        {formatAuthorSheets(version.authorSheets ?? 0)} · ревизия{' '}
                        {version.version}
                      </p>
                    </div>
                    {canEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreTarget(version)}
                      >
                        <RotateCcw size={14} />
                        Восстановить
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-paper-300 px-3 py-6 text-center text-sm text-ink-500">
                Версий пока нет. Сохраните первую вручную.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={restoreTarget !== null}
        onOpenChange={(next) => {
          if (!next) {
            setRestoreTarget(null);
          }
        }}
        title="Восстановить версию?"
        description="Текущий текст будет заменён выбранной версией, активные соавторы отключатся. Действие можно отменить только восстановлением другой версии."
        confirmLabel="Восстановить"
        pendingLabel="Восстанавливаем…"
        pending={restoreVersion.isPending}
        destructive={false}
        onConfirm={() => {
          if (restoreTarget) {
            restoreVersion.mutate(restoreTarget.id);
          }
        }}
      />
    </>
  );
}
