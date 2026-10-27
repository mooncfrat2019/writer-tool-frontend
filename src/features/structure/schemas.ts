import { z } from 'zod';
import type { components } from '@/shared/api/schema';
import { canContain } from '@/shared/lib/tree';
import type { BookNode } from '@/shared/lib/tree';

const optionalWordCount = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || /^\d{1,9}$/.test(value),
    'Введите целое число не больше 999 999 999',
  );

export const bookCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Введите название книги')
    .max(200, 'Название не длиннее 200 символов'),
  subtitle: z.string().trim().max(200, 'Подзаголовок не длиннее 200 символов'),
  synopsis: z.string().trim().max(5000, 'Синопсис не длиннее 5000 символов'),
  targetWordCount: optionalWordCount,
  worldId: z.string(),
});

export type BookCreateValues = z.infer<typeof bookCreateSchema>;

export const bookCreateDefaults: BookCreateValues = {
  title: '',
  subtitle: '',
  synopsis: '',
  targetWordCount: '',
  worldId: '',
};

export const nodeFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Введите название')
    .max(200, 'Название не длиннее 200 символов'),
  parentId: z.string(),
  synopsis: z.string().max(5000, 'Синопсис не длиннее 5000 символов'),
  notes: z.string().max(10_000, 'Заметки не длиннее 10 000 символов'),
  status: z.enum(['idea', 'outline', 'draft', 'revised', 'final']),
  targetWordCount: optionalWordCount,
  povCharacterId: z.string(),
});

export type NodeFormValues = z.infer<typeof nodeFormSchema>;

export function nodeToFormValues(node: BookNode): NodeFormValues {
  return {
    title: node.title,
    parentId: node.parentId ?? '',
    synopsis: node.synopsis ?? '',
    notes: node.notes ?? '',
    status: node.status,
    targetWordCount: node.targetWordCount ? String(node.targetWordCount) : '',
    povCharacterId: node.povCharacterId ?? '',
  };
}

export function parseOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  return normalized === '' ? undefined : Number(normalized);
}

export function compatibleParents(
  nodes: BookNode[],
  type: components['schemas']['BookNodeType'],
  excludeNodeId?: string,
): BookNode[] {
  const result: BookNode[] = [];
  const visit = (list: BookNode[]): void => {
    for (const node of list) {
      if (node.id !== excludeNodeId && canContain(node.type, type)) {
        result.push(node);
      }
      if (node.children?.length) {
        visit(node.children);
      }
    }
  };
  visit(nodes);
  return result;
}
