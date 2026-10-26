import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { FileText, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

type BookNode = components['schemas']['BookNode'];

const statusLabels: Record<string, string> = {
  idea: 'идея',
  outline: 'план',
  draft: 'черновик',
  revised: 'правка',
  final: 'готово',
};

const statusTones: Record<string, 'neutral' | 'accent' | 'success' | 'warning'> = {
  idea: 'neutral',
  outline: 'accent',
  draft: 'warning',
  revised: 'accent',
  final: 'success',
};

const typeLabels: Record<string, string> = {
  part: 'часть',
  chapter: 'глава',
  scene: 'сцена',
};

function TreeNode({
  node,
  projectId,
  depth,
}: {
  node: BookNode;
  projectId: string;
  depth: number;
}) {
  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-md py-1.5 pr-2 transition hover:bg-paper-100"
        style={{ paddingLeft: 8 + depth * 22 }}
      >
        <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-ink-500">
          {typeLabels[node.type] ?? node.type}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{node.title}</span>
        <Badge tone={statusTones[node.status] ?? 'neutral'}>
          {statusLabels[node.status] ?? node.status}
        </Badge>
        <span className="w-20 text-right text-xs text-ink-500">
          {new Intl.NumberFormat('ru-RU').format(node.wordCount)} сл.
        </span>
        {node.documentId ? (
          <Link
            className="rounded-md px-2 py-1 text-xs font-medium text-accent-700 opacity-0 transition hover:bg-white group-hover:opacity-100"
            to="/projects/$projectId/write/$nodeId"
            params={{ projectId, nodeId: node.id }}
          >
            Писать
          </Link>
        ) : (
          <span className="w-14" />
        )}
      </div>
      {node.children?.map((child) => (
        <TreeNode key={child.id} node={child} projectId={projectId} depth={depth + 1} />
      ))}
    </div>
  );
}

export function StructurePage() {
  const { t } = useTranslation();
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const queryClient = useQueryClient();

  const booksQuery = useQuery({
    queryKey: ['books', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}/books', {
          params: { path: { projectId } },
        }),
      ),
    enabled: Boolean(projectId),
  });

  const book = booksQuery.data?.items[0];

  const treeQuery = useQuery({
    queryKey: ['book-tree', book?.id],
    queryFn: async () => {
      if (!book) {
        throw new Error('Book not found');
      }
      return unwrap(
        await api.GET('/books/{bookId}/tree', {
          params: { path: { bookId: book.id } },
        }),
      );
    },
    enabled: Boolean(book?.id),
  });

  const createBook = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST('/projects/{projectId}/books', {
          params: { path: { projectId } },
          body: { title: 'Книга первая' },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['books', projectId] });
    },
  });

  const createChapter = useMutation({
    mutationFn: async () => {
      if (!book) {
        throw new Error('Book not found');
      }
      return unwrap(
        await api.POST('/books/{bookId}/nodes', {
          params: { path: { bookId: book.id } },
          body: { type: 'chapter', title: 'Новая глава' },
        }),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['book-tree', book?.id] });
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink-500">Структура книги</p>
          <h1 className="mt-1 font-serif text-3xl">{book?.title ?? t('structure')}</h1>
          <p className="mt-2 text-sm text-ink-500">
            {treeQuery.data
              ? `${new Intl.NumberFormat('ru-RU').format(treeQuery.data.book.wordCount)} слов · ${countNodes(treeQuery.data.nodes)} элементов`
              : 'Части, главы и сцены. Порядок можно менять перетаскиванием.'}
          </p>
        </div>
        <div className="flex gap-2">
          {book ? (
            <Button
              variant="accent"
              onClick={() => createChapter.mutate()}
              disabled={createChapter.isPending}
            >
              <Plus size={16} />
              {createChapter.isPending ? t('loading') : t('newChapter')}
            </Button>
          ) : (
            <Button
              variant="accent"
              onClick={() => createBook.mutate()}
              disabled={createBook.isPending}
            >
              <Plus size={16} />
              Создать книгу
            </Button>
          )}
        </div>
      </div>

      {booksQuery.isLoading || treeQuery.isLoading ? (
        <p className="text-sm text-ink-500">{t('loading')}</p>
      ) : booksQuery.error ? (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          {booksQuery.error.message}
        </p>
      ) : !book ? (
        <div className="rounded-xl border border-dashed border-paper-300 p-12 text-center">
          <p className="font-serif text-2xl">В проекте пока нет книги</p>
          <p className="mt-2 text-sm text-ink-500">Создайте книгу, чтобы построить структуру.</p>
        </div>
      ) : treeQuery.error ? (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          {treeQuery.error.message}
        </p>
      ) : (
        <div className="rounded-xl border border-paper-200 bg-white/60 p-3">
          {treeQuery.data?.nodes.length ? (
            treeQuery.data.nodes.map((node) => (
              <TreeNode key={node.id} node={node} projectId={projectId} depth={0} />
            ))
          ) : (
            <div className="p-10 text-center">
              <FileText className="mx-auto mb-3 text-ink-500" size={24} />
              <p className="font-serif text-xl">Структура пуста</p>
              <p className="mt-1 text-sm text-ink-500">
                Добавьте первую главу — текст появится в редакторе.
              </p>
              <Button className="mt-5" variant="accent" onClick={() => createChapter.mutate()}>
                <Plus size={16} />
                {t('newChapter')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function countNodes(nodes: BookNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children ?? []), 0);
}
