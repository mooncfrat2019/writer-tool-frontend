import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AuthLayout } from './AuthLayout';
import {
  clearPendingOAuth,
  completeOAuth,
  isOAuthProvider,
  oauthErrorMessage,
  readPendingOAuth,
  type OAuthProvider,
} from './oauth';
import { safeRedirect } from './redirect';
import { setSessionFromAuth } from './session';

type CallbackParams = {
  provider: OAuthProvider | null;
  code: string | null;
  state: string | null;
  deviceId: string | null;
  providerError: string | null;
};

class OAuthFlowError extends Error {}

function readCallbackParams(): CallbackParams {
  const search = new URLSearchParams(window.location.search);
  const provider = search.get('provider');
  return {
    provider: isOAuthProvider(provider) ? provider : null,
    code: search.get('code'),
    state: search.get('state'),
    deviceId: search.get('device_id'),
    providerError: search.get('error'),
  };
}

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useState(readCallbackParams);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    // The authorization code must not stay in the address bar or history.
    window.history.replaceState({}, '', '/auth');

    const pending = readPendingOAuth();
    const provider = pending?.provider ?? params.provider;

    const run = async () => {
      if (params.providerError) {
        throw new OAuthFlowError(
          'Провайдер отклонил вход. Попробуйте ещё раз или войдите по почте.',
        );
      }
      if (!provider) {
        throw new OAuthFlowError('Не удалось определить провайдера. Начните вход заново.');
      }
      if (!params.code || !params.state) {
        throw new OAuthFlowError('Ссылка входа неполная. Начните вход заново.');
      }
      return completeOAuth(provider, params.code, params.state, params.deviceId ?? undefined);
    };

    void run()
      .then((data) => {
        clearPendingOAuth();
        setSessionFromAuth(data);
        queryClient.clear();
        const redirect = safeRedirect(pending?.redirect);
        if (redirect) {
          window.location.assign(redirect);
          return;
        }
        void navigate({ to: '/projects' });
      })
      .catch((cause: unknown) => {
        clearPendingOAuth();
        setError(
          cause instanceof OAuthFlowError ? cause.message : oauthErrorMessage(cause),
        );
      });
  }, [navigate, params, queryClient]);

  if (error) {
    return (
      <AuthLayout
        eyebrow="Авторизация"
        title="Вход не завершён"
        description={error}
        footer={
          <p>
            <a
              className="font-medium text-accent-700 underline-offset-4 hover:underline"
              href="/login"
            >
              Вернуться ко входу
            </a>
          </p>
        }
      >
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <p className="leading-relaxed">
            Можно войти по почте и паролю или попробовать провайдера ещё раз.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Авторизация"
      title="Завершаем вход"
      description="Проверяем ответ провайдера и открываем мастерскую."
      footer={<p>Это займёт несколько секунд.</p>}
    >
      <div
        className="flex items-center gap-3 rounded-md border border-paper-200 bg-paper-100/70 px-4 py-3 text-sm text-ink-700"
        role="status"
      >
        <LoaderCircle className="animate-spin text-accent-700" size={18} />
        Проверяем данные…
      </div>
    </AuthLayout>
  );
}
