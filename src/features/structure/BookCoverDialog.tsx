import { useMutation } from '@tanstack/react-query';
import { ImageIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import { ImageUrlField } from '@/shared/ui/image-url-field';

type Book = components['schemas']['Book'];

type BookCoverDialogProps = {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (book: Book) => void;
};

export function BookCoverDialog({
  book,
  open,
  onOpenChange,
  onUpdated,
}: BookCoverDialogProps) {
  const [url, setUrl] = useState('');
  const [urlValid, setUrlValid] = useState(false);

  const reset = () => {
    setUrl('');
    setUrlValid(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset();
    }
    onOpenChange(nextOpen);
  };

  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.PUT('/books/{bookId}/cover', {
          params: { path: { bookId: book.id } },
          body: { url: url.trim() },
        }),
      ),
    onSuccess: (updated) => {
      toast.success('Обложка обновлена');
      onUpdated(updated);
      handleOpenChange(false);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить обложку.'));
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

  const pending = save.isPending || remove.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Обложка книги</DialogTitle>
          <DialogDescription>
            Укажите прямую ссылку на изображение. Обложка показывается в
            карточке книги, а хранится на стороннем сайте. В DOCX и FB2
            внешняя обложка не встраивается — экспорт покажет предупреждение.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {book.coverUrl ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-ink-500">Текущая обложка</p>
              <img
                alt={`Обложка ${book.title}`}
                className="max-h-72 w-full rounded-md border border-paper-200 bg-paper-100 object-contain"
                referrerPolicy="no-referrer"
                src={book.coverUrl}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-lg border border-dashed border-paper-300 bg-paper-100/40 px-6 py-8 text-center">
              <ImageIcon className="text-ink-500" size={22} />
              <p className="mt-2 text-sm text-ink-500">Обложка пока не задана</p>
            </div>
          )}

          <ImageUrlField
            id="book-cover-url"
            label="Ссылка на обложку"
            value={url}
            onChange={setUrl}
            onValidityChange={setUrlValid}
            helpText="Поддерживаются JPG, PNG, GIF и другие форматы, которые открывает браузер. Ссылка проверяется до сохранения."
            disabled={pending}
          />
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
              disabled={!urlValid || pending}
              onClick={() => save.mutate()}
              type="button"
              variant="accent"
            >
              {save.isPending ? 'Сохраняем…' : 'Сохранить обложку'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
