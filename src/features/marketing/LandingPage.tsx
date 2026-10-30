import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  Download,
  Globe2,
  Layers,
  PenLine,
  Search,
  Users,
} from 'lucide-react';
import { useSession } from '@/features/auth/session';
import { FALLBACK_PLANS, planLimitRows } from '@/features/billing/planDisplay';
import { usePageMeta } from '@/shared/lib/usePageMeta';
import { formatProPrice, LEGAL, LEGAL_LINKS } from '@/shared/legal';
import { MarketingLayout } from './MarketingLayout';

const features = [
  {
    icon: Layers,
    title: 'Структура книги',
    text: 'Части, главы и сцены с синопсисами, статусами и целевым объёмом. Порядок меняется перетаскиванием.',
  },
  {
    icon: PenLine,
    title: 'Редактор с автосохранением',
    text: 'Счётчик слов, режим сосредоточения и история версий — текст сохраняется по мере работы.',
  },
  {
    icon: Users,
    title: 'Персонажи и связи',
    text: 'Карточки героев, портреты по ссылкам и схема отношений, которая не теряется между главами.',
  },
  {
    icon: Globe2,
    title: 'Миры и локации',
    text: 'Миры, локации, фракции и записи лора собраны в справочники, доступные прямо из редактора.',
  },
  {
    icon: CalendarClock,
    title: 'Таймлайн событий',
    text: 'Хронология книги и серии, привязка событий к персонажам, локациям и сюжетным линиям.',
  },
  {
    icon: Download,
    title: 'Экспорт DOCX и FB2',
    text: 'Рукопись выгружается с оглавлением и параметрами форматирования, когда книга готова.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Войдите в мастерскую',
    text: 'Через Яндекс ID или VK ID. Отдельный пароль не нужен, публичная регистрация по почте не требуется.',
  },
  {
    number: '02',
    title: 'Создайте проект',
    text: 'Разложите будущую книгу на части и главы, добавьте персонажей, мир и ключевые события.',
  },
  {
    number: '03',
    title: 'Пишите и выгружайте',
    text: 'Работайте в редакторе, возвращайтесь к структуре и экспортируйте готовый текст в DOCX или FB2.',
  },
];

const faq = [
  {
    question: 'Как создаётся аккаунт?',
    answer:
      'Аккаунт создаётся при первом входе через Яндекс ID или VK ID. Публичной регистрации по email и паролю нет. При первом входе принимаются оферта и пользовательское соглашение.',
  },
  {
    question: 'Нужно ли указывать настоящее имя?',
    answer:
      'Нет. Сервис создаёт уникальный литературный псевдоним, под которым вас видят участники проектов. Настоящее имя, email и аватар провайдера не сохраняются.',
  },
  {
    question: 'Есть ли бесплатный тариф?',
    answer:
      'Да. Бесплатный тариф рассчитан на небольшую книгу. Тариф Pro расширяет лимиты проектов, книг, персонажей, справочников и хранилища.',
  },
  {
    question: 'Где хранятся рукописи?',
    answer:
      'Проекты и рукописи хранятся на серверах в Российской Федерации. Доступ к ним есть только у вас и участников, которых вы пригласили.',
  },
  {
    question: 'Как оплатить Pro и вернуть деньги?',
    answer:
      'Оплата проходит через «РОБОКАССА». Условия оплаты, возврата и компенсации при техническом сбое описаны в публичной оферте. Автопродления нет.',
  },
  {
    question: 'Как связаться с поддержкой?',
    answer: `Напишите на ${LEGAL.contacts.email} или позвоните по телефону ${LEGAL.contacts.phone}. Отвечаем в рабочие дни, срок ответа — до 10 рабочих дней.`,
  },
];

export function LandingPage() {
  usePageMeta(
    'Writer Tool — мастерская текста для авторов',
    'Структура книги, редактор с автосохранением, персонажи, миры, таймлайн и экспорт рукописи в DOCX и FB2.',
  );
  const session = useSession();
  const authenticated = session.status === 'authenticated';
  const free = FALLBACK_PLANS.find((plan) => plan.id === 'free') ?? FALLBACK_PLANS[0];
  const pro = FALLBACK_PLANS.find((plan) => plan.id === 'pro') ?? FALLBACK_PLANS[1];

  return (
    <MarketingLayout>
      <main>
        <section className="relative overflow-hidden border-b border-paper-200">
          <div className="absolute -right-32 top-10 h-96 w-96 rounded-full border border-paper-300/50" />
          <div className="absolute -right-10 top-32 h-64 w-64 rounded-full border border-accent-500/20" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent-700">
                Мастерская текста для авторов
              </p>
              <h1 className="mt-5 max-w-2xl font-serif text-4xl leading-[1.12] text-ink-900 sm:text-6xl">
                Место, где книга собирается из тишины и точных слов.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-600">
                Writer Tool держит рядом структуру, персонажей, миры и рукопись. Без лишнего
                шума, переключений и потерянных версий текста.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink-900 px-6 text-sm font-medium text-paper-50 hover:bg-ink-700"
                  to={authenticated ? '/projects' : '/login'}
                >
                  {authenticated ? 'Открыть приложение' : 'Войти и начать'}
                  <ArrowRight size={16} />
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-md border border-paper-300 bg-white/70 px-6 text-sm font-medium text-ink-800 hover:bg-paper-100"
                  to="/pricing"
                >
                  Посмотреть тарифы
                </Link>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-500">
                {['Бесплатный тариф', 'Экспорт DOCX и FB2', 'Совместная работа'].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <Check className="text-accent-700" size={14} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="rounded-xl border border-paper-300 bg-white/70 p-2 shadow-[0_24px_60px_rgba(23,21,18,0.12)]">
                <img
                  alt="Библиотека проектов Writer Tool"
                  className="w-full rounded-lg border border-paper-200"
                  height="900"
                  loading="eager"
                  src="/screens/01-projects.png"
                  width="1440"
                />
              </div>
              <p className="mt-3 text-right text-xs text-ink-500">
                Проекты, книги и рукописи в одном пространстве
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 border-b border-paper-200 bg-white/40">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-700">
              Возможности
            </p>
            <h2 className="mt-3 max-w-2xl font-serif text-3xl text-ink-900 sm:text-4xl">
              Всё, что нужно, чтобы довести книгу до конца
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-500">
              Инструменты собраны вокруг рукописи, а не вокруг интерфейса. Можно думать о тексте,
              а не о том, куда нажать.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article
                    key={feature.title}
                    className="rounded-lg border border-paper-200 bg-paper-50 p-5"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-600/10 text-accent-700">
                      <Icon size={19} />
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-ink-900">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-500">{feature.text}</p>
                  </article>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-500">
              <span className="flex items-center gap-1.5">
                <Search size={14} /> Поиск по материалам проекта
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={14} /> Приглашения участников и роли
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen size={14} /> Библиотека книг и серий
              </span>
            </div>
          </div>
        </section>

        <section id="how" className="scroll-mt-24 border-b border-paper-200">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-700">
              Как это работает
            </p>
            <h2 className="mt-3 font-serif text-3xl text-ink-900 sm:text-4xl">
              Три шага до первой главы
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <article key={step.number} className="border-t border-paper-300 pt-5">
                  <p className="font-serif text-3xl text-accent-600">{step.number}</p>
                  <h3 className="mt-3 text-base font-semibold text-ink-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-paper-200 bg-white/40">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2">
            <figure className="rounded-lg border border-paper-200 bg-paper-50 p-2">
              <img
                alt="Редактор Writer Tool с рукописью"
                className="w-full rounded-md border border-paper-200"
                height="900"
                loading="lazy"
                src="/screens/03-editor.png"
                width="1440"
              />
              <figcaption className="px-2 py-3 text-xs text-ink-500">
                Редактор с автосохранением, счётчиком слов и режимом сосредоточения.
              </figcaption>
            </figure>
            <figure className="rounded-lg border border-paper-200 bg-paper-50 p-2">
              <img
                alt="Карточки персонажей Writer Tool"
                className="w-full rounded-md border border-paper-200"
                height="900"
                loading="lazy"
                src="/screens/04-characters.png"
                width="1440"
              />
              <figcaption className="px-2 py-3 text-xs text-ink-500">
                Персонажи, связи, портреты и детали, которые важно не потерять.
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 border-b border-paper-200">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-700">
                  Тарифы
                </p>
                <h2 className="mt-3 font-serif text-3xl text-ink-900 sm:text-4xl">
                  Начните бесплатно, расширьте, когда понадобится
                </h2>
              </div>
              <Link
                className="text-sm font-medium text-accent-700 underline-offset-4 hover:underline"
                to="/pricing"
              >
                Все лимиты и условия
              </Link>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {[free, pro].map((plan) => {
                const isPro = plan.id === 'pro';
                return (
                  <article
                    key={plan.id}
                    className={
                      isPro
                        ? 'rounded-lg border border-accent-300 bg-white p-6 shadow-sm'
                        : 'rounded-lg border border-paper-200 bg-paper-50 p-6'
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-ink-900">{plan.name}</h3>
                        <p className="mt-1 text-sm text-ink-500">{plan.description}</p>
                      </div>
                      {isPro ? (
                        <span className="rounded-full bg-accent-600/10 px-2 py-0.5 text-xs font-medium text-accent-700">
                          Pro
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-5 font-serif text-3xl text-ink-900">
                      {isPro ? formatProPrice('month') : '0 ₽'}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      {isPro
                        ? `${formatProPrice('year')} · НДС не облагается (НПД)`
                        : 'Бесплатно, без ограничения по времени'}
                    </p>
                    <ul className="mt-5 space-y-2">
                      {planLimitRows(plan.limits)
                        .slice(0, 6)
                        .map((row) => (
                          <li key={row.key} className="flex items-baseline justify-between gap-4">
                            <span className="text-sm text-ink-600">{row.label}</span>
                            <span className="text-right text-sm font-medium text-ink-900">
                              {row.value}
                            </span>
                          </li>
                        ))}
                    </ul>
                    <a
                      className={
                        isPro
                          ? 'mt-6 inline-flex h-10 w-full items-center justify-center rounded-md bg-ink-900 px-4 text-sm font-medium text-paper-50 hover:bg-ink-700'
                          : 'mt-6 inline-flex h-10 w-full items-center justify-center rounded-md border border-paper-300 bg-white/70 px-4 text-sm font-medium text-ink-800 hover:bg-paper-100'
                      }
                      href={isPro ? '/login?redirect=%2Fplans' : '/login'}
                    >
                      {isPro ? 'Войти, чтобы подключить Pro' : 'Начать бесплатно'}
                    </a>
                  </article>
                );
              })}
            </div>
            <p className="mt-6 text-xs leading-relaxed text-ink-500">
              Оплата Pro проходит через «РОБОКАССА». Автопродления нет. Условия оплаты и возврата —
              в{' '}
              <a
                className="text-accent-700 underline-offset-4 hover:underline"
                href={`${LEGAL_LINKS.offer}#payment`}
              >
                публичной оферте
              </a>
              .
            </p>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 border-b border-paper-200 bg-white/40">
          <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-700">
              Вопросы
            </p>
            <h2 className="mt-3 font-serif text-3xl text-ink-900 sm:text-4xl">
              Коротко о важном
            </h2>
            <div className="mt-8 divide-y divide-paper-200 border-y border-paper-200">
              {faq.map((item) => (
                <details key={item.question} className="group py-4">
                  <summary className="cursor-pointer list-none text-sm font-medium text-ink-900 marker:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {item.question}
                      <span className="text-accent-700 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-500">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto flex max-w-4xl flex-col items-start gap-5 px-5 py-16 sm:px-8 sm:py-20">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-700">
              Начать
            </p>
            <h2 className="max-w-2xl font-serif text-3xl text-ink-900 sm:text-4xl">
              Первая глава начинается с одного честного предложения.
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-ink-500">
              Войдите через Яндекс ID или VK ID и создайте пространство для книги. Бесплатного
              тарифа достаточно, чтобы попробовать.
            </p>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink-900 px-6 text-sm font-medium text-paper-50 hover:bg-ink-700"
              to={authenticated ? '/projects' : '/login'}
            >
              {authenticated ? 'Открыть приложение' : 'Войти в мастерскую'}
              <ArrowRight size={16} />
            </Link>
            <p className="text-xs text-ink-500">
              Контакты:{' '}
              <a className="text-accent-700 hover:underline" href={`mailto:${LEGAL.contacts.email}`}>
                {LEGAL.contacts.email}
              </a>{' '}
              ·{' '}
              <a
                className="text-accent-700 hover:underline"
                href={`tel:${LEGAL.contacts.phone.replace(/[^\d+]/g, '')}`}
              >
                {LEGAL.contacts.phone}
              </a>
            </p>
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}
