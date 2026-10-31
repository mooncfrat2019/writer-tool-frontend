import { describe, expect, it } from 'vitest';
import { legalProfileForHost, localizeLegalText } from './legal';

describe('legalProfileForHost', () => {
  it('uses writer-tool.ru values for the new domain', () => {
    expect(legalProfileForHost('writer-tool.ru')).toEqual({
      siteUrl: 'https://writer-tool.ru',
      email: 'support@writer-tool.ru',
    });
    expect(legalProfileForHost('www.writer-tool.ru')).toEqual({
      siteUrl: 'https://writer-tool.ru',
      email: 'support@writer-tool.ru',
    });
  });

  it('keeps tool.melzix.net values for the old domain and unknown hosts', () => {
    const expected = {
      siteUrl: 'https://tool.melzix.net',
      email: 'support@tool.melzix.net',
    };
    expect(legalProfileForHost('tool.melzix.net')).toEqual(expected);
    expect(legalProfileForHost('localhost')).toEqual(expected);
  });

  it('replaces the old domain and email in legal text for the new profile', () => {
    expect(
      localizeLegalText(
        'https://tool.melzix.net/legal/offer и support@tool.melzix.net',
        legalProfileForHost('writer-tool.ru'),
      ),
    ).toBe('https://writer-tool.ru/legal/offer и support@writer-tool.ru');
  });
});
