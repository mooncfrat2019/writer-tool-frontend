import { describe, expect, it } from 'vitest';
import { countProseMirrorWords, countWords } from './wordCount';
import { formatDate, formatDateTime, formatNumber, formatWords } from './format';

describe('countWords', () => {
  it('ignores extra whitespace and newlines', () => {
    expect(countWords('  один\n\n два\tтри  ')).toBe(3);
  });

  it('returns zero for empty text', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n ')).toBe(0);
  });
});

describe('countProseMirrorWords', () => {
  it('counts text within nested ProseMirror nodes', () => {
    const document = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Глава первая' }],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Слова в цитате.' },
                { type: 'hardBreak' },
                { type: 'text', text: 'И ещё три.' },
              ],
            },
          ],
        },
      ],
    };

    expect(countProseMirrorWords(document)).toBe(8);
  });

  it('handles empty and invalid values', () => {
    expect(countProseMirrorWords(null)).toBe(0);
    expect(countProseMirrorWords([])).toBe(0);
    expect(countProseMirrorWords({ type: 'doc', content: [] })).toBe(0);
  });
});

describe('Russian formatting', () => {
  it('pluralizes word counts', () => {
    expect(formatWords(1)).toBe('1 слово');
    expect(formatWords(2)).toBe('2 слова');
    expect(formatWords(5)).toBe('5 слов');
    expect(formatWords(11)).toBe('11 слов');
    expect(formatWords(21)).toBe('21 слово');
    expect(formatWords(112)).toBe('112 слов');
  });

  it('formats numbers and dates with ru-RU conventions', () => {
    expect(formatNumber(120_000)).toBe('120 000');
    expect(formatDate('2026-10-26T09:30:00.000Z')).toMatch(/2026/);
    expect(formatDateTime('not-a-date')).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
  });
});
