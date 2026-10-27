/**
 * Returns a safe internal redirect target from the `redirect` query param.
 * Only same-origin absolute paths are accepted.
 */
export function safeRedirect(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  const value = raw.trim();
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\r\n]/.test(value)
  ) {
    return null;
  }
  return value;
}

export function getAuthRedirect(): string | null {
  return safeRedirect(new URLSearchParams(window.location.search).get('redirect'));
}

export function redirectQuery(redirect: string | null): string {
  return redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
}
