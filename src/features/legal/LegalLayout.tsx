import { Link } from '@tanstack/react-router';
import { BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/features/marketing/SiteFooter';

export function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper-50">
      <header className="border-b border-paper-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link className="flex items-center gap-3" to="/login">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink-900 text-paper-50">
              <BookOpen size={17} />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-none">Writer Tool</span>
              <span className="mt-1 hidden text-xs text-ink-500 sm:block">мастерская текста</span>
            </span>
          </Link>
          <Link
            className="text-sm font-medium text-accent-700 underline-offset-4 hover:underline"
            to="/login"
          >
            Войти
          </Link>
        </div>
      </header>

      {children}
      <SiteFooter />
    </div>
  );
}
