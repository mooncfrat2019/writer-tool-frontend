const MIN_REFRESH_MS = 5_000;
const MAX_REFRESH_MS = 24 * 60 * 60 * 1000;

/**
 * Builds the same-origin WebSocket URL. The token travels in the query string
 * because the collab handshake authenticates before the Hocuspocus protocol.
 */
export function collabSocketUrl(websocketPath: string, token: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${websocketPath}?token=${encodeURIComponent(token)}`;
}

/**
 * Returns how long to wait before fetching a fresh collab token. Refreshing
 * when 20% of the lifetime remains keeps the URL valid for reconnects without
 * interrupting a healthy socket.
 */
export function collabTokenRefreshDelay(
  expiresAt: string,
  now: number = Date.now(),
): number {
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(expires)) {
    return 60_000;
  }
  const remaining = expires - now;
  if (remaining <= 0) {
    return MIN_REFRESH_MS;
  }
  return Math.min(
    MAX_REFRESH_MS,
    Math.max(MIN_REFRESH_MS, Math.round(remaining * 0.8)),
  );
}
