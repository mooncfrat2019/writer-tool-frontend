import * as React from 'react';
import { cn } from '@/shared/lib/utils';

const tones = {
  neutral: 'bg-paper-100 text-ink-700',
  accent: 'bg-accent-600/10 text-accent-700',
  success: 'bg-emerald-700/10 text-emerald-800',
  warning: 'bg-amber-600/10 text-amber-800',
  danger: 'bg-red-700/10 text-red-800',
} as const;

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
