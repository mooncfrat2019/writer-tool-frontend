import { useQueries, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';

export type BookNode = components['schemas']['BookNode'];
export type Book = components['schemas']['Book'];

export type StructureNode = BookNode & {
  bookId: string;
  bookTitle: string;
  depth: number;
  order: number;
};

export type ProjectStructure = {
  books: Book[];
  nodes: StructureNode[];
};

function flatten(
  nodes: BookNode[],
  bookId: string,
  bookTitle: string,
  depth: number,
  result: StructureNode[],
): void {
  const sorted = [...nodes].sort((left, right) =>
    left.sortKey.localeCompare(right.sortKey),
  );
  for (const node of sorted) {
    result.push({
      ...node,
      bookId,
      bookTitle,
      depth,
      order: result.length,
    });
    if (node.children?.length) {
      flatten(node.children, bookId, bookTitle, depth + 1, result);
    }
  }
}

export function useProjectStructure(projectId: string) {
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

  const books = booksQuery.data?.items ?? [];
  const treeQueries = useQueries({
    queries: books.map((book) => ({
      queryKey: ['book-tree', book.id],
      queryFn: async () =>
        unwrap(
          await api.GET('/books/{bookId}/tree', {
            params: { path: { bookId: book.id } },
          }),
        ),
      enabled: Boolean(book.id),
    })),
  });

  const nodes: StructureNode[] = [];
  books.forEach((book, index) => {
    const tree = treeQueries[index]?.data;
    if (tree?.nodes) {
      flatten(tree.nodes, book.id, book.title, 0, nodes);
    }
  });

  return {
    books,
    nodes,
    loading:
      booksQuery.isLoading || treeQueries.some((query) => query.isLoading),
  };
}
