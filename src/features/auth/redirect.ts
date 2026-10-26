/**
 * Returns a safe internal redirect target from the `redirect` query param.
 * Only same-origin absolute paths are accepted.
 */
export function getAuthRedirect(): string | null {
  const raw = new URLSearchParams(window.location.search).get('redirect');
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return null;
  }
  return raw;
}

export function redirectQuery(redirect: string | null): string {
  return redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
}
