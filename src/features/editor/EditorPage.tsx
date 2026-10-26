import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret';
import { EditorContent, useEditor, useEditorState, type Editor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  ArrowLeft,
  Bold,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  CloudOff,
  History,
  Italic,
  List,
  ListOrdered,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Minus,
  Quote,
  Redo2,
  Save,
  Undo2,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage, isVersionConflict } from '@/shared/api/errors';
import { isRealApiMode } from '@/shared/api/mode';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import {
  authorSheetsFromCharacters,
  formatAuthorSheets,
  formatWords,
} from '@/shared/lib/format';
import {
  findNodePath,
  findTreeNode,
  type BookNode,
} from '@/shared/lib/tree';
import {
  countProseMirrorCharacters,
  countProseMirrorWords,
} from '@/shared/lib/wordCount';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/error-state';
import { CollabStatus, PresenceAvatars } from './CollabPresence';
import { VersionHistoryDialog } from './VersionHistoryDialog';
import {
  collabEnabled,
  useCollabSession,
  type CollabSession,
} from './useCollabSession';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  nodeStatusLabels,
  nodeStatusTones,
  nodeTypeLabels,
} from '@/features/structure/constants';

type Book = components['schemas']['Book'];
type Document = components['schemas']['Document'];

type EditorNodeInfo = {
  node: BookNode;
  book: Book;
  path: BookNode[];
};

type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';

const EMPTY_DOCUMENT: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

function toJSONContent(value: unknown): JSONContent {
  if (
    value &&
    typeof value === 'object' &&
    'type' in value &&
    typeof (value as { type?: unknown }).type === 'string'
  ) {
    return value as JSONContent;
  }
  return EMPTY_DOCUMENT;
}

async function loadEditorNode(projectId: string, nodeId: string): Promise<EditorNodeInfo> {
  const books = unwrap(
    await api.GET('/projects/{projectId}/books', {
      params: { path: { projectId } },
    }),
  );

  const trees = await Promise.all(
    books.items.map(async (book) =>
      unwrap(
        await api.GET('/books/{bookId}/tree', {
          params: { path: { bookId: book.id } },
        }),
      ),
    ),
  );

  for (const tree of trees) {
    const node = findTreeNode(tree.nodes, nodeId);
    if (node) {
      return {
        node,
        book: tree.book,
        path: findNodePath(tree.nodes, node.id),
      };
    }
  }

  throw new Error('Node not found in project');
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const content = {
    saved: { label: 'Сохранено', icon: Check, className: 'text-emerald-800' },
    dirty: { label: 'Есть изменения', icon: Clock3, className: 'text-ink-500' },
    saving: { label: 'Сохраняем…', icon: LoaderCircle, className: 'text-ink-500' },
    error: { label: 'Не сохранено', icon: CloudOff, className: 'text-red-800' },
    conflict: { label: 'Конфликт версий', icon: CircleAlert, className: 'text-amber-800' },
  }[status];
  const Icon = content.icon;
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs', content.className)}
      aria-live="polite"
    >
      <Icon className={status === 'saving' ? 'animate-spin' : undefined} size={14} />
      {content.label}
    </span>
  );
}

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function ToolbarButton({ label, active, disabled, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded px-1.5 text-sm text-ink-700 transition hover:bg-paper-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-ink-900 text-paper-50 hover:bg-ink-700 hover:text-paper-50',
      )}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      h1: current.isActive('heading', { level: 1 }),
      h2: current.isActive('heading', { level: 2 }),
      bulletList: current.isActive('bulletList'),
      orderedList: current.isActive('orderedList'),
      blockquote: current.isActive('blockquote'),
      canBold: current.can().chain().toggleBold().run(),
      canItalic: current.can().chain().toggleItalic().run(),
      canH1: current.can().chain().toggleHeading({ level: 1 }).run(),
      canH2: current.can().chain().toggleHeading({ level: 2 }).run(),
      canBulletList: current.can().chain().toggleBulletList().run(),
      canOrderedList: current.can().chain().toggleOrderedList().run(),
      canBlockquote: current.can().chain().toggleBlockquote().run(),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });

  return (
    <div
      className="flex flex-wrap items-center gap-1 rounded-lg border border-paper-200 bg-paper-50/95 px-2 py-1.5 shadow-sm"
      role="toolbar"
      aria-label="Форматирование текста"
    >
      <ToolbarButton
        label="Жирный"
        active={state.bold}
        disabled={!state.canBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Курсив"
        active={state.italic}
        disabled={!state.canItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-paper-200" aria-hidden="true" />
      <ToolbarButton
        label="Заголовок 1"
        active={state.h1}
        disabled={!state.canH1}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <span className="text-xs font-semibold">H1</span>
      </ToolbarButton>
      <ToolbarButton
        label="Заголовок 2"
        active={state.h2}
        disabled={!state.canH2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <span className="text-xs font-semibold">H2</span>
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-paper-200" aria-hidden="true" />
      <ToolbarButton
        label="Маркированный список"
        active={state.bulletList}
        disabled={!state.canBulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Нумерованный список"
        active={state.orderedList}
        disabled={!state.canOrderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Цитата"
        active={state.blockquote}
        disabled={!state.canBlockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Разрыв сцены"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus size={16} />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-paper-200" aria-hidden="true" />
      <ToolbarButton
        label="Отменить"
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Повторить"
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 size={16} />
      </ToolbarButton>
    </div>
  );
}

type EditorWorkspaceProps = {
  projectId: string;
  node: BookNode;
  book: Book;
  path: BookNode[];
  documentId: string;
  canEdit: boolean;
  onBack: () => void;
};

function EditorWorkspace({
  projectId,
  node,
  book,
  path,
  documentId,
  canEdit,
  onBack,
}: EditorWorkspaceProps) {
  const documentQuery = useQuery({
    queryKey: ['document', documentId],
    queryFn: async () =>
      unwrap(
        await api.GET('/documents/{documentId}', {
          params: { path: { documentId } },
        }),
      ),
  });
  const collab = useCollabSession(documentId, collabEnabled());

  if (documentQuery.isLoading || collab.loading) {
    return (
      <div className="min-h-screen bg-paper-50">
        <header className="border-b border-paper-200 px-5 py-3">
          <Skeleton className="h-8 w-64" />
        </header>
        <div className="mx-auto max-w-4xl px-6 py-12">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="mt-8 h-5 w-full" />
          <Skeleton className="mt-3 h-5 w-11/12" />
          <Skeleton className="mt-3 h-5 w-4/5" />
        </div>
      </div>
    );
  }

  if (collab.error) {
    return (
      <main className="min-h-screen bg-paper-50 px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft size={15} />
            К структуре
          </Button>
          <div className="mt-5">
            <ErrorState
              title="Совместное редактирование недоступно"
              description={collab.error}
              onRetry={() => window.location.reload()}
            />
          </div>
        </div>
      </main>
    );
  }

  if (documentQuery.isError || !documentQuery.data) {
    return (
      <main className="min-h-screen bg-paper-50 px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft size={15} />
            К структуре
          </Button>
          <div className="mt-5">
            <ErrorState
              title="Текст не загрузился"
              description={getApiErrorMessage(
                documentQuery.error,
                'Не удалось открыть документ. Вернитесь в структуру и попробуйте снова.',
              )}
              onRetry={() => void documentQuery.refetch()}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <EditorSession
      key={documentQuery.data.id}
      projectId={projectId}
      node={node}
      book={book}
      path={path}
      document={documentQuery.data}
      canEdit={canEdit}
      collab={collab.session ?? undefined}
      collabFallbackReason={collab.fallbackReason}
      onBack={onBack}
    />
  );
}

type EditorSessionProps = {
  projectId: string;
  node: BookNode;
  book: Book;
  path: BookNode[];
  document: Document;
  canEdit: boolean;
  collab?: CollabSession;
  collabFallbackReason?: string | null;
  backLabel?: string;
  onBack: () => void;
};

export function EditorSession({
  projectId,
  node,
  book,
  path,
  document,
  canEdit,
  collab,
  collabFallbackReason,
  backLabel,
  onBack,
}: EditorSessionProps) {
  const queryClient = useQueryClient();
  const [focusMode, setFocusMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [wordCount, setWordCount] = useState(
    document.wordCount || countProseMirrorWords(document.canonical),
  );
  const [characterCount, setCharacterCount] = useState(
    document.characterCount || countProseMirrorCharacters(document.canonical),
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [conflictDocument, setConflictDocument] = useState<Document | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [conflictLoading, setConflictLoading] = useState(false);

  const saveStatusRef = useRef<SaveStatus>('saved');
  const versionRef = useRef(document.version);
  const latestContentRef = useRef<JSONContent>(toJSONContent(document.canonical));
  const timerRef = useRef<number | null>(null);
  const saveNowRef = useRef<() => void>(() => undefined);
  const isSavingRef = useRef(false);
  const savePendingRef = useRef(false);
  const isHydratingRef = useRef(false);

  const setStatus = useCallback((next: SaveStatus) => {
    saveStatusRef.current = next;
    setSaveStatus(next);
  }, []);

  const scheduleSave = useCallback((delay = 900) => {
    if (!canEdit || saveStatusRef.current === 'conflict') {
      return;
    }
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      saveNowRef.current();
    }, delay);
  }, [canEdit]);

  const collabDoc = collab?.ydoc;
  const collabProvider = collab?.provider;
  const collabUser = collab?.user;
  const extensions = useMemo(
    () =>
      collabDoc && collabProvider && collabUser
        ? [
            StarterKit.configure({ undoRedo: false }),
            Collaboration.configure({ document: collabDoc }),
            CollaborationCaret.configure({
              provider: collabProvider,
              user: collabUser,
            }),
          ]
        : [StarterKit],
    [collabDoc, collabProvider, collabUser],
  );

  const editor = useEditor({
    extensions,
    content: collab ? undefined : toJSONContent(document.canonical),
    editable: canEdit,
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
        'aria-label': `Текст: ${node.title}`,
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (isHydratingRef.current) {
        return;
      }
      if (collab && !collab.syncedRef.current) {
        return;
      }
      const json = currentEditor.getJSON();
      latestContentRef.current = json;
      setWordCount(countProseMirrorWords(json));
      setCharacterCount(countProseMirrorCharacters(json));
      if (saveStatusRef.current !== 'saving' && saveStatusRef.current !== 'conflict') {
        setStatus('dirty');
      }
      scheduleSave(900);
    },
  });

  useEffect(() => {
    if (!collab?.synced || !editor || !canEdit) {
      return;
    }
    const json = editor.getJSON();
    latestContentRef.current = json;
    const timer = window.setTimeout(() => {
      setWordCount(countProseMirrorWords(json));
      setCharacterCount(countProseMirrorCharacters(json));
    }, 0);
    scheduleSave(200);
    return () => window.clearTimeout(timer);
  }, [collab?.synced, editor, canEdit, scheduleSave]);

  const refreshConflict = useCallback(async () => {
    setConflictLoading(true);
    setConflictError(null);
    try {
      const latest = unwrap(
        await api.GET('/documents/{documentId}', {
          params: { path: { documentId: document.id } },
        }),
      );
      setConflictDocument(latest);
    } catch (error) {
      setConflictError(
        getApiErrorMessage(error, 'Не удалось получить последнюю версию документа.'),
      );
    } finally {
      setConflictLoading(false);
    }
  }, [document.id]);

  const saveNow = useCallback(async () => {
    if (!canEdit) {
      return;
    }
    if (isSavingRef.current) {
      savePendingRef.current = true;
      return;
    }
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const snapshot = latestContentRef.current;
    isSavingRef.current = true;
    setStatus('saving');

    try {
      if (collab) {
        const saved = unwrap(
          await api.PUT('/documents/{documentId}/canonical', {
            params: { path: { documentId: document.id } },
            body: {
              canonical: snapshot as unknown as Record<string, unknown>,
            },
          }),
        );
        queryClient.setQueryData(['document', document.id], saved);

        void queryClient.invalidateQueries({ queryKey: ['book-tree'] });
        void queryClient.invalidateQueries({ queryKey: ['books', projectId] });
        void queryClient.invalidateQueries({ queryKey: ['project', projectId] });

        if (latestContentRef.current !== snapshot) {
          setStatus('dirty');
          scheduleSave(500);
        } else {
          setStatus('saved');
        }
        return;
      }

      const saved = unwrap(
        await api.PUT('/documents/{documentId}/content', {
          params: { path: { documentId: document.id } },
          body: {
            canonical: snapshot as unknown as Record<string, unknown>,
            version: versionRef.current,
          },
        }),
      );
      versionRef.current = saved.version;
      queryClient.setQueryData(['document', document.id], saved);
      setConflictDocument(null);
      setConflictError(null);

      void queryClient.invalidateQueries({ queryKey: ['book-tree'] });
      void queryClient.invalidateQueries({ queryKey: ['books', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });

      if (latestContentRef.current !== snapshot) {
        setStatus('dirty');
        scheduleSave(500);
      } else {
        setStatus('saved');
      }
    } catch (error) {
      if (isVersionConflict(error)) {
        setStatus('conflict');
        toast.error('Документ уже изменили в другом окне. Проверьте версии.');
        void refreshConflict();
      } else {
        setStatus('error');
        toast.error(getApiErrorMessage(error, 'Не удалось сохранить текст.'));
      }
    } finally {
      isSavingRef.current = false;
      if (savePendingRef.current) {
        savePendingRef.current = false;
        if (saveStatusRef.current !== 'conflict') {
          window.setTimeout(() => saveNowRef.current(), 0);
        }
      }
    }
  }, [
    canEdit,
    collab,
    document.id,
    projectId,
    queryClient,
    refreshConflict,
    scheduleSave,
    setStatus,
  ]);

  useEffect(() => {
    saveNowRef.current = () => {
      void saveNow();
    };
  }, [saveNow]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase('en') === 's') {
        event.preventDefault();
        void saveNow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveNow]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        saveStatusRef.current === 'dirty' ||
        saveStatusRef.current === 'saving' ||
        saveStatusRef.current === 'error'
      ) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const loadServerVersion = () => {
    if (!conflictDocument) {
      return;
    }
    const content = toJSONContent(conflictDocument.canonical);
    isHydratingRef.current = true;
    editor.commands.setContent(content, { emitUpdate: false });
    isHydratingRef.current = false;
    latestContentRef.current = content;
    versionRef.current = conflictDocument.version;
    setWordCount(countProseMirrorWords(content));
    setCharacterCount(countProseMirrorCharacters(content));
    setConflictDocument(null);
    setConflictError(null);
    setStatus('saved');
    queryClient.setQueryData(['document', document.id], conflictDocument);
    toast.success('Загружена последняя версия документа.');
  };

  const saveMyVersion = () => {
    if (!conflictDocument) {
      return;
    }
    versionRef.current = conflictDocument.version;
    setConflictDocument(null);
    setConflictError(null);
    setStatus('dirty');
    window.setTimeout(() => saveNowRef.current(), 0);
  };

  const breadcrumb = path
    .slice(0, -1)
    .map((item) => item.title)
    .join(' / ');
  const authorSheets = authorSheetsFromCharacters(characterCount);

  return (
    <div className="min-h-screen bg-paper-50">
      <header className="sticky top-0 z-30 border-b border-paper-200 bg-paper-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded px-1.5 text-sm text-ink-500 transition hover:bg-paper-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            onClick={onBack}
            aria-label={backLabel ?? 'Вернуться к структуре'}
          >
            <ArrowLeft size={17} />
            <span className="hidden sm:inline">{backLabel ?? 'К структуре'}</span>
          </button>

          <div className="min-w-0 flex-1">
            {!focusMode && (breadcrumb || book.title) ? (
              <p className="hidden truncate text-[11px] text-ink-500 sm:block">
                {book.title}
                {breadcrumb ? (
                  <>
                    <ChevronRight className="mx-1 inline" size={11} />
                    {breadcrumb}
                  </>
                ) : null}
              </p>
            ) : null}
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate font-serif text-lg leading-tight text-ink-900 sm:text-xl">
                {node.title}
              </h1>
              {!focusMode ? (
                <Badge
                  className="hidden md:inline-flex"
                  tone={nodeStatusTones[node.status]}
                >
                  {nodeStatusLabels[node.status]}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden text-xs text-ink-500 sm:inline">
              {formatWords(wordCount)} · {formatAuthorSheets(authorSheets)}
            </span>
            {collab ? <CollabStatus session={collab} /> : null}
            {collab ? <PresenceAvatars users={collab.users} /> : null}
            {!collab && collabFallbackReason ? (
              <span
                className="hidden text-[11px] text-ink-500 md:inline"
                title="Документ создан до включения совместного режима. Создайте новую главу, чтобы проверить совместное редактирование."
              >
                Без совместного режима
              </span>
            ) : null}
            {canEdit ? (
              <SaveIndicator status={saveStatus} />
            ) : (
              <Badge tone="neutral">Только чтение</Badge>
            )}
            {isRealApiMode ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="История версий"
                title="История версий"
                onClick={() => setHistoryOpen(true)}
              >
                <History size={16} />
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Сохранить сейчас"
                title="Сохранить сейчас (Ctrl+S)"
                onClick={() => void saveNow()}
                disabled={saveStatus === 'saving' || saveStatus === 'conflict'}
              >
                <Save size={16} />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={focusMode ? 'Выйти из режима фокуса' : 'Режим фокуса'}
              title={focusMode ? 'Выйти из режима фокуса' : 'Режим фокуса'}
              onClick={() => setFocusMode((current) => !current)}
            >
              {focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>
          </div>
        </div>

        {!focusMode && canEdit ? (
          <div className="border-t border-paper-200/70 px-4 py-2 sm:px-6">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{nodeTypeLabels[node.type]}</Badge>
                <span className="text-xs text-ink-500">
                  {formatWords(wordCount)} · {formatAuthorSheets(authorSheets)}
                </span>
              </div>
              <span className="hidden text-[11px] text-ink-500 md:inline">
                Автосохранение после паузы · Ctrl+S
              </span>
            </div>
          </div>
        ) : null}
      </header>

      <main
        className={cn(
          'mx-auto w-full px-4 pb-24 pt-6 sm:px-6',
          focusMode ? 'max-w-3xl' : 'max-w-5xl',
        )}
      >
        {!canEdit ? (
          <div className="mb-5 rounded-md border border-paper-200 bg-paper-100/70 px-4 py-3 text-sm text-ink-700">
            Этот проект доступен вам только для чтения. Текст открыт без возможности
            редактирования.
          </div>
        ) : null}

        {saveStatus === 'conflict' && canEdit ? (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            <p className="flex items-center gap-2 font-medium">
              <CircleAlert size={16} />
              Документ изменился в другом окне
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-amber-900">
              Автосохранение остановлено, чтобы не потерять чужие правки. Загрузите
              последнюю версию с сервера или явно сохраните свой текст поверх неё.
            </p>
            {conflictLoading ? (
              <p className="mt-3 flex items-center gap-1.5 text-xs">
                <LoaderCircle className="animate-spin" size={13} />
                Получаем серверную версию…
              </p>
            ) : conflictDocument ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button type="button" size="sm" variant="outline" onClick={loadServerVersion}>
                  Загрузить серверную версию
                </Button>
                <Button type="button" size="sm" variant="accent" onClick={saveMyVersion}>
                  Сохранить мою версию
                </Button>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-xs">
                  {conflictError ?? 'Последняя версия ещё не загружена.'}
                </p>
                <Button
                  className="mt-2"
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void refreshConflict()}
                >
                  Получить последнюю версию
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {saveStatus === 'error' && canEdit ? (
          <div
            role="alert"
            className="mb-5 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>Не удалось сохранить текст. Изменения пока остаются только здесь.</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void saveNow()}
            >
              Повторить сохранение
            </Button>
          </div>
        ) : null}

        {!focusMode && canEdit ? (
          <div className="mb-5">
            <EditorToolbar editor={editor} />
          </div>
        ) : null}

        <article
          className={cn(
            'mx-auto rounded-lg bg-white/70 px-5 py-8 shadow-[0_1px_0_rgba(23,21,18,0.04)] sm:px-10 sm:py-12',
            focusMode ? 'border-0 bg-transparent shadow-none' : 'border border-paper-200',
            !canEdit && 'bg-paper-50',
          )}
        >
          <div className="mb-10 border-b border-paper-200 pb-6">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-500">
              {nodeTypeLabels[node.type]}
            </p>
            <h2 className="mt-2 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
              {node.title}
            </h2>
          </div>
          <EditorContent editor={editor} />
        </article>

        <p className="mt-6 text-center text-[11px] text-ink-500">
          {formatWords(wordCount)} · {formatAuthorSheets(authorSheets)}
          {canEdit ? ' · текст сохраняется автоматически' : ' · только просмотр'}
        </p>
      </main>

      <VersionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        documentId={document.id}
        canEdit={canEdit}
      />
    </div>
  );
}

export function EditorPage() {
  const { projectId, nodeId } = useParams({ strict: false }) as {
    projectId: string;
    nodeId: string;
  };

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}', {
          params: { path: { projectId } },
        }),
      ),
  });

  const nodeInfoQuery = useQuery({
    queryKey: ['editor-node', projectId, nodeId],
    queryFn: () => loadEditorNode(projectId, nodeId),
  });

  const openStructure = () => {
    window.location.assign(`/projects/${projectId}/structure`);
  };

  if (projectQuery.isLoading || nodeInfoQuery.isLoading) {
    return (
      <div className="min-h-screen bg-paper-50">
        <header className="border-b border-paper-200 px-5 py-3 sm:px-8">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <Skeleton className="h-8 w-20" />
            <div className="flex-1">
              <Skeleton className="h-5 w-72 max-w-full" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </header>
        <div className="mx-auto max-w-4xl px-6 py-12">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-10 w-2/3" />
          <Skeleton className="mt-10 h-5 w-full" />
          <Skeleton className="mt-3 h-5 w-11/12" />
          <Skeleton className="mt-3 h-5 w-4/5" />
        </div>
      </div>
    );
  }

  if (nodeInfoQuery.isError || projectQuery.isError || !nodeInfoQuery.data) {
    return (
      <main className="min-h-screen bg-paper-50 px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <Link
            className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
            to="/projects/$projectId/structure"
            params={{ projectId }}
          >
            <ArrowLeft size={15} />
            К структуре
          </Link>
          <div className="mt-5">
            <ErrorState
              title="Не удалось открыть документ"
              description={getApiErrorMessage(
                nodeInfoQuery.error ?? projectQuery.error,
                'Возможно, элемент структуры был удалён. Вернитесь к структуре книги.',
              )}
              onRetry={() => {
                void projectQuery.refetch();
                void nodeInfoQuery.refetch();
              }}
            />
          </div>
        </div>
      </main>
    );
  }

  const { node, book, path } = nodeInfoQuery.data;

  if (!node.documentId) {
    return (
      <main className="min-h-screen bg-paper-50 px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <Link
            className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
            to="/projects/$projectId/structure"
            params={{ projectId }}
          >
            <ArrowLeft size={15} />
            К структуре
          </Link>
          <div className="mt-5 rounded-lg border border-paper-200 bg-white/60 p-6">
            <h1 className="font-serif text-2xl text-ink-900">
              У этого элемента нет текста
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              У частей нет собственного документа. Откройте главу или сцену, чтобы
              писать.
            </p>
            <Button className="mt-5" variant="accent" onClick={openStructure}>
              Вернуться к структуре
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <EditorWorkspace
      projectId={projectId}
      node={node}
      book={book}
      path={path}
      documentId={node.documentId}
      canEdit={projectQuery.data?.role !== 'viewer'}
      onBack={openStructure}
    />
  );
}
