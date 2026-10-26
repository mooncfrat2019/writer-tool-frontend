import { describe, expect, it } from 'vitest';
import {
  buildTicks,
  formatAbsolute,
  fromAbsoluteDay,
  parseCalendarConfig,
  toAbsoluteValue,
  validateCalendarConfig,
  type CalendarConfig,
} from './calendar';

type Vector = {
  name: string;
  date?: { year: number; month: number; day: number };
  absolute: number;
  fraction?: number;
  format?: Record<string, string>;
};

type Fixture = {
  name: string;
  config: CalendarConfig;
  vectors: Vector[];
};

const fixtures = import.meta.glob('./fixtures/*.json', { eager: true }) as Record<
  string,
  Fixture
>;

describe.each(Object.values(fixtures))('calendar $name', (fixture) => {
  it('accepts its config', () => {
    expect(validateCalendarConfig(fixture.config)).toBeNull();
    expect(parseCalendarConfig(fixture.config)).not.toBeNull();
  });

  it.each(fixture.vectors)('converts $name', (vector) => {
    if (vector.date) {
      const value = toAbsoluteValue(
        fixture.config,
        vector.date,
        vector.fraction ?? 0,
      );
      expect(value).toBe(vector.absolute);
    }
    const date = fromAbsoluteDay(fixture.config, vector.absolute);
    expect(date).not.toBeNull();
    if (vector.date) {
      expect(date).toEqual(vector.date);
    }
    for (const [precision, expected] of Object.entries(vector.format ?? {})) {
      expect(
        formatAbsolute(
          fixture.config,
          vector.absolute,
          precision as 'era' | 'year' | 'month' | 'day' | 'time',
        ),
      ).toBe(expected);
    }
  });
});

describe('calendar validation and ticks', () => {
  it('rejects a calendar without months', () => {
    expect(validateCalendarConfig({ months: [] })).not.toBeNull();
    expect(parseCalendarConfig({ months: [] })).toBeNull();
  });

  it('rejects an unknown leap rule', () => {
    expect(
      validateCalendarConfig({
        months: [{ name: 'A', days: 10 }],
        leapRule: { type: 'moon' as 'gregorian' },
      }),
    ).not.toBeNull();
  });

  it('builds ordered ticks within the range', () => {
    const fixture = Object.values(fixtures)[0];
    const ticks = buildTicks(fixture.config, fixture.vectors[0].absolute, 500, 4);
    expect(ticks).toHaveLength(5);
    expect(ticks[0].value).toBe(fixture.vectors[0].absolute);
    expect(ticks[4].value).toBe(500);
    expect(ticks[0].label.length).toBeGreaterThan(0);
  });
});
