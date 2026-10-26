import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges conflicting tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('keeps conditional classes', () => {
    expect(cn('text-sm', false, 'font-bold')).toBe('text-sm font-bold');
  });
});
