import { Link } from '@tanstack/react-router';
import { BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';

const legalLinks = [
  { to: '/legal/offer', label: 'Оферта' },
  { to: '/legal/terms', label: 'Соглашение' },
  { to: '/legal/privacy', label: 'Политика ПДн' },
  { to: '/legal/cookies', label: 'Cookie' },
] as const;

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

      <footer className="border-t border-paper-200 bg-paper-100/50">
        <div className="mx-auto max-w-5xl space-y-4 px-5 py-8 text-xs leading-relaxed text-ink-500 sm:px-8">
          <p className="text-ink-700">
            Самозанятый Коломойцев Игорь Сергеевич, ИНН 410201815392, г. Санкт-Петербург
          </p>
          <p>
            support@tool.melzix.net · +7 999 195-88-80
          </p>
          <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Юридические документы">
            {legalLinks.map((link) => (
              <Link
                key={link.to}
                className="underline-offset-4 hover:text-accent-700 hover:underline"
                to={link.to}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p>© 2026 Writer Tool</p>
        </div>
      </footer>
    </div>
  );
}
