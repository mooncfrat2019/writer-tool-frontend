import { useMutation } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { LEGAL_LINKS } from '@/shared/legal';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { beginOAuth, oauthErrorMessage, type OAuthProvider } from './oauth';

type OAuthButtonsProps = {
  redirect: string | null;
  disabled?: boolean;
  onError: (message: string) => void;
};

const providers: Array<{ id: OAuthProvider; label: string; mark: string }> = [
  { id: 'yandex', label: 'Яндекс ID', mark: 'Я' },
  { id: 'vk', label: 'VK ID', mark: 'VK' },
];

export function OAuthButtons({ redirect, disabled = false, onError }: OAuthButtonsProps) {
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const start = useMutation({
    mutationFn: (provider: OAuthProvider) => beginOAuth(provider, redirect),
    onMutate: (provider) => {
      setPending(provider);
    },
    onError: (error) => {
      setPending(null);
      onError(oauthErrorMessage(error));
    },
  });

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-600">
        <Checkbox
          className="mt-0.5"
          checked={accepted}
          data-testid="legal-acceptance"
          onChange={(event) => setAccepted(event.target.checked)}
        />
        <span>
          Я принимаю{' '}
          <a
            className="font-medium text-accent-700 underline-offset-4 hover:underline"
            href={LEGAL_LINKS.offer}
            target="_blank"
            rel="noreferrer"
          >
            Публичную оферту
          </a>{' '}
          и{' '}
          <a
            className="font-medium text-accent-700 underline-offset-4 hover:underline"
            href={LEGAL_LINKS.terms}
            target="_blank"
            rel="noreferrer"
          >
            Пользовательское соглашение
          </a>
          .
        </span>
      </label>

      {providers.map((provider) => {
        const isPending = pending === provider.id && start.isPending;
        return (
          <Button
            key={provider.id}
            className="w-full justify-center gap-2.5"
            type="button"
            variant="outline"
            disabled={!accepted || disabled || start.isPending}
            data-testid={`oauth-${provider.id}`}
            onClick={() => start.mutate(provider.id)}
          >
            {isPending ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-paper-100 text-[10px] font-semibold text-ink-700">
                {provider.mark}
              </span>
            )}
            {isPending ? 'Переходим…' : `Продолжить с ${provider.label}`}
          </Button>
        );
      })}
    </div>
  );
}
