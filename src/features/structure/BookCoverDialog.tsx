import { useMutation } from '@tanstack/react-query';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadProjectImage } from '@/shared/api/assets';
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

type Book = components['schemas']['Book'];

const MAX_FILE_SIZE = 20 * 1024 * 1024;

type BookCoverDialogProps = {
  projectId: string;
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (book: Book) => void;
};

export function BookCoverDialog({
  projectId,
  book,
  open,
  onOpenChange,
  onUpdated,
}: BookCoverDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    },
    [],
  );

  const clearPreview = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreviewUrl(null);
  };

  const handleFile = (selected: File | null) => {
    clearPreview();
    setFile(null);
    setFileError(null);
    if (!selected) {
      return;
    }
    if (!selected.type.startsWith('image/')) {
      setFileError('Поддерживаются только изображения.');
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setFileError('Файл больше 20 МБ.');
      return;
    }
    setFile(selected);
    const url = URL.createObjectURL(selected);
    previewRef.current = url;
    setPreviewUrl(url);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      clearPreview();
      setFile(null);
      setFileError(null);
    }
    onOpenChange(nextOpen);
  };

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error('Выберите файл');
      }
      const asset = await uploadProjectImage(projectId, file);
      return unwrap(
        await api.PUT('/books/{bookId}/cover', {
          params: { path: { bookId: book.id } },
          body: { assetId: asset.id },
        }),
      );
    },
    onSuccess: (updated) => {
      toast.success('Обложка обновлена');
      onUpdated(updated);
      handleOpenChange(false);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось загрузить обложку.'));
    },
  });

  const remove = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.DELETE('/books/{bookId}/cover', {
          params: { path: { bookId: book.id } },
        }),
      ),
    onSuccess: (updated) => {
      toast.success('Обложка удалена');
      onUpdated(updated);
      handleOpenChange(false);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить обложку.'));
    },
  });

  const currentCover = previewUrl ?? book.coverUrl ?? null;
  const pending = upload.isPending || remove.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Обложка книги</DialogTitle>
          <DialogDescription>
            Обложка попадёт на титульную страницу DOCX и в титул FB2.
            Поддерживаются JPG, PNG и GIF до 20 МБ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {currentCover ? (
            <img
              alt={`Обложка ${book.title}`}
              className="max-h-72 w-full rounded-md border border-paper-200 bg-paper-100 object-contain"
              src={currentCover}
            />
          ) : (
            <label
              className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-paper-300 bg-paper-100/40 px-6 py-10 text-center transition hover:border-accent-500/60 hover:bg-paper-100"
              htmlFor="book-cover-file"
            >
              <ImageIcon className="text-ink-500" size={22} />
              <span className="mt-2 text-sm font-medium text-ink-900">
                Выбрать изображение
              </span>
              <span className="mt-1 text-xs text-ink-500">
                JPG, PNG или GIF · до 20 МБ
              </span>
            </label>
          )}

          <input
            accept="image/jpeg,image/png,image/gif"
            className="sr-only"
            id="book-cover-file"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
            type="file"
          />

          {currentCover ? (
            <label
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-accent-700 underline"
              htmlFor="book-cover-file"
            >
              <Upload size={12} />
              Выбрать другое изображение
            </label>
          ) : null}

          {file ? (
            <p className="text-xs text-ink-500">
              {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} МБ
            </p>
          ) : null}
          {fileError ? <p className="text-xs text-red-700">{fileError}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            className="text-red-700"
            disabled={!book.coverUrl || pending}
            onClick={() => {
              if (window.confirm('Удалить обложку книги?')) {
                remove.mutate();
              }
            }}
            type="button"
            variant="ghost"
          >
            <Trash2 size={14} />
            Удалить обложку
          </Button>
          <div className="flex gap-2">
            <Button
              disabled={pending}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Отмена
            </Button>
            <Button
              disabled={!file || pending}
              onClick={() => upload.mutate()}
              type="button"
              variant="accent"
            >
              {upload.isPending ? 'Загружаем…' : 'Сохранить обложку'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
