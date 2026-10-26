/**
 * Counts words in plain text, treating any run of whitespace as a separator.
 */
export function countWords(text: string): number {
  const normalized = text.replace(/\s+/gu, ' ').trim();
  return normalized.length > 0 ? normalized.split(' ').length : 0;
}

type ProseMirrorNode = {
  text?: unknown;
  content?: unknown;
};

/**
 * Counts words in a ProseMirror JSON document.
 */
export function countProseMirrorWords(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + countProseMirrorWords(item), 0);
  }

  if (value && typeof value === 'object') {
    const node = value as ProseMirrorNode;
    if (typeof node.text === 'string') {
      return countWords(node.text);
    }
    return countProseMirrorWords(node.content);
  }

  return 0;
}
