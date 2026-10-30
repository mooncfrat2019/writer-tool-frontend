import { Link } from '@tanstack/react-router';
import { BookOpen } from 'lucide-react';
import { useSession } from '@/features/auth/session';

export function SiteHeader() {
  const session = useSession();
  const authenticated = session.status === 'authenticated';

  return (
    <header className="sticky top-0 z-30 border-b border-paper-200 bg-paper-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link className="flex items-center gap-3" to="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink-900 text-paper-50">
            <BookOpen size={17} />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-none">Writer Tool</span>
            <span className="mt-1 hidden text-xs text-ink-500 sm:block">мастерская текста</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-ink-600 md:flex" aria-label="Разделы сайта">
          <Link className="hover:text-accent-700" to="/" hash="features">
            Возможности
          </Link>
          <Link className="hover:text-accent-700" to="/" hash="how">
            Как это работает
          </Link>
          <Link className="hover:text-accent-700" to="/pricing">
            Тарифы
          </Link>
          <Link className="hover:text-accent-700" to="/" hash="faq">
            Вопросы
          </Link>
        </nav>

        <Link
          className="inline-flex h-9 items-center justify-center rounded-md bg-ink-900 px-4 text-sm font-medium text-paper-50 hover:bg-ink-700"
          to={authenticated ? '/projects' : '/login'}
        >
          {authenticated ? 'Открыть приложение' : 'Войти'}
        </Link>
      </div>
    </header>
  );
}
