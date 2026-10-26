import type * as React from 'react';
import { cn } from '@/shared/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-paper-200/80', className)}
      {...props}
    />
  );
}
