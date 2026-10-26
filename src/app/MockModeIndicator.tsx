import { useQueryClient } from '@tanstack/react-query';
import { FlaskConical, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { clearSessionState } from '@/features/auth/session';
import { resetMockData } from '@/shared/mocks/store';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

const isMockMode =
  import.meta.env.DEV && (import.meta.env.VITE_API_MODE ?? 'mock') === 'mock';

export function MockModeIndicator() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  if (!isMockMode) {
    return null;
  }

  const reset = () => {
    resetMockData();
    clearSessionState();
    queryClient.clear();
    window.location.assign('/login');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 left-3 z-40 inline-flex items-center gap-1.5 rounded-full border border-paper-300 bg-paper-50/95 px-3 py-1.5 text-[11px] font-medium text-ink-500 shadow-sm backdrop-blur transition hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        title="Демо-режим: данные хранятся в браузере"
      >
        <FlaskConical size={13} />
        Демо-данные
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Демо-режим</DialogTitle>
            <DialogDescription>
              Приложение работает на локальном мок-API. Проекты, рукописи,
              персонажи и экспорты сохраняются только в этом браузере.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-paper-200 bg-paper-100/60 px-3 py-2 text-xs leading-relaxed text-ink-500">
            Демо-аккаунт: author@example.com / password123. Сброс удалит все
            изменения и вернёт исходные примеры.
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Закрыть
            </Button>
            <Button type="button" variant="destructive" onClick={reset}>
              <RotateCcw size={15} />
              Сбросить демо
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
