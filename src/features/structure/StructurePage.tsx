import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import {
  BookPlus,
  ChevronDown,
  Layers,
  Plus,
  Share2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage, isVersionConflict } from '@/shared/api/errors';
import { isRealApiMode } from '@/shared/api/mode';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import {
  formatAuthorSheets,
  formatNumber,
  formatWords,
} from '@/shared/lib/format';
import {
  canContain,
  findTreeNode,
  moveTreeNode,
  type BookNode,
  type BookNodeType,
  type NodeMoveTarget,
} from '@/shared/lib/tree';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { ErrorState } from '@/shared/ui/error-state';
import { Progress } from '@/shared/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  bookStatusLabels,
  nodeTypeLabels,
} from './constants';
import { ShareDialog } from '@/features/sharing/ShareDialog';
import { BookCreateDialog } from './BookCreateDialog';
import { NodeCreateDialog } from './NodeCreateDialog';
import { NodeDeleteDialog } from './NodeDeleteDialog';
import { NodeInspector } from './NodeInspector';
import { StructureTree } from './StructureTree';

type TreePayload = components['schemas']['BookTree'];

const nodeTypeDescriptions: Record<BookNodeType, string> = {
  part: 'Крупный раздел книги',
  chapter: 'Основная единица текста',
  scene: 'Отдельный эпизод внутри главы',
};

export function StructurePage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const search = useSearch({ strict: false }) as { bookId?: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<{
    bookId: string;
    nodeId: string;
  } | null>(null);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BookNode | null>(null);
  const [createDialog, setCreateDialog] = useState<{
    open: boolean;
    type: BookNodeType;
    parentId: string | null;
  }>({ open: false, type: 'chapter', parentId: null });

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}', {
          params: { path: { projectId } },
        }),
      ),
  });

  const booksQuery = useQuery({
    queryKey: ['books', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}/books', {
          params: { path: { projectId } },
        }),
      ),
  });

  const charactersQuery = useQuery({
    queryKey: ['characters', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}/characters', {
          params: { path: { projectId } },
          query: { limit: 100 },
        }),
      ),
  });

  const books = useMemo(() => booksQuery.data?.items ?? [], [booksQuery.data]);
  const selectedBook = useMemo(
    () => books.find((book) => book.id === search.bookId) ?? books[0],
    [books, search.bookId],
  );
  const bookId = selectedBook?.id;

  const treeQuery = useQuery({
    queryKey: ['book-tree', bookId],
    queryFn: async () =>
      unwrap(
        await api.GET('/books/{bookId}/tree', {
          params: { path: { bookId: bookId! } },
        }),
      ),
    enabled: Boolean(bookId),
  });

  const tree = treeQuery.data;
  const nodes = useMemo(() => tree?.nodes ?? [], [tree]);
  const book = tree?.book ?? selectedBook;
  const selectedNodeId =
    selection && selection.bookId === bookId ? selection.nodeId : null;
  const selectedNode = selectedNodeId
    ? findTreeNode(nodes, selectedNodeId)
    : null;
  const canEdit = projectQuery.data?.role !== 'viewer';

  const selectNode = (nodeId: string | null) => {
    if (!nodeId || !bookId) {
      setSelection(null);
      return;
    }
    setSelection({ bookId, nodeId });
  };

  const changeBook = (nextBookId: string) => {
    setSelection(null);
    void navigate({
      to: '/projects/$projectId/structure',
      params: { projectId },
      search: { bookId: nextBookId },
      replace: true,
    });
  };

  const openCreate = (type: BookNodeType, parentId: string | null = null) => {
    if (!canEdit) {
      return;
    }
    setCreateDialog({ open: true, type, parentId });
  };

  const moveMutation = useMutation({
    mutationFn: async ({
      node,
      target,
    }: {
      node: BookNode;
      target: NodeMoveTarget;
    }) =>
      unwrap(
        await api.POST('/nodes/{nodeId}/move', {
          params: { path: { nodeId: node.id } },
          body: {
            parentId: target.parentId,
            beforeId: target.beforeId,
            afterId: target.afterId,
            version: node.version,
          },
        }),
      ),
    onMutate: async ({ node, target }) => {
      if (!bookId) {
        return { previous: undefined };
      }
      const key = ['book-tree', bookId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TreePayload>(key);
      if (previous) {
        queryClient.setQueryData<TreePayload>(key, {
          ...previous,
          nodes: moveTreeNode(
            previous.nodes,
            node.id,
            target.parentId,
            target.beforeId,
            target.afterId,
          ),
        });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (bookId && context?.previous) {
        queryClient.setQueryData(['book-tree', bookId], context.previous);
      }
      toast.error(
        isVersionConflict(error)
          ? 'Структуру уже изменили в другом окне. Мы вернули прежний порядок и обновим данные.'
          : getApiErrorMessage(error, 'Не удалось переместить элемент. Порядок восстановлен.'),
      );
    },
    onSettled: () => {
      if (bookId) {
        void queryClient.invalidateQueries({ queryKey: ['book-tree', bookId] });
      }
      void queryClient.invalidateQueries({ queryKey: ['books', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  const handleMove = (node: BookNode, target: NodeMoveTarget) => {
    if (!canEdit) {
      return;
    }
    moveMutation.mutate({ node, target });
  };

  const handleCreateChild = (parent: BookNode) => {
    if (parent.type === 'part') {
      openCreate('chapter', parent.id);
    } else if (parent.type === 'chapter') {
      openCreate('scene', parent.id);
    }
  };

  const openEditor = (node: BookNode) => {
    if (!node.documentId) {
      return;
    }
    void navigate({
      to: '/projects/$projectId/write/$nodeId',
      params: { projectId, nodeId: node.id },
    });
  };

  const invalidateBooks = () => {
    void queryClient.invalidateQueries({ queryKey: ['books', projectId] });
    void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
  };

  const targetWords = book?.targetWordCount ?? 0;
  const progressPercent =
    book && targetWords > 0
      ? Math.min(100, Math.round((book.wordCount / targetWords) * 100))
      : 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 pb-20 pt-8 sm:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-700">
            <Layers size={14} />
            Каркас книги
          </div>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
            Структура
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
            Соберите части, главы и сцены. Перетаскивайте элементы, чтобы менять
            порядок и вложенность.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {books.length > 0 ? (
            <Select value={bookId} onValueChange={changeBook}>
              <SelectTrigger className="w-full sm:w-64" aria-label="Выбрать книгу">
                <SelectValue placeholder="Выберите книгу" />
              </SelectTrigger>
              <SelectContent>
                {books.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {canEdit ? (
            <>
              {isRealApiMode && selectedBook ? (
                <Button variant="outline" onClick={() => setShareOpen(true)}>
                  <Share2 size={16} />
                  Поделиться
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => setBookDialogOpen(true)}>
                <BookPlus size={16} />
                Новая книга
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="accent" disabled={!bookId}>
                    <Plus size={16} />
                    Добавить
                    <ChevronDown size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>Элемент структуры</DropdownMenuLabel>
                  {(Object.keys(nodeTypeLabels) as BookNodeType[]).map((type) => (
                    <DropdownMenuItem
                      key={type}
                      onSelect={() =>
                        openCreate(
                          type,
                          selectedNode && canContain(selectedNode.type, type)
                            ? selectedNode.id
                            : null,
                        )
                      }
                    >
                      <Layers className="text-ink-500" size={15} />
                      <span>
                        <span className="block">{nodeTypeLabels[type]}</span>
                        <span className="block text-[11px] text-ink-500">
                          {nodeTypeDescriptions[type]}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Badge tone="neutral" className="h-8 px-3">
              Только чтение
            </Badge>
          )}
        </div>
      </div>

      {booksQuery.isLoading ? (
        <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg border border-paper-200 bg-white/50 p-5">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="mt-3 h-4 w-40" />
            <div className="mt-6 space-y-2">
              {Array.from({ length: 7 }, (_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          </div>
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      ) : booksQuery.isError ? (
        <div className="mt-8">
          <ErrorState
            title="Книги не загрузились"
            description={getApiErrorMessage(
              booksQuery.error,
              'Не удалось получить список книг проекта.',
            )}
            onRetry={() => void booksQuery.refetch()}
          />
        </div>
      ) : !selectedBook ? (
        <div className="mt-8 rounded-xl border border-dashed border-paper-300 bg-white/35 px-6 py-16 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-paper-100 text-ink-500">
            <BookPlus size={22} />
          </span>
          <h2 className="mt-5 font-serif text-2xl text-ink-900">Начнём с книги</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
            Проект может содержать несколько книг. Создайте первую — и добавьте в неё
            части, главы и сцены.
          </p>
          {canEdit ? (
            <Button className="mt-6" variant="accent" onClick={() => setBookDialogOpen(true)}>
              <BookPlus size={16} />
              Создать книгу
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <section className="mt-8 rounded-lg border border-paper-200 bg-white/55 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{bookStatusLabels[selectedBook.status]}</Badge>
                  {selectedBook.subtitle ? (
                    <span className="truncate text-xs text-ink-500">
                      {selectedBook.subtitle}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-2 font-serif text-2xl leading-tight text-ink-900">
                  {selectedBook.title}
                </h2>
                {selectedBook.synopsis ? (
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
                    {selectedBook.synopsis}
                  </p>
                ) : null}
              </div>
              <div className="min-w-52 rounded-md border border-paper-200 bg-paper-50 px-4 py-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-500">Объём</span>
                  <span className="font-medium text-ink-900">
                    {formatWords(selectedBook.wordCount)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-ink-500">
                  <span>Авторские листы</span>
                  <span>{formatAuthorSheets(selectedBook.authorSheets)}</span>
                </div>
                <Progress
                  className="mt-2"
                  value={progressPercent}
                  label={`Книга заполнена на ${progressPercent}%`}
                />
                <p className="mt-1.5 text-right text-[11px] text-ink-500">
                  {targetWords > 0
                    ? `${progressPercent}% из ${formatNumber(targetWords)} слов`
                    : 'Цель не задана'}
                </p>
              </div>
            </div>
          </section>

          <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0 rounded-lg border border-paper-200 bg-white/40 p-3 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-ink-500">
                  Дерево книги
                </h2>
                <div className="flex items-center gap-3 text-[11px] text-ink-500">
                  <span>{formatNumber(nodes.length)} элементов верхнего уровня</span>
                  {moveMutation.isPending ? (
                    <span aria-live="polite">Сохраняем порядок…</span>
                  ) : null}
                </div>
              </div>

              {treeQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 7 }, (_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : treeQuery.isError ? (
                <ErrorState
                  title="Структура не загрузилась"
                  description={getApiErrorMessage(
                    treeQuery.error,
                    'Не удалось получить дерево книги.',
                  )}
                  onRetry={() => void treeQuery.refetch()}
                />
              ) : (
                <StructureTree
                  nodes={nodes}
                  selectedId={selectedNodeId}
                  canEdit={canEdit}
                  onSelect={selectNode}
                  onCreateChild={handleCreateChild}
                  onDelete={setDeleteTarget}
                  onOpenEditor={openEditor}
                  onMove={handleMove}
                />
              )}
            </section>

            <NodeInspector
              book={book ?? selectedBook}
              node={selectedNode}
              nodes={nodes}
              characters={charactersQuery.data?.items ?? []}
              canEdit={canEdit}
              onSelectNode={selectNode}
              onOpenEditor={openEditor}
              onDeletedNode={() => setSelection(null)}
            />
          </div>
        </>
      )}

      {selectedBook ? (
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          projectId={projectId}
          target={{
            targetType: 'project',
            targetId: projectId,
            title: selectedBook.title,
          }}
        />
      ) : null}

      <BookCreateDialog
        projectId={projectId}
        open={bookDialogOpen}
        onOpenChange={setBookDialogOpen}
        onCreated={(createdBook) => {
          invalidateBooks();
          setSelection(null);
          void navigate({
            to: '/projects/$projectId/structure',
            params: { projectId },
            search: { bookId: createdBook.id },
            replace: true,
          });
        }}
      />

      {bookId ? (
        <NodeCreateDialog
          bookId={bookId}
          type={createDialog.type}
          nodes={nodes}
          characters={charactersQuery.data?.items ?? []}
          preferredParentId={createDialog.parentId}
          open={createDialog.open}
          onOpenChange={(open) => setCreateDialog((current) => ({ ...current, open }))}
          onCreated={(node) => {
            selectNode(node.id);
          }}
        />
      ) : null}

      <NodeDeleteDialog
        node={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        onDeleted={(deletedId) => {
          if (selectedNodeId === deletedId) {
            setSelection(null);
          }
          setDeleteTarget(null);
        }}
      />
    </main>
  );
}
