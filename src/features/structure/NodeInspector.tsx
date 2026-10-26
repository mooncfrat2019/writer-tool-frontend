import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  FileText,
  PenLine,
  Share2,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
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
  countTreeNodes,
  flattenTree,
  type BookNode,
} from '@/shared/lib/tree';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Progress } from '@/shared/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import {
  nodeStatusLabels,
  nodeStatusTones,
  nodeTypeLabels,
} from './constants';
import { ShareDialog } from '@/features/sharing/ShareDialog';
import { NodeDeleteDialog } from './NodeDeleteDialog';
import {
  nodeFormSchema,
  nodeToFormValues,
  parseOptionalNumber,
  type NodeFormValues,
} from './schemas';

type Book = components['schemas']['Book'];
type Character = components['schemas']['Character'];

const NONE_VALUE = 'none';

type NodeInspectorProps = {
  book: Book;
  node: BookNode | null;
  nodes: BookNode[];
  characters: Character[];
  canEdit: boolean;
  onSelectNode: (nodeId: string) => void;
  onOpenEditor: (node: BookNode) => void;
  onDeletedNode: () => void;
};

function PlanningPanel({
  book,
  nodes,
  onSelectNode,
  onOpenEditor,
}: {
  book: Book;
  nodes: BookNode[];
  onSelectNode: (nodeId: string) => void;
  onOpenEditor: (node: BookNode) => void;
}) {
  const flat = flattenTree(nodes);
  const chapters = flat.filter((entry) => entry.node.type === 'chapter');
  const parts = flat.filter((entry) => entry.node.type === 'part');
  const scenes = flat.filter((entry) => entry.node.type === 'scene');
  const target = book.targetWordCount ?? 0;
  const percent = target > 0 ? Math.round((book.wordCount / target) * 100) : 0;

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-paper-100 text-ink-500">
          <BookOpen size={17} />
        </span>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-500">
            План книги
          </p>
          <h2 className="mt-1 font-serif text-xl leading-snug text-ink-900">
            {book.title}
          </h2>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border border-paper-200 bg-white/50 px-2 py-2.5">
          <p className="font-serif text-xl text-ink-900">{parts.length}</p>
          <p className="mt-0.5 text-[11px] text-ink-500">части</p>
        </div>
        <div className="rounded-md border border-paper-200 bg-white/50 px-2 py-2.5">
          <p className="font-serif text-xl text-ink-900">{chapters.length}</p>
          <p className="mt-0.5 text-[11px] text-ink-500">главы</p>
        </div>
        <div className="rounded-md border border-paper-200 bg-white/50 px-2 py-2.5">
          <p className="font-serif text-xl text-ink-900">{scenes.length}</p>
          <p className="mt-0.5 text-[11px] text-ink-500">сцены</p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-paper-200 bg-white/50 p-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-ink-500">Объём книги</span>
          <span className="font-medium text-ink-900">
            {formatWords(book.wordCount)}
            {target > 0 ? ` из ${formatNumber(target)}` : ''}
          </span>
        </div>
        <Progress
          className="mt-2"
          value={percent}
          label={`Выполнение целевого объёма: ${percent}%`}
        />
        <p className="mt-1.5 flex items-center justify-between text-[11px] text-ink-500">
          <span>{formatAuthorSheets(book.authorSheets)}</span>
          <span>{target > 0 ? `${percent}% цели` : 'Цель по объёму не задана'}</span>
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-ink-500">
          Главы
        </h3>
        <span className="text-[11px] text-ink-500">{formatNumber(countTreeNodes(nodes))} всего</span>
      </div>

      {chapters.length ? (
        <ul className="mt-2 divide-y divide-paper-200 rounded-md border border-paper-200 bg-white/40">
          {chapters.map(({ node, depth }) => {
            const targetWords = node.targetWordCount ?? 0;
            return (
              <li key={node.id}>
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 rounded px-1 py-1 text-left transition hover:bg-paper-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    style={{ paddingLeft: `${Math.max(0, depth - 1) * 10 + 4}px` }}
                    onClick={() => onSelectNode(node.id)}
                  >
                    <span className="block truncate text-xs font-medium text-ink-900">
                      {node.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-ink-500">
                      {nodeStatusLabels[node.status]} ·{' '}
                      {targetWords > 0
                        ? `${formatNumber(node.wordCount)} / ${formatNumber(targetWords)} слов`
                        : formatWords(node.wordCount)}
                      {' · '}
                      {formatAuthorSheets(node.authorSheets)}
                    </span>
                  </button>
                  {node.documentId ? (
                    <button
                      type="button"
                      className="rounded p-1.5 text-ink-500 transition hover:bg-paper-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                      aria-label={`Открыть «${node.title}» в редакторе`}
                      onClick={() => onOpenEditor(node)}
                    >
                      <PenLine size={14} />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-2 rounded-md border border-dashed border-paper-300 px-4 py-6 text-center">
          <FileText className="mx-auto text-ink-500" size={20} />
          <p className="mt-2 text-xs leading-relaxed text-ink-500">
            В книге пока нет глав. Добавьте первую — и план начнёт собираться.
          </p>
        </div>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-ink-500">
        Выберите элемент в дереве, чтобы изменить синопсис, статус, POV и целевой
        объём.
      </p>
    </div>
  );
}

export function NodeInspector({
  book,
  node,
  nodes,
  characters,
  canEdit,
  onSelectNode,
  onOpenEditor,
  onDeletedNode,
}: NodeInspectorProps) {
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const lastSyncedNodeRef = useRef<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<NodeFormValues>({
    resolver: zodResolver(nodeFormSchema),
    defaultValues: node
      ? nodeToFormValues(node)
      : {
          title: '',
          parentId: '',
          synopsis: '',
          notes: '',
          status: 'idea',
          targetWordCount: '',
          povCharacterId: NONE_VALUE,
        },
  });

  useEffect(() => {
    if (!node) {
      return;
    }
    const signature = `${node.id}:${node.version}`;
    if (lastSyncedNodeRef.current === signature) {
      return;
    }
    lastSyncedNodeRef.current = signature;
    reset(nodeToFormValues(node));
  }, [node, reset]);

  const status = watch('status');
  const povCharacterId = watch('povCharacterId');

  const updateNode = useMutation({
    mutationFn: async (values: NodeFormValues) => {
      if (!node) {
        throw new Error('Node is required');
      }
      return unwrap(
        await api.PATCH('/nodes/{nodeId}', {
          params: { path: { nodeId: node.id } },
          body: {
            title: values.title,
            synopsis: values.synopsis,
            notes: values.notes,
            status: values.status,
            targetWordCount: parseOptionalNumber(values.targetWordCount) ?? 0,
            povCharacterId:
              values.povCharacterId === NONE_VALUE ? null : values.povCharacterId,
            version: node.version,
          },
        }),
      );
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['book-tree', updated.bookId] });
      void queryClient.invalidateQueries({ queryKey: ['books'] });
      void queryClient.invalidateQueries({ queryKey: ['project'] });
      reset(nodeToFormValues(updated));
      toast.success('Карточка обновлена.');
    },
    onError: (error) => {
      if (isVersionConflict(error)) {
        void queryClient.invalidateQueries({ queryKey: ['book-tree', book.id] });
        toast.error('Кто-то уже изменил этот элемент. Данные обновлены — проверьте правки.');
        return;
      }
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить изменения.'));
    },
  });

  if (!node) {
    return (
      <aside className="rounded-lg border border-paper-200 bg-paper-50 p-5 xl:sticky xl:top-6">
        <PlanningPanel
          book={book}
          nodes={nodes}
          onSelectNode={onSelectNode}
          onOpenEditor={onOpenEditor}
        />
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border border-paper-200 bg-paper-50 p-5 xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{nodeTypeLabels[node.type]}</Badge>
            <Badge tone={nodeStatusTones[node.status]}>{nodeStatusLabels[node.status]}</Badge>
          </div>
          <h2 className="mt-2 font-serif text-xl leading-snug text-ink-900">
            {node.title}
          </h2>
          <p className="mt-1 text-xs text-ink-500">
            {node.documentId
              ? `${formatWords(node.wordCount)} · ${formatAuthorSheets(node.authorSheets)}`
              : 'Без собственного текста'}
          </p>
        </div>
      </div>

      {node.documentId ? (
        <>
          <Button
            className="mt-4 w-full"
            variant="accent"
            onClick={() => onOpenEditor(node)}
          >
            <PenLine size={15} />
            Открыть в редакторе
          </Button>
          {canEdit && isRealApiMode ? (
            <Button
              className="mt-2 w-full"
              variant="outline"
              onClick={() => setShareOpen(true)}
            >
              <Share2 size={15} />
              Поделиться главой
            </Button>
          ) : null}
        </>
      ) : (
        <p className="mt-4 rounded-md border border-paper-200 bg-paper-100/60 px-3 py-2 text-xs leading-relaxed text-ink-500">
          У частей нет отдельного документа. Пишите тексты в главах и сценах.
        </p>
      )}

      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={handleSubmit((values) => updateNode.mutate(values))}
      >
        <fieldset className="space-y-4" disabled={!canEdit || updateNode.isPending}>
          <div className="space-y-2">
            <Label htmlFor="inspector-title">Название</Label>
            <Input
              id="inspector-title"
              aria-invalid={Boolean(errors.title)}
              {...register('title')}
            />
            {errors.title ? (
              <p className="text-xs text-red-700">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="inspector-status">Статус</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                setValue('status', value as NodeFormValues['status'], {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="inspector-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(nodeStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inspector-synopsis">Синопсис</Label>
            <Textarea
              id="inspector-synopsis"
              rows={3}
              placeholder="Что происходит в этой сцене или главе."
              {...register('synopsis')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="inspector-target">Цель, слов</Label>
              <Input
                id="inspector-target"
                inputMode="numeric"
                aria-invalid={Boolean(errors.targetWordCount)}
                {...register('targetWordCount')}
              />
              {errors.targetWordCount ? (
                <p className="text-xs text-red-700">{errors.targetWordCount.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspector-pov">POV</Label>
              <Select
                value={povCharacterId}
                onValueChange={(value) =>
                  setValue('povCharacterId', value, { shouldDirty: true })
                }
              >
                <SelectTrigger id="inspector-pov">
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
            <Label htmlFor="inspector-notes">Заметки</Label>
            <Textarea
              id="inspector-notes"
              rows={5}
              placeholder="Служебные заметки, детали, напоминания."
              {...register('notes')}
            />
          </div>

          {canEdit ? (
            <Button
              className="w-full"
              type="submit"
              variant="default"
              disabled={!isDirty || updateNode.isPending}
            >
              {updateNode.isPending ? 'Сохраняем…' : 'Сохранить карточку'}
            </Button>
          ) : (
            <p className="rounded-md bg-paper-100 px-3 py-2 text-xs text-ink-500">
              У вас есть доступ только для чтения.
            </p>
          )}
        </fieldset>
      </form>

      {canEdit ? (
        <Button
          className="mt-3 w-full text-red-800 hover:bg-red-50 hover:text-red-900"
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 size={14} />
          Удалить элемент
        </Button>
      ) : null}

      {node.documentId ? (
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          projectId={book.projectId}
          target={{
            targetType: 'document',
            targetId: node.documentId,
            title: node.title,
          }}
        />
      ) : null}

      <NodeDeleteDialog
        node={node}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          onDeletedNode();
        }}
      />
    </aside>
  );
}
