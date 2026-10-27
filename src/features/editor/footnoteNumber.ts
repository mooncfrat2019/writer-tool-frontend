import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

/**
 * Returns the 1-based number of the footnote at a document position, counting
 * only footnote nodes in reading order.
 */
export function footnoteNumberAt(
  doc: ProseMirrorNode,
  position: number | undefined,
): number {
  if (position === undefined) {
    return 0;
  }
  let seen = 0;
  let number = 0;
  doc.descendants((node, pos) => {
    if (node.type.name !== 'footnote') {
      return true;
    }
    seen += 1;
    if (pos === position) {
      number = seen;
      return false;
    }
    return true;
  });
  return number;
}
