import { describe, expect, it } from 'vitest';
import {
  bookCreateSchema,
  compatibleParents,
  nodeFormSchema,
  nodeToFormValues,
  parseOptionalNumber,
} from './schemas';
import type { BookNode } from '@/shared/lib/tree';

function node(
  id: string,
  type: BookNode['type'],
  children: BookNode[] = [],
): BookNode {
  return {
    id,
    bookId: 'book-1',
    parentId: null,
    type,
    title: id,
    status: 'outline',
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

describe('bookCreateSchema', () => {
  it('trims valid values', () => {
    const result = bookCreateSchema.parse({
      title: '  Пепел  ',
      subtitle: ' Книга первая ',
      synopsis: ' Кратко ',
      targetWordCount: ' 120000 ',
    });
    expect(result.title).toBe('Пепел');
    expect(result.subtitle).toBe('Книга первая');
    expect(result.targetWordCount).toBe('120000');
  });

  it('rejects an empty title and malformed word targets', () => {
    const result = bookCreateSchema.safeParse({
      title: '   ',
      subtitle: '',
      synopsis: '',
      targetWordCount: '12 000',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.title?.[0]).toBe('Введите название книги');
      expect(fields.targetWordCount?.[0]).toContain('целое число');
    }
  });
});

describe('nodeFormSchema', () => {
  it('accepts root and character sentinels used by the form', () => {
    const values = nodeFormSchema.parse({
      title: 'Сцена',
      parentId: 'root',
      synopsis: '',
      notes: '',
      status: 'draft',
      targetWordCount: '',
      povCharacterId: 'none',
    });
    expect(values.parentId).toBe('root');
    expect(values.povCharacterId).toBe('none');
  });

  it('rejects an unknown status', () => {
    const result = nodeFormSchema.safeParse({
      title: 'Сцена',
      parentId: 'root',
      synopsis: '',
      notes: '',
      status: 'unknown',
      targetWordCount: '',
      povCharacterId: 'none',
    });
    expect(result.success).toBe(false);
  });
});

describe('node form helpers', () => {
  it('converts optional numeric fields', () => {
    expect(parseOptionalNumber('')).toBeUndefined();
    expect(parseOptionalNumber(' 3500 ')).toBe(3500);
  });

  it('maps a node into editable form values', () => {
    const values = nodeToFormValues({
      ...node('chapter-1', 'chapter'),
      parentId: 'part-1',
      synopsis: 'Синопсис',
      notes: 'Заметки',
      targetWordCount: 3500,
      povCharacterId: 'char-1',
      version: 4,
    });
    expect(values).toEqual({
      title: 'chapter-1',
      parentId: 'part-1',
      synopsis: 'Синопсис',
      notes: 'Заметки',
      status: 'outline',
      targetWordCount: '3500',
      povCharacterId: 'char-1',
    });
  });

  it('finds compatible parents while excluding the edited node', () => {
    const scene = node('scene-1', 'scene');
    const chapterOne = node('chapter-1', 'chapter', [scene]);
    const chapterTwo = node('chapter-2', 'chapter');
    const part = node('part-1', 'part', [chapterOne, chapterTwo]);

    expect(
      compatibleParents([part], 'scene').map((item) => item.id),
    ).toEqual(['part-1', 'chapter-1', 'chapter-2']);
    expect(
      compatibleParents([part], 'chapter').map((item) => item.id),
    ).toEqual(['part-1']);
    expect(
      compatibleParents([part], 'scene', 'chapter-1').map((item) => item.id),
    ).toEqual(['part-1', 'chapter-2']);
  });
});
