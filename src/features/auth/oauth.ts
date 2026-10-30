import { api } from '@/shared/api/client';
import { getApiProblemCode } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { LEGAL_VERSIONS } from '@/shared/legal';

export type OAuthProvider = 'yandex' | 'vk';

type AuthResponse = components['schemas']['AuthResponse'];

const PENDING_KEY = 'wt_oauth_pending';

export type PendingOAuth = {
  provider: OAuthProvider;
  redirect: string | null;
};

export function isOAuthProvider(value: string | null | undefined): value is OAuthProvider {
  return value === 'yandex' || value === 'vk';
}

export function readPendingOAuth(): PendingOAuth | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<PendingOAuth>;
    if (!isOAuthProvider(parsed.provider)) {
      return null;
    }
    return {
      provider: parsed.provider,
      redirect: typeof parsed.redirect === 'string' ? parsed.redirect : null,
    };
  } catch {
    return null;
  }
}

export function savePendingOAuth(pending: PendingOAuth): void {
  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // A blocked sessionStorage only loses the redirect; the provider itself
    // comes from the state row on the server.
  }
}

export function clearPendingOAuth(): void {
  try {
    window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export async function beginOAuth(
  provider: OAuthProvider,
  redirect: string | null,
): Promise<void> {
  const response = unwrap(
    await api.POST('/auth/oauth/{provider}/start', {
      params: { path: { provider } },
      body: {
        ...LEGAL_VERSIONS,
        ...(redirect ? { redirect } : {}),
      },
    }),
  );
  savePendingOAuth({ provider, redirect });
  window.location.assign(response.authorizationUrl);
}

export async function completeOAuth(
  provider: OAuthProvider,
  code: string,
  state: string,
  deviceId?: string,
): Promise<AuthResponse> {
  return unwrap(
    await api.POST('/auth/oauth/{provider}/callback', {
      params: { path: { provider } },
      body: {
        code,
        state,
        ...(deviceId ? { deviceId } : {}),
      },
    }),
  );
}

export function oauthErrorMessage(error: unknown): string {
  switch (getApiProblemCode(error)) {
    case 'oauth_not_configured':
      return 'Этот способ входа пока недоступен. Войдите по почте и паролю.';
    case 'invalid_oauth_state':
      return 'Ссылка входа устарела. Начните вход заново.';
    case 'oauth_provider_error':
      return 'Провайдер отклонил вход. Попробуйте ещё раз или войдите по почте.';
    case 'oauth_subject_missing':
      return 'Провайдер не вернул идентификатор аккаунта. Попробуйте другой способ входа.';
    case 'oauth_account_conflict':
      return 'Этот аккаунт уже привязан к другому пользователю.';
    default:
      return 'Не удалось войти через провайдера. Попробуйте ещё раз.';
  }
}
