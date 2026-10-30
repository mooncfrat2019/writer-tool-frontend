import { BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import { LEGAL, LEGAL_LINKS } from '@/shared/legal';

type AuthLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthLayout({ eyebrow, title, description, children, footer }: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-paper-50 lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-ink-950 p-12 text-paper-50 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 top-24 h-96 w-96 rounded-full border border-paper-50/10" />
        <div className="absolute -right-6 top-48 h-64 w-64 rounded-full border border-accent-500/30" />
        <div className="relative flex items-center gap-3 text-sm uppercase tracking-[0.2em] text-paper-300">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-paper-50 text-ink-950">
            <BookOpen size={17} />
          </span>
          Writer Tool
        </div>
        <div className="relative max-w-lg py-16">
          <p className="font-serif text-5xl leading-[1.15] text-paper-50">
            Место, где книга собирается из тишины и точных слов.
          </p>
          <p className="mt-6 max-w-md text-base leading-relaxed text-paper-300">
            Структура, персонажи и рукопись живут рядом — без лишнего шума и лишних
            переключений.
          </p>
          <div className="mt-10 h-px w-24 bg-accent-500" />
          <p className="mt-4 text-sm text-paper-300">
            «Сначала — одна честная фраза. Остальное соберётся вокруг неё.»
          </p>
        </div>
        <p className="relative text-xs uppercase tracking-[0.18em] text-paper-300/60">
          Writer Tool · мастерская текста
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink-900 text-paper-50">
              <BookOpen size={15} />
            </span>
            <span className="text-sm font-semibold">Writer Tool</span>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-700">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-ink-900">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">{description}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-sm text-ink-500">{footer}</div>

          <div className="mt-10 space-y-1.5 border-t border-paper-200 pt-4 text-[11px] leading-relaxed text-ink-500">
            <p>
              {LEGAL.seller.status} {LEGAL.seller.fullName}, ИНН {LEGAL.seller.inn},{' '}
              г. {LEGAL.seller.city}
            </p>
            <p>
              <a className="hover:text-accent-700" href={`mailto:${LEGAL.contacts.email}`}>
                {LEGAL.contacts.email}
              </a>
              {' · '}
              <a
                className="hover:text-accent-700"
                href={`tel:${LEGAL.contacts.phone.replace(/[^\d+]/g, '')}`}
              >
                {LEGAL.contacts.phone}
              </a>
            </p>
            <p className="flex flex-wrap gap-x-3 gap-y-1">
              <a className="hover:text-accent-700" href={LEGAL_LINKS.offer}>
                Оферта
              </a>
              <a className="hover:text-accent-700" href={LEGAL_LINKS.terms}>
                Соглашение
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
