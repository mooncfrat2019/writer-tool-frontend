export const worldTypeOptions = [
  ['fantasy', 'Фэнтези'],
  ['scifi', 'Научная фантастика'],
  ['modern', 'Современность'],
  ['historical', 'Исторический'],
  ['other', 'Другое'],
] as const;

export const locationTypeOptions = [
  ['city', 'Город'],
  ['region', 'Регион'],
  ['building', 'Здание'],
  ['landmark', 'Достопримечательность'],
  ['other', 'Другое'],
] as const;

export const factionTypeOptions = [
  ['state', 'Государство'],
  ['order', 'Орден'],
  ['guild', 'Гильдия'],
  ['clan', 'Клан'],
  ['cult', 'Культ'],
  ['other', 'Другое'],
] as const;

export const ruleCategoryOptions = [
  ['magic', 'Магия'],
  ['physics', 'Физика'],
  ['society', 'Общество'],
  ['technology', 'Технологии'],
  ['religion', 'Религия'],
  ['other', 'Другое'],
] as const;

export const loreTypeOptions = [
  ['legend', 'Легенда'],
  ['history', 'История'],
  ['artifact', 'Артефакт'],
  ['language', 'Язык'],
  ['custom', 'Обычай'],
  ['other', 'Другое'],
] as const;

type Option = readonly [string, string];

export function optionLabel(options: readonly Option[], value: string, fallback = '—'): string {
  if (!value) {
    return fallback;
  }
  return options.find(([key]) => key === value)?.[1] ?? value;
}

export const importanceLabels: Record<number, string> = {
  0: 'Фон',
  1: 'Низкая',
  2: 'Небольшая',
  3: 'Средняя',
  4: 'Высокая',
  5: 'Ключевая',
};
