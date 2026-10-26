import type { TimelineDateMode, TimelinePrecision } from './api';
import type { CalendarConfig } from './calendar';

export const gregorianCalendar: CalendarConfig = {
  epochLabel: 'н. э.',
  eras: [
    { id: 'bc', name: 'до н. э.', startYear: -9999, endYear: -1 },
    { id: 'ad', name: 'н. э.', startYear: 1, endYear: null },
  ],
  months: [
    { name: 'Январь', days: 31 },
    { name: 'Февраль', days: 28 },
    { name: 'Март', days: 31 },
    { name: 'Апрель', days: 30 },
    { name: 'Май', days: 31 },
    { name: 'Июнь', days: 30 },
    { name: 'Июль', days: 31 },
    { name: 'Август', days: 31 },
    { name: 'Сентябрь', days: 30 },
    { name: 'Октябрь', days: 31 },
    { name: 'Ноябрь', days: 30 },
    { name: 'Декабрь', days: 31 },
  ],
  weekLength: 7,
  leapRule: { type: 'gregorian', monthIndex: 1, day: 29 },
};

export const fantasyCalendar: CalendarConfig = {
  epochLabel: 'от Основания',
  eras: [
    { id: 'before', name: 'До Основания', startYear: -1000, endYear: -1 },
    { id: 'after', name: 'После Основания', startYear: 1, endYear: null },
  ],
  months: [
    { name: 'Зимородок', days: 30 },
    { name: 'Ветрень', days: 31 },
  ],
  weekLength: 7,
  leapRule: { type: 'every_n_years', n: 4, monthIndex: 1, day: 30 },
};

export const calendarPresets = [
  {
    id: 'gregorian',
    label: 'Григорианский',
    description: 'Реальный календарь с високосными годами.',
    config: gregorianCalendar,
  },
  {
    id: 'fantasy',
    label: 'Фэнтези: два месяца',
    description: 'Зимородок и Ветрень, високосный день раз в четыре года.',
    config: fantasyCalendar,
  },
] as const;

export const precisionOptions: Array<{ value: TimelinePrecision; label: string }> = [
  { value: 'era', label: 'Эпоха' },
  { value: 'year', label: 'Год' },
  { value: 'month', label: 'Месяц' },
  { value: 'day', label: 'День' },
  { value: 'time', label: 'Время' },
];

export const dateModeOptions: Array<{ value: TimelineDateMode; label: string }> = [
  { value: 'exact', label: 'Точная дата' },
  { value: 'approximate', label: 'Примерная дата' },
  { value: 'unknown', label: 'Дата неизвестна' },
];

export const importanceOptions = Array.from({ length: 6 }, (_, value) => ({
  value,
  label: value === 0 ? '0 — фон' : value === 5 ? '5 — ключевое' : String(value),
}));

export const threadColors = [
  '#8a5a2b',
  '#b45309',
  '#4a6a7a',
  '#7a4a5a',
  '#4a7a5a',
  '#6a5a8a',
] as const;

export const linkTypeLabels = {
  character: 'Персонаж',
  location: 'Локация',
  faction: 'Фракция',
  lore: 'Лор',
} as const;
