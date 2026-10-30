import { Link } from '@tanstack/react-router';
import { LEGAL, LEGAL_LINKS } from '@/shared/legal';

const legalLinks = [
  { to: LEGAL_LINKS.offer, label: 'Публичная оферта' },
  { to: LEGAL_LINKS.terms, label: 'Пользовательское соглашение' },
  { to: LEGAL_LINKS.cookies, label: 'Политика cookie' },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-paper-200 bg-paper-100/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-2 text-xs leading-relaxed text-ink-500">
          <p className="text-sm font-semibold text-ink-900">Writer Tool — мастерская текста</p>
          <p>
            {LEGAL.seller.status} {LEGAL.seller.fullName}, ИНН {LEGAL.seller.inn},{' '}
            г. {LEGAL.seller.city}
          </p>
          <p>{LEGAL.seller.postalAddress}</p>
          <p>
            <a className="hover:text-accent-700" href={`mailto:${LEGAL.contacts.email}`}>
              {LEGAL.contacts.email}
            </a>
            {' · '}
            <a className="hover:text-accent-700" href={`tel:${LEGAL.contacts.phone.replace(/[^\d+]/g, '')}`}>
              {LEGAL.contacts.phone}
            </a>
          </p>
          <p>Оплата через «РОБОКАССА». Платформа не получает данные банковской карты.</p>
          <p>© 2026 Writer Tool</p>
        </div>

        <nav className="flex flex-col gap-2 text-xs text-ink-600" aria-label="Юридические документы">
          {legalLinks.map((link) => (
            <Link
              key={link.to}
              className="w-fit underline-offset-4 hover:text-accent-700 hover:underline"
              to={link.to}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
