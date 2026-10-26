import { cn } from '@/shared/lib/utils';

type ProgressProps = {
  value: number;
  label?: string;
  className?: string;
};

export function Progress({ value, label = 'Прогресс', className }: ProgressProps) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-paper-200', className)}
    >
      <div
        className="h-full rounded-full bg-accent-500 transition-[width] duration-500"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
