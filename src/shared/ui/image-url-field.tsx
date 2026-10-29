import { CheckCircle2, ImageOff, Loader2, Link2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const MAX_URL_LENGTH = 2048;
const CHECK_TIMEOUT_MS = 10_000;

type ImageUrlStatus = 'idle' | 'checking' | 'ready' | 'error';

type ImageUrlFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
  helpText?: string;
  placeholder?: string;
  disabled?: boolean;
};

function validateImageUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return 'Укажите ссылку на изображение.';
  }
  if (value.length > MAX_URL_LENGTH) {
    return 'Ссылка длиннее 2048 символов.';
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return 'Это не похоже на ссылку. Начните с https:// или http://.';
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return 'Поддерживаются только ссылки http:// и https://.';
  }
  if (parsed.username || parsed.password) {
    return 'Ссылка не должна содержать логин или пароль.';
  }
  return null;
}

function loadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => {
      image.src = '';
      reject(new Error('Сайт не ответил за 10 секунд.'));
    }, CHECK_TIMEOUT_MS);

    image.referrerPolicy = 'no-referrer';
    image.onload = () => {
      window.clearTimeout(timer);
      if (image.naturalWidth === 0 || image.naturalHeight === 0) {
        reject(new Error('По ссылке не удалось прочитать изображение.'));
        return;
      }
      resolve();
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('По ссылке не найдено изображение.'));
    };
    image.src = url;
  });
}

export function ImageUrlField({
  id = 'image-url',
  label,
  value,
  onChange,
  onValidityChange,
  helpText,
  placeholder = 'https://example.com/image.jpg',
  disabled = false,
}: ImageUrlFieldProps) {
  const [status, setStatus] = useState<ImageUrlStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [checkedUrl, setCheckedUrl] = useState<string | null>(null);
  const requestRef = useRef(0);

  useEffect(
    () => () => {
      requestRef.current += 1;
    },
    [],
  );

  const handleChange = (nextValue: string) => {
    onChange(nextValue);
    if (nextValue !== checkedUrl) {
      requestRef.current += 1;
      setStatus('idle');
      setMessage(null);
      setCheckedUrl(null);
      onValidityChange(false);
    }
  };

  const check = async () => {
    const error = validateImageUrl(value);
    if (error) {
      requestRef.current += 1;
      setStatus('error');
      setMessage(error);
      setCheckedUrl(null);
      onValidityChange(false);
      return;
    }
    const parsed = new URL(value.trim());
    parsed.hash = '';
    const normalized = parsed.toString();
    const request = requestRef.current + 1;
    requestRef.current = request;
    setStatus('checking');
    setMessage(null);
    setCheckedUrl(null);
    onValidityChange(false);
    try {
      await loadImage(normalized);
      if (requestRef.current !== request) {
        return;
      }
      setStatus('ready');
      setMessage('Изображение загружено.');
      setCheckedUrl(normalized);
      onChange(normalized);
      onValidityChange(true);
    } catch (loadError) {
      if (requestRef.current !== request) {
        return;
      }
      setStatus('error');
      setMessage(
        loadError instanceof Error
          ? loadError.message
          : 'Не удалось загрузить изображение.',
      );
    }
  };

  const ready = status === 'ready' && checkedUrl !== null;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
            size={15}
          />
          <Input
            id={id}
            aria-invalid={status === 'error'}
            aria-describedby={message ? errorId : helpText ? helpId : undefined}
            autoComplete="off"
            className="pl-9"
            disabled={disabled}
            inputMode="url"
            placeholder={placeholder}
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void check();
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || status === 'checking' || !value.trim()}
          onClick={() => void check()}
        >
          {status === 'checking' ? (
            <Loader2 className="animate-spin" size={14} />
          ) : ready ? (
            <CheckCircle2 size={14} />
          ) : null}
          {status === 'checking' ? 'Проверяем…' : 'Проверить'}
        </Button>
      </div>

      {message ? (
        <p
          id={errorId}
          className={cn(
            'flex items-center gap-1.5 text-xs',
            status === 'error' ? 'text-red-700' : 'text-emerald-700',
          )}
        >
          {status === 'error' ? <ImageOff size={13} /> : <CheckCircle2 size={13} />}
          {message}
        </p>
      ) : helpText ? (
        <p id={helpId} className="text-xs text-ink-500">
          {helpText}
        </p>
      ) : null}

      {ready && checkedUrl ? (
        <img
          alt="Предпросмотр изображения по ссылке"
          className="max-h-64 w-full rounded-md border border-paper-200 bg-paper-100 object-contain"
          data-testid={`${id}-preview`}
          referrerPolicy="no-referrer"
          src={checkedUrl}
        />
      ) : null}
    </div>
  );
}
