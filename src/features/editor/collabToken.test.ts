import { describe, expect, it } from 'vitest';
import { collabSocketUrl, collabTokenRefreshDelay } from './collabToken';

describe('collabTokenRefreshDelay', () => {
  const now = Date.parse('2026-01-01T00:00:00.000Z');

  it('refreshes when 20% of the lifetime remains', () => {
    const expiresAt = new Date(now + 60 * 60 * 1000).toISOString();
    expect(collabTokenRefreshDelay(expiresAt, now)).toBe(48 * 60 * 1000);
  });

  it('never schedules more often than every five seconds', () => {
    const expiresAt = new Date(now + 1_000).toISOString();
    expect(collabTokenRefreshDelay(expiresAt, now)).toBe(5_000);
  });

  it('retries soon after the token already expired', () => {
    const expiresAt = new Date(now - 60_000).toISOString();
    expect(collabTokenRefreshDelay(expiresAt, now)).toBe(5_000);
  });

  it('falls back to a minute for an unparseable timestamp', () => {
    expect(collabTokenRefreshDelay('not-a-date', now)).toBe(60_000);
  });
});

describe('collabSocketUrl', () => {
  it('targets the same origin and encodes the token', () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    expect(collabSocketUrl('/collab/doc-1', 'a b+c')).toBe(
      `${protocol}//${window.location.host}/collab/doc-1?token=a%20b%2Bc`,
    );
  });
});
