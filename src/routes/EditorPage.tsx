import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ArrowLeft, Bold, Heading2, Italic, List } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

function findNode(nodes: BookNode[], nodeId: string): BookNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }
    const found = findNode(node.children ?? [], nodeId);
    if (found) {
      return found;
    }
  }
  return null;
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function EditorPage() {
  const { projectId, nodeId } = useParams({ strict: false }) as {
    projectId: string;
    nodeId: string;
  };
  const [wordCount, setWordCount] = useState(0);
  const loadedDocumentId = useRef<string | null>(null);

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

  const node = treeQuery.data ? findNode(treeQuery.data.nodes, nodeId) : null;

  const documentQuery = useQuery({
    queryKey: ['document', node?.documentId],
    queryFn: async () => {
      if (!node?.documentId) {
        throw new Error('Document not found');
      }
      return unwrap(
        await api.GET('/documents/{documentId}', {
          params: { path: { documentId: node.documentId } },
        }),
      );
    },
    enabled: Boolean(node?.documentId),
  });

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'ProseMirror',
        'aria-label': 'Текст главы',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      setWordCount(countWords(currentEditor.getText()));
    },
  });

  useEffect(() => {
    const document = documentQuery.data;
    if (!editor || !document || loadedDocumentId.current === document.id) {
      return;
    }
    loadedDocumentId.current = document.id;
    if (document.canonical) {
      editor.commands.setContent(document.canonical as never);
    }
    setWordCount(countWords(editor.getText()));
  }, [editor, documentQuery.data]);

  if (booksQuery.isLoading || treeQuery.isLoading) {
    return <p className="p-8 text-sm text-ink-500">Загрузка…</p>;
  }

  if (!node) {
    return (
      <div className="p-8">
        <p className="font-serif text-2xl">Глава не найдена</p>
        <Link
          className="mt-4 inline-flex text-sm text-accent-700 hover:underline"
          to="/projects/$projectId/structure"
          params={{ projectId }}
        >
          ← Вернуться к структуре
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-paper-200 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/projects/$projectId/structure" params={{ projectId }}>
              <ArrowLeft size={17} />
            </Link>
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-500">Редактор</p>
            <h1 className="font-serif text-2xl leading-tight">{node.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-500">
          <Badge tone={node.status === 'final' ? 'success' : 'warning'}>
            {statusLabels[node.status] ?? node.status}
          </Badge>
          <span>{new Intl.NumberFormat('ru-RU').format(wordCount)} слов</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            mock-синхронизация
          </span>
        </div>
      </div>

      {!node.documentId ? (
        <div className="rounded-xl border border-dashed border-paper-300 p-12 text-center">
          <p className="font-serif text-2xl">Документ ещё не создан</p>
          <p className="mt-2 text-sm text-ink-500">
            В реальном API документ создаётся вместе с главой. В mock-режиме он уже должен
            существовать.
          </p>
        </div>
      ) : (
        <>
          <div className="sticky top-0 z-10 mb-4 flex items-center gap-1 rounded-lg border border-paper-200 bg-paper-50/90 px-2 py-1.5 backdrop-blur">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Жирный"
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold size={15} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Курсив"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic size={15} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Заголовок"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 size={15} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Список"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List size={15} />
            </Button>
            {documentQuery.isFetching ? (
              <span className="ml-auto pr-2 text-xs text-ink-500">загрузка документа…</span>
            ) : null}
          </div>
          <EditorContent editor={editor} />
        </>
      )}
    </div>
  );
}
