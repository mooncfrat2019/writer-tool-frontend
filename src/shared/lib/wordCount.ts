/**
 * Counts words in plain text, treating any run of whitespace as a separator.
 */
export function countWords(text: string): number {
  const normalized = text.replace(/\s+/gu, ' ').trim();
  return normalized.length > 0 ? normalized.split(' ').length : 0;
}

type ProseMirrorNode = {
  type?: unknown;
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

/**
 * Counts Unicode characters including spaces in a ProseMirror JSON document.
 * Paragraphs and headings add one line break; hard breaks and scene separators
 * add one character. Images and formatting marks are not counted.
 */
export function countProseMirrorCharacters(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + countProseMirrorCharacters(item), 0);
  }

  if (value && typeof value === 'object') {
    const node = value as ProseMirrorNode;
    let total = typeof node.text === 'string' ? [...node.text].length : 0;
    total += countProseMirrorCharacters(node.content);
    if (
      node.type === 'paragraph' ||
      node.type === 'heading' ||
      node.type === 'hardBreak' ||
      node.type === 'horizontalRule'
    ) {
      total += 1;
    }
    return total;
  }

  return 0;
}
