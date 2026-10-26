import { BookOpen } from 'lucide-react';

export function SplashScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-50 p-6">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-ink-900 text-paper-50">
          <BookOpen size={22} />
        </span>
        <p className="mt-5 font-serif text-2xl text-ink-900">Writer Tool</p>
        <p className="mt-2 text-sm text-ink-500">Открываем вашу мастерскую…</p>
      </div>
    </main>
  );
}
