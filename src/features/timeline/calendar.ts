/**
 * Calendar converter for the timeline. It mirrors internal/calendar/calendar.go;
 * both implementations are checked against testdata/calendars/*.json, which the
 * contract sync copies into ./fixtures.
 *
 * Absolute values count days from the first day of year 0. A fractional part
 * is the time of day (0.5 = 12:00), matching timeline_events.start_value.
 */

export type CalendarEra = {
  id?: string;
  name: string;
  startYear: number;
  endYear?: number | null;
};

export type CalendarMonth = {
  name: string;
  days: number;
};

export type CalendarLeapRule = {
  type: 'every_n_years' | 'gregorian' | 'none';
  n?: number;
  monthIndex?: number;
  day?: number;
};

export type CalendarConfig = {
  epochLabel?: string;
  eras?: CalendarEra[];
  months: CalendarMonth[];
  weekLength?: number;
  leapRule?: CalendarLeapRule | null;
};

export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

export type ChartTick = {
  value: number;
  label: string;
};

const MAX_MONTHS = 1000;
const MAX_MONTH_DAYS = 100_000;
const MAX_YEAR_DAYS = 1_000_000;

function mod(value: number, base: number): number {
  const result = value % base;
  return result < 0 ? result + base : result;
}

function lowerFirst(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toLocaleLowerCase('ru') + value.slice(1);
}

/** Parses and validates calendars.config; returns null for unusable input. */
export function parseCalendarConfig(raw: unknown): CalendarConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const candidate = raw as CalendarConfig;
  if (!Array.isArray(candidate.months) || candidate.months.length === 0) {
    return null;
  }
  if (validateCalendarConfig(candidate)) {
    return null;
  }
  return candidate;
}

/** Returns a human-readable error, or null when the config is valid. */
export function validateCalendarConfig(config: CalendarConfig): string | null {
  if (!Array.isArray(config.months) || config.months.length === 0) {
    return 'Добавьте хотя бы один месяц';
  }
  if (config.months.length > MAX_MONTHS) {
    return 'Слишком много месяцев';
  }
  let total = 0;
  for (const month of config.months) {
    if (
      !month ||
      typeof month.name !== 'string' ||
      !Number.isInteger(month.days) ||
      month.days < 1 ||
      month.days > MAX_MONTH_DAYS
    ) {
      return 'Длина каждого месяца должна быть от 1 до 100000 дней';
    }
    total += month.days;
    if (total > MAX_YEAR_DAYS) {
      return 'Год получается слишком длинным';
    }
  }
  if (
    config.weekLength !== undefined &&
    (!Number.isInteger(config.weekLength) ||
      config.weekLength < 0 ||
      config.weekLength > 1000)
  ) {
    return 'Длина недели должна быть от 0 до 1000';
  }
  if (config.leapRule) {
    const rule = config.leapRule;
    if (!['every_n_years', 'gregorian', 'none'].includes(rule.type)) {
      return 'Неизвестное правило високосного года';
    }
    if (rule.type === 'every_n_years' && (!rule.n || rule.n < 1)) {
      return 'Цикл високосных лет должен быть положительным';
    }
    if (
      rule.monthIndex !== undefined &&
      (!Number.isInteger(rule.monthIndex) ||
        rule.monthIndex < 0 ||
        rule.monthIndex >= config.months.length)
    ) {
      return 'Месяц високосного дня вне диапазона';
    }
    const leapMonth = leapMonthIndex(config);
    if (
      rule.day !== undefined &&
      (!Number.isInteger(rule.day) ||
        rule.day < 0 ||
        rule.day > config.months[leapMonth].days + 1)
    ) {
      return 'День високосного дня вне диапазона месяца';
    }
  }
  return null;
}

export function leapMonthIndex(config: CalendarConfig): number {
  if (config.leapRule?.monthIndex !== undefined) {
    return config.leapRule.monthIndex;
  }
  return config.months.length - 1;
}

export function isLeapYear(config: CalendarConfig, year: number): boolean {
  const rule = config.leapRule;
  if (!rule) {
    return false;
  }
  if (rule.type === 'every_n_years') {
    return Boolean(rule.n && mod(year, rule.n) === 0);
  }
  if (rule.type === 'gregorian') {
    return mod(year, 4) === 0 && (mod(year, 100) !== 0 || mod(year, 400) === 0);
  }
  return false;
}

export function monthLength(
  config: CalendarConfig,
  year: number,
  month: number,
): number {
  const value = config.months[month];
  if (!value) {
    return 0;
  }
  const leap = isLeapYear(config, year) && month === leapMonthIndex(config);
  return value.days + (leap ? 1 : 0);
}

export function yearLength(config: CalendarConfig, year: number): number {
  const total = config.months.reduce((sum, month) => sum + month.days, 0);
  return total + (isLeapYear(config, year) ? 1 : 0);
}

function daysBeforeYear(config: CalendarConfig, year: number): number {
  let total = 0;
  if (year >= 0) {
    for (let value = 0; value < year; value += 1) {
      total += yearLength(config, value);
    }
    return total;
  }
  for (let value = year; value < 0; value += 1) {
    total -= yearLength(config, value);
  }
  return total;
}

export function toAbsoluteDay(
  config: CalendarConfig,
  year: number,
  month: number,
  day: number,
): number | null {
  if (!Number.isInteger(year) || year < -1_000_000 || year > 1_000_000) {
    return null;
  }
  if (!Number.isInteger(month) || month < 0 || month >= config.months.length) {
    return null;
  }
  const length = monthLength(config, year, month);
  if (!Number.isInteger(day) || day < 1 || day > length) {
    return null;
  }
  let total = daysBeforeYear(config, year);
  for (let index = 0; index < month; index += 1) {
    total += monthLength(config, year, index);
  }
  return total + day - 1;
}

export function toAbsoluteValue(
  config: CalendarConfig,
  date: CalendarDate,
  fraction = 0,
): number | null {
  const day = toAbsoluteDay(config, date.year, date.month, date.day);
  if (day === null || fraction < 0 || fraction >= 1) {
    return null;
  }
  return day + fraction;
}

export function fromAbsoluteDay(
  config: CalendarConfig,
  value: number,
): CalendarDate | null {
  if (!Number.isFinite(value) || value < -3.65e8 || value > 3.65e8) {
    return null;
  }
  let remaining = Math.floor(value);
  let year = 0;
  if (remaining >= 0) {
    for (;;) {
      const length = yearLength(config, year);
      if (remaining < length) {
        break;
      }
      remaining -= length;
      year += 1;
    }
  } else {
    while (remaining < 0) {
      year -= 1;
      remaining += yearLength(config, year);
    }
  }
  let month = 0;
  for (;;) {
    const length = monthLength(config, year, month);
    if (remaining < length) {
      break;
    }
    remaining -= length;
    month += 1;
  }
  return { year, month, day: remaining + 1 };
}

function eraFor(config: CalendarConfig, year: number): CalendarEra | undefined {
  return config.eras?.find((era) =>
    era.endYear === undefined || era.endYear === null
      ? year >= era.startYear
      : year >= era.startYear && year <= era.endYear,
  );
}

function yearLabel(config: CalendarConfig, year: number): string {
  if (year < 0) {
    const era = eraFor(config, year);
    if (era?.name) {
      return `${-year} г. ${lowerFirst(era.name)}`;
    }
    return `${-year} г. до эпохи`;
  }
  const label = config.epochLabel?.trim();
  return label ? `${year} г. ${label}` : `${year} г.`;
}

function clock(value: number): string {
  const fraction = value - Math.floor(value);
  let totalMinutes = Math.round(fraction * 24 * 60);
  if (totalMinutes === 24 * 60) {
    totalMinutes = 0;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export type TimelinePrecision = 'era' | 'year' | 'month' | 'day' | 'time';

export function formatAbsolute(
  config: CalendarConfig,
  value: number,
  precision: TimelinePrecision = 'day',
): string {
  const date = fromAbsoluteDay(config, value);
  if (!date) {
    return '';
  }
  const month = config.months[date.month];
  switch (precision) {
    case 'era':
      return eraFor(config, date.year)?.name ?? config.epochLabel ?? '';
    case 'year':
      return yearLabel(config, date.year);
    case 'month':
      return `${month.name}, ${yearLabel(config, date.year)}`;
    case 'time':
      return `${date.day} ${month.name}, ${yearLabel(config, date.year)}, ${clock(value)}`;
    case 'day':
    default:
      return `${date.day} ${month.name}, ${yearLabel(config, date.year)}`;
  }
}

/**
 * Produces evenly spaced axis ticks. The label precision follows the visible
 * range, so a multi-century view gets year labels and a day view gets dates.
 */
export function buildTicks(
  config: CalendarConfig,
  from: number,
  to: number,
  count = 8,
): ChartTick[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    return [];
  }
  const span = to - from;
  const precision: TimelinePrecision = span > 730 ? 'year' : span > 90 ? 'month' : 'day';
  const step = span / count;
  return Array.from({ length: count + 1 }, (_, index) => {
    const value = from + step * index;
    return { value, label: formatAbsolute(config, value, precision) };
  });
}

export function datePartsFor(
  config: CalendarConfig,
  value: number,
): { year: number; month: number; day: number } | null {
  return fromAbsoluteDay(config, value);
}
