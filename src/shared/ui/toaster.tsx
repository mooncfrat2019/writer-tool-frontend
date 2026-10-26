import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'border border-paper-200 bg-paper-50 text-ink-900 shadow-lg font-sans text-sm',
          description: 'text-ink-500',
          actionButton: 'bg-ink-900 text-paper-50',
          cancelButton: 'bg-paper-100 text-ink-900',
          error: 'border-red-200 bg-red-50 text-red-900',
          success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
        },
      }}
    />
  );
}
