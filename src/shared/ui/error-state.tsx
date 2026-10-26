import { AlertCircle } from 'lucide-react';
import { Button } from './button';

type ErrorStateProps = {
  title?: string;
  description: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'Не удалось загрузить данные',
  description,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50/60 px-5 py-6 text-sm text-red-900"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 shrink-0" size={18} />
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-red-800">{description}</p>
          {onRetry ? (
            <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>
              Повторить
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
