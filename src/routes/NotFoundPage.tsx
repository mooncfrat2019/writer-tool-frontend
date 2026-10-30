import { Link } from '@tanstack/react-router';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-50 p-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">404</p>
        <h1 className="mt-2 font-serif text-4xl">Страница не найдена</h1>
        <p className="mt-3 text-sm text-ink-500">
          Возможно, глава была удалена или ссылка устарела.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            className="inline-flex rounded-md bg-ink-900 px-4 py-2 text-sm font-medium text-paper-50 hover:bg-ink-700"
            to="/"
          >
            На главную
          </Link>
          <Link
            className="inline-flex rounded-md border border-paper-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-paper-100"
            to="/login"
          >
            Войти
          </Link>
        </div>
      </div>
    </main>
  );
}
