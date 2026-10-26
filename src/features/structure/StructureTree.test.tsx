import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BookNode } from '@/shared/lib/tree';
import { StructureTree } from './StructureTree';

function node(
  id: string,
  title: string,
  type: BookNode['type'],
  children: BookNode[] = [],
): BookNode {
  return {
    id,
    bookId: 'book-1',
    parentId: null,
    type,
    title,
    status: 'draft',
    sortKey: '000000',
    wordCount: 0,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    children,
  };
}

const nodes = [
  node('part-1', 'Часть I. Пепел', 'part', [
    node('chapter-1', 'Глава 1. Пробуждение', 'chapter', [
      node('scene-1', 'Сцена 1. Площадь', 'scene'),
    ]),
  ]),
];

const handlers = {
  onSelect: vi.fn(),
  onCreateChild: vi.fn(),
  onDelete: vi.fn(),
  onOpenEditor: vi.fn(),
  onMove: vi.fn(),
};

function renderTree(canEdit: boolean, selectedId: string | null = null) {
  render(
    <StructureTree
      nodes={nodes}
      selectedId={selectedId}
      canEdit={canEdit}
      {...handlers}
    />,
  );
}

describe('StructureTree', () => {
  it('renders nested parts, chapters and scenes', () => {
    renderTree(true);

    expect(screen.getByText('Часть I. Пепел')).toBeInTheDocument();
    expect(screen.getByText('Глава 1. Пробуждение')).toBeInTheDocument();
    expect(screen.getByText('Сцена 1. Площадь')).toBeInTheDocument();
    expect(screen.getByTestId('structure-node-part')).toBeInTheDocument();
    expect(screen.getByTestId('structure-node-chapter')).toBeInTheDocument();
    expect(screen.getByTestId('structure-node-scene')).toBeInTheDocument();
  });

  it('selects a node from its title', async () => {
    const user = userEvent.setup();
    handlers.onSelect.mockClear();
    renderTree(true);

    await user.click(screen.getByText('Глава 1. Пробуждение'));

    expect(handlers.onSelect).toHaveBeenCalledWith('chapter-1');
  });

  it('offers editing controls only when the project allows changes', () => {
    const { unmount } = render(
      <StructureTree
        nodes={nodes}
        selectedId={null}
        canEdit
        {...handlers}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Переместить «Часть I. Пепел»' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Добавить вложенный элемент в «Часть I. Пепел»' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Удалить «Часть I. Пепел»' }),
    ).toBeInTheDocument();

    unmount();
    renderTree(false);

    expect(
      screen.queryByRole('button', { name: /Переместить/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Удалить/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Добавить вложенный/ }),
    ).not.toBeInTheDocument();
  });

  it('shows an empty state for an empty book', () => {
    render(
      <StructureTree
        nodes={[]}
        selectedId={null}
        canEdit
        {...handlers}
      />,
    );

    expect(screen.getByText('Структура пока пуста')).toBeInTheDocument();
  });
});
