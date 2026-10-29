import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ImageIcon,
  Images,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadProjectImage } from '@/shared/api/assets';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { formatDate, formatNumber } from '@/shared/lib/format';
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
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Skeleton } from '@/shared/ui/skeleton';

type Character = components['schemas']['Character'];
type Attachment = components['schemas']['Attachment'];

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${formatNumber(Math.max(1, Math.round(bytes / 1024)))} КБ`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString('ru-RU', {
    maximumFractionDigits: 1,
  })} МБ`;
}

type UploadIllustrationDialogProps = {
  character: Character;
  attachmentsCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function UploadIllustrationDialog({
  character,
  attachmentsCount,
  open,
  onOpenChange,
}: UploadIllustrationDialogProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    },
    [],
  );

  const clearPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  };

  const resetDialog = () => {
    clearPreview();
    setFile(null);
    setCaption('');
    setFileError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetDialog();
    }
    onOpenChange(nextOpen);
  };

  const handleFile = (selected: File | null) => {
    clearPreview();
    if (!selected) {
      setFile(null);
      return;
    }
    if (!selected.type.startsWith('image/')) {
      setFileError('Поддерживаются только изображения.');
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setFileError('Файл больше 20 МБ.');
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(selected);
    const url = URL.createObjectURL(selected);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    if (!caption) {
      setCaption(selected.name.replace(/\.[^.]+$/, ''));
    }
  };

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error('File is required');
      }
      const asset = await uploadProjectImage(character.projectId, file);

      return unwrap(
        await api.POST('/characters/{characterId}/attachments', {
          params: { path: { characterId: character.id } },
          body: {
            assetId: asset.id,
            role: 'illustration',
            caption: caption.trim() || undefined,
            sortOrder: attachmentsCount,
          },
        }),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['character-attachments', character.id],
      });
      toast.success('Иллюстрация добавлена.');
      handleOpenChange(false);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось загрузить иллюстрацию.'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая иллюстрация</DialogTitle>
          <DialogDescription>
            Изображение прикрепится к профилю {character.name}. Поддерживаются
            JPG, PNG, WebP и другие изображения до 20 МБ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {previewUrl ? (
            <img
              className="max-h-64 w-full rounded-md border border-paper-200 object-contain"
              src={previewUrl}
              alt="Предпросмотр иллюстрации"
            />
          ) : (
            <label
              htmlFor="illustration-file"
              className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-paper-300 bg-paper-100/40 px-6 py-10 text-center transition hover:border-accent-500/60 hover:bg-paper-100"
            >
              <Upload className="text-ink-500" size={22} />
              <span className="mt-2 text-sm font-medium text-ink-900">
                Выбрать изображение
              </span>
              <span className="mt-1 text-xs text-ink-500">До 20 МБ</span>
            </label>
          )}

          <input
            id="illustration-file"
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/gif"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          />

          {file ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-paper-200 bg-white/60 px-3 py-2 text-xs">
              <span className="truncate text-ink-700">{file.name}</span>
              <span className="shrink-0 text-ink-500">{formatFileSize(file.size)}</span>
            </div>
          ) : null}
          {fileError ? <p className="text-xs text-red-700">{fileError}</p> : null}

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
            disabled={upload.isPending}
          >
            Отмена
          </Button>
          <Button
            type="button"
            variant="accent"
            disabled={!file || upload.isPending}
            onClick={() => upload.mutate()}
          >
            {upload.isPending ? 'Загружаем…' : 'Загрузить'}
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
  const [uploadOpen, setUploadOpen] = useState(false);
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
          <Button variant="outline" onClick={() => setUploadOpen(true)}>
            <Upload size={15} />
            Загрузить
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
              Загрузите портрет, набросок или кадр сцены — визуальная память помогает
              держать образ.
            </p>
            {canEdit ? (
              <Button className="mt-5" variant="outline" onClick={() => setUploadOpen(true)}>
                <Upload size={15} />
                Добавить иллюстрацию
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

      <UploadIllustrationDialog
        character={character}
        attachmentsCount={attachments.length}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
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
