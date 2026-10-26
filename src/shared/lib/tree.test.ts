import { describe, expect, it } from 'vitest';
import {
  canContain,
  countTreeNodes,
  findNodePath,
  findTreeNode,
  flattenTree,
  isDescendantOf,
  moveTreeNode,
  resolveNodeDrop,
  type BookNode,
} from './tree';

function node(
  id: string,
  type: BookNode['type'],
  children: BookNode[] = [],
  parentId: string | null = null,
): BookNode {
  return {
    id,
    bookId: 'book-1',
    parentId,
    type,
    title: id,
    status: 'draft',
    sortKey: '000000',
    wordCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    version: 1,
    children,
  };
}

function fixture(): BookNode[] {
  const sceneOne = node('scene-1', 'scene', [], 'chapter-1');
  const chapterOne = node('chapter-1', 'chapter', [sceneOne], 'part-1');
  const chapterTwo = node('chapter-2', 'chapter', [], 'part-1');
  const partOne = node('part-1', 'part', [chapterOne, chapterTwo]);
  return [partOne, node('chapter-3', 'chapter')];
}

describe('canContain', () => {
  it('allows only structural parent-child combinations', () => {
    expect(canContain(null, 'part')).toBe(true);
    expect(canContain(null, 'chapter')).toBe(true);
    expect(canContain(null, 'scene')).toBe(false);
    expect(canContain('part', 'chapter')).toBe(true);
    expect(canContain('part', 'scene')).toBe(true);
    expect(canContain('chapter', 'scene')).toBe(true);
    expect(canContain('chapter', 'chapter')).toBe(false);
    expect(canContain('scene', 'scene')).toBe(false);
  });
});

describe('tree helpers', () => {
  it('flattens depth and parent information in reading order', () => {
    expect(flattenTree(fixture()).map(({ node: item, depth, parentId }) => ({
      id: item.id,
      depth,
      parentId,
    }))).toEqual([
      { id: 'part-1', depth: 0, parentId: null },
      { id: 'chapter-1', depth: 1, parentId: 'part-1' },
      { id: 'scene-1', depth: 2, parentId: 'chapter-1' },
      { id: 'chapter-2', depth: 1, parentId: 'part-1' },
      { id: 'chapter-3', depth: 0, parentId: null },
    ]);
  });

  it('finds nodes, their paths and descendant relationships', () => {
    const nodes = fixture();
    expect(findTreeNode(nodes, 'scene-1')?.title).toBe('scene-1');
    expect(findTreeNode(nodes, 'missing')).toBeNull();
    expect(findNodePath(nodes, 'scene-1').map((item) => item.id)).toEqual([
      'part-1',
      'chapter-1',
      'scene-1',
    ]);
    expect(findNodePath(nodes, 'missing')).toEqual([]);
    expect(isDescendantOf(nodes, 'part-1', 'scene-1')).toBe(true);
    expect(isDescendantOf(nodes, 'scene-1', 'part-1')).toBe(false);
    expect(countTreeNodes(nodes)).toBe(5);
  });
});

describe('moveTreeNode', () => {
  it('moves a scene into another chapter', () => {
    const moved = moveTreeNode(fixture(), 'scene-1', 'chapter-2');
    expect(findTreeNode(moved, 'chapter-1')?.children).toEqual([]);
    expect(findTreeNode(moved, 'chapter-2')?.children?.map((item) => item.id)).toEqual([
      'scene-1',
    ]);
    expect(findTreeNode(moved, 'scene-1')?.parentId).toBe('chapter-2');
  });

  it('reorders siblings using beforeId and afterId', () => {
    const before = moveTreeNode(fixture(), 'chapter-2', 'part-1', 'chapter-1');
    expect(findTreeNode(before, 'part-1')?.children?.map((item) => item.id)).toEqual([
      'chapter-2',
      'chapter-1',
    ]);

    const after = moveTreeNode(fixture(), 'chapter-1', 'part-1', null, 'chapter-2');
    expect(findTreeNode(after, 'part-1')?.children?.map((item) => item.id)).toEqual([
      'chapter-2',
      'chapter-1',
    ]);
  });

  it('promotes a chapter to the book root', () => {
    const moved = moveTreeNode(fixture(), 'chapter-2', null, null, 'chapter-3');
    expect(moved.map((item) => item.id)).toEqual([
      'part-1',
      'chapter-3',
      'chapter-2',
    ]);
    expect(findTreeNode(moved, 'chapter-2')?.parentId).toBeNull();
  });

  it('keeps the original tree for invalid destinations', () => {
    const nodes = fixture();
    expect(moveTreeNode(nodes, 'part-1', 'chapter-1')).toEqual(nodes);
    expect(moveTreeNode(nodes, 'chapter-1', 'scene-1')).toEqual(nodes);
    expect(moveTreeNode(nodes, 'part-1', null, 'part-1')).toEqual(nodes);
    expect(moveTreeNode(nodes, 'missing', null)).toBe(nodes);
  });
});

describe('resolveNodeDrop', () => {
  it('drops a chapter onto a part as its new last child', () => {
    expect(resolveNodeDrop(fixture(), 'chapter-3', 'part-1', false)).toEqual({
      parentId: 'part-1',
      beforeId: null,
      afterId: null,
    });
  });

  it('drops a scene before or after a sibling scene', () => {
    const nodes = fixture();
    const chapter = findTreeNode(nodes, 'chapter-1');
    if (!chapter) {
      throw new Error('Fixture chapter missing');
    }
    chapter.children = [
      node('scene-1', 'scene', [], 'chapter-1'),
      node('scene-2', 'scene', [], 'chapter-1'),
    ];

    expect(resolveNodeDrop(nodes, 'scene-2', 'scene-1', false)).toEqual({
      parentId: 'chapter-1',
      beforeId: 'scene-1',
      afterId: null,
    });
    expect(resolveNodeDrop(nodes, 'scene-2', 'scene-1', true)).toEqual({
      parentId: 'chapter-1',
      beforeId: null,
      afterId: 'scene-1',
    });
  });

  it('keeps parts at the book root when dropped over nested nodes', () => {
    const nodes = [
      ...fixture(),
      node('part-2', 'part', [
        node('chapter-4', 'chapter', [node('scene-2', 'scene')]),
      ]),
    ];
    expect(resolveNodeDrop(nodes, 'part-1', 'scene-2', false)).toEqual({
      parentId: null,
      beforeId: 'part-2',
      afterId: null,
    });
  });

  it('rejects self and descendant drops', () => {
    const nodes = fixture();
    expect(resolveNodeDrop(nodes, 'part-1', 'part-1', false)).toBeNull();
    expect(resolveNodeDrop(nodes, 'part-1', 'chapter-1', false)).toBeNull();
  });
});
