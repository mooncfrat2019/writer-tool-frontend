import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, Images, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
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
import { ImageUrlField } from '@/shared/ui/image-url-field';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Skeleton } from '@/shared/ui/skeleton';

type Character = components['schemas']['Character'];
type Attachment = components['schemas']['Attachment'];

type AddIllustrationDialogProps = {
  character: Character;
  attachmentsCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function AddIllustrationDialog({
  character,
  attachmentsCount,
  open,
  onOpenChange,
}: AddIllustrationDialogProps) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [urlValid, setUrlValid] = useState(false);
  const [caption, setCaption] = useState('');

  const resetDialog = () => {
    setUrl('');
    setUrlValid(false);
    setCaption('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetDialog();
    }
    onOpenChange(nextOpen);
  };

  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST('/characters/{characterId}/attachments', {
          params: { path: { characterId: character.id } },
          body: {
            url: url.trim(),
            role: 'illustration',
            caption: caption.trim() || undefined,
            sortOrder: attachmentsCount,
          },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['character-attachments', character.id],
      });
      toast.success('Иллюстрация добавлена.');
      handleOpenChange(false);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось добавить иллюстрацию.'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая иллюстрация</DialogTitle>
          <DialogDescription>
            Вставьте прямую ссылку на изображение — оно прикрепится к профилю{' '}
            {character.name} и будет загружаться со стороннего сайта.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ImageUrlField
            id="illustration-url"
            label="Ссылка на иллюстрацию"
            value={url}
            onChange={setUrl}
            onValidityChange={setUrlValid}
            disabled={save.isPending}
            helpText="Сначала проверьте ссылку: превью появится, когда изображение действительно загрузится."
          />

          <div className="space-y-2">
            <Label htmlFor="illustration-caption">Подпись</Label>
            <Input
              id="illustration-caption"
              value={caption}
              placeholder="Например, Мира на площади"
              onChange={(event) => setCaption(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={save.isPending}
          >
            Отмена
          </Button>
          <Button
            type="button"
            variant="accent"
            disabled={!urlValid || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Сохраняем…' : 'Добавить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CaptionDialogProps = {
  attachment: Attachment;
  onOpenChange: (open: boolean) => void;
};

function CaptionDialog({ attachment, onOpenChange }: CaptionDialogProps) {
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState(attachment.caption ?? '');

  const updateCaption = useMutation({
    mutationFn: async (payload: { attachment: Attachment; caption: string }) =>
      unwrap(
        await api.PATCH('/attachments/{attachmentId}', {
          params: { path: { attachmentId: payload.attachment.id } },
          body: { caption: payload.caption.trim() },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['character-attachments'] });
      toast.success('Подпись обновлена.');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось обновить подпись.'));
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Подпись к иллюстрации</DialogTitle>
          <DialogDescription>
            Короткое описание поможет вспомнить контекст сцены.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="caption-edit">Подпись</Label>
          <Input
            id="caption-edit"
            autoFocus
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            variant="accent"
            disabled={updateCaption.isPending}
            onClick={() =>
              attachment && updateCaption.mutate({ attachment, caption })
            }
          >
            {updateCaption.isPending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type IllustrationsTabProps = {
  character: Character;
  canEdit: boolean;
};

export function IllustrationsTab({ character, canEdit }: IllustrationsTabProps) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [captionTarget, setCaptionTarget] = useState<Attachment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);

  const attachmentsQuery = useQuery({
    queryKey: ['character-attachments', character.id],
    queryFn: async () =>
      unwrap(
        await api.GET('/characters/{characterId}/attachments', {
          params: { path: { characterId: character.id } },
        }),
      ),
  });

  const attachments = (attachmentsQuery.data?.items ?? []).filter(
    (attachment) => attachment.role !== 'avatar',
  );

  const deleteAttachment = useMutation({
    mutationFn: async (attachment: Attachment) =>
      api.DELETE('/attachments/{attachmentId}', {
        params: { path: { attachmentId: attachment.id } },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['character-attachments', character.id],
      });
      toast.success('Иллюстрация удалена.');
      setDeleteTarget(null);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить иллюстрацию.'));
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-ink-900">Иллюстрации</h2>
          <p className="mt-1 text-sm text-ink-500">
            Визуальные заметки о внешности, сценах и настроении.
          </p>
        </div>
        {canEdit ? (
          <Button variant="outline" onClick={() => setAddOpen(true)}>
            <Plus size={15} />
            Добавить по ссылке
          </Button>
        ) : null}
      </div>

      <div className="mt-6">
        {attachmentsQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="aspect-[4/3] w-full rounded-lg" />
            ))}
          </div>
        ) : attachmentsQuery.isError ? (
          <ErrorState
            title="Иллюстрации не загрузились"
            description={getApiErrorMessage(
              attachmentsQuery.error,
              'Не удалось получить изображения персонажа.',
            )}
            onRetry={() => void attachmentsQuery.refetch()}
          />
        ) : attachments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-paper-300 px-6 py-12 text-center">
            <Images className="mx-auto text-ink-500" size={24} />
            <p className="mt-3 font-serif text-xl text-ink-900">Пока без картинок</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
              Добавьте ссылку на портрет, набросок или кадр сцены — визуальная
              память помогает держать образ.
            </p>
            {canEdit ? (
              <Button className="mt-5" variant="outline" onClick={() => setAddOpen(true)}>
                <Plus size={15} />
                Добавить по ссылке
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="group overflow-hidden rounded-lg border border-paper-200 bg-white/55"
              >
                <div className="aspect-[4/3] bg-paper-100">
                  {attachment.url ? (
                    <img
                      className="h-full w-full object-cover"
                      src={attachment.url}
                      alt={attachment.caption || 'Иллюстрация персонажа'}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-ink-500">
                      <ImageIcon size={28} />
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 min-h-5 text-sm font-medium text-ink-900">
                    {attachment.caption || 'Без подписи'}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-ink-500">
                      {formatDate(attachment.createdAt)}
                    </span>
                    {canEdit ? (
                      <span className="flex">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Изменить подпись"
                          onClick={() => setCaptionTarget(attachment)}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Удалить иллюстрацию"
                          onClick={() => setDeleteTarget(attachment)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddIllustrationDialog
        character={character}
        attachmentsCount={attachments.length}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      {captionTarget ? (
        <CaptionDialog
          key={captionTarget.id}
          attachment={captionTarget}
          onOpenChange={(open) => {
            if (!open) {
              setCaptionTarget(null);
            }
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Удалить иллюстрацию?"
        description="Изображение исчезнет из профиля персонажа. Это действие нельзя отменить."
        confirmLabel="Удалить"
        pending={deleteAttachment.isPending}
        onConfirm={() => deleteTarget && deleteAttachment.mutate(deleteTarget)}
      />
    </div>
  );
}
