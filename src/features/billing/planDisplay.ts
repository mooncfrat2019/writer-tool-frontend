import type { components } from '@/shared/api/schema';

export type BillingPlan = components['schemas']['BillingPlan'];
export type BillingLimits = BillingPlan['limits'];

export const FALLBACK_PLANS: BillingPlan[] = [
  {
    id: 'free',
    name: 'Бесплатный',
    description: 'Небольшой роман: одна книга до 5 авторских листов.',
    limits: {
      projects: 1,
      books: 1,
      characters: 30,
      timelineEvents: 150,
      worlds: 1,
      locations: 20,
      factions: 10,
      loreEntries: 20,
      storageBytes: 1024 ** 3,
      manuscriptCharacters: 200_000,
    },
  },
  {
    id: 'pro',
    name: 'Профессиональный',
    description:
      'Серия книг: до 20 книг и около 175 авторских листов, расширенные справочники и хранилище.',
    limits: {
      projects: 20,
      books: 20,
      characters: 500,
      timelineEvents: 5000,
      worlds: 10,
      locations: 500,
      factions: 200,
      loreEntries: 500,
      storageBytes: 10 * 1024 ** 3,
      manuscriptCharacters: 7_000_000,
    },
  },
];

const AUTHOR_SHEET = 40_000;

export function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU');
}

export function formatAuthorSheets(characters: number): string {
  const sheets = characters / AUTHOR_SHEET;
  return `${formatNumber(characters)} символов · ${sheets.toLocaleString('ru-RU', {
    maximumFractionDigits: 1,
  })} а.л.`;
}

export function formatBytes(bytes: number): string {
  const gibibyte = 1024 ** 3;
  if (bytes >= gibibyte) {
    return `${(bytes / gibibyte).toLocaleString('ru-RU', {
      maximumFractionDigits: 1,
    })} ГБ`;
  }
  return `${Math.round(bytes / 1024 / 1024)} МБ`;
}

export type PlanLimitRow = {
  key: keyof BillingLimits;
  label: string;
  value: string;
};

export function planLimitRows(limits: BillingLimits): PlanLimitRow[] {
  return [
    { key: 'projects', label: 'Проекты', value: formatNumber(limits.projects) },
    { key: 'books', label: 'Книги', value: formatNumber(limits.books) },
    { key: 'characters', label: 'Персонажи', value: formatNumber(limits.characters) },
    {
      key: 'timelineEvents',
      label: 'События таймлайна',
      value: formatNumber(limits.timelineEvents),
    },
    { key: 'worlds', label: 'Миры', value: formatNumber(limits.worlds) },
    { key: 'locations', label: 'Локации', value: formatNumber(limits.locations) },
    { key: 'factions', label: 'Фракции', value: formatNumber(limits.factions) },
    { key: 'loreEntries', label: 'Записи лора', value: formatNumber(limits.loreEntries) },
    {
      key: 'manuscriptCharacters',
      label: 'Объём рукописи',
      value: formatAuthorSheets(limits.manuscriptCharacters),
    },
    {
      key: 'storageBytes',
      label: 'Хранилище',
      value: formatBytes(limits.storageBytes),
    },
  ];
}
