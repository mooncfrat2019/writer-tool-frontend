import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BookNode } from '@/shared/lib/tree';
import { NodeDeleteDialog } from './NodeDeleteDialog';

function node(children: BookNode[] = []): BookNode {
  return {
    id: '44444444-4444-4444-8444-444444444441',
    bookId: '33333333-3333-4333-8333-333333333333',
    parentId: null,
    type: 'part',
    title: 'Часть I. Пепел',
    status: 'draft',
    sortKey: '000000',
    wordCount: 0,
    characterCount: 0,
    authorSheets: 0,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    children,
  };
}

function renderDialog(target: BookNode) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const onOpenChange = vi.fn();
  const onDeleted = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <NodeDeleteDialog
        node={target}
        open
        onOpenChange={onOpenChange}
        onDeleted={onDeleted}
      />
    </QueryClientProvider>,
  );

  return { onOpenChange, onDeleted };
}

describe('NodeDeleteDialog', () => {
  it('requires explicit confirmation before cascading to children', async () => {
    const user = userEvent.setup();
    const child: BookNode = {
      ...node(),
      id: '55555555-5555-4555-8555-555555555551',
      parentId: '44444444-4444-4444-8444-444444444441',
      type: 'chapter',
      title: 'Глава 1',
    };
    renderDialog(node([child]));

    const confirm = screen.getByRole('button', { name: 'Удалить' });
    expect(screen.getByText(/находится 1 вложенный элемент/)).toBeInTheDocument();
    expect(confirm).toBeDisabled();

    await user.click(
      screen.getByRole('checkbox', {
        name: /Понимаю, что вложенные элементы тоже будут удалены/,
      }),
    );

    expect(confirm).toBeEnabled();
  });

  it('allows deleting a leaf node without the cascade acknowledgement', () => {
    renderDialog(node());

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeEnabled();
  });

  it('explains that the node text is deleted with the node', () => {
    renderDialog({ ...node(), documentId: 'document-1' });

    expect(
      screen.getByText(/Текст документа тоже будет удалён безвозвратно/),
    ).toBeInTheDocument();
  });
});
