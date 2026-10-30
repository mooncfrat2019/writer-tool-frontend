import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import { useSession } from '@/features/auth/session';
import { FALLBACK_PLANS, planLimitRows } from '@/features/billing/planDisplay';
import { usePageMeta } from '@/shared/lib/usePageMeta';
import { formatProPrice, LEGAL, LEGAL_LINKS } from '@/shared/legal';
import { MarketingLayout } from './MarketingLayout';

export function PricingPage() {
  usePageMeta(
    'Тарифы Writer Tool — Free и Pro',
    'Тарифы Writer Tool: бесплатный тариф для небольшого романа и Pro за 299 ₽ в месяц или 2990 ₽ в год. Лимиты проектов, книг, персонажей и хранилища.',
  );

  const session = useSession();
  const authenticated = session.status === 'authenticated';
  const plansQuery = useQuery({
    queryKey: ['billing', 'plans', 'public'],
    queryFn: async () => unwrap(await api.GET('/billing/plans')),
    retry: 0,
  });
  const plans = plansQuery.data?.items ?? FALLBACK_PLANS;

  return (
    <MarketingLayout>
      <main>
        <section className="border-b border-paper-200 bg-white/40">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-700">
              Тарифы
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">
              Выберите масштаб мастерской
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-600">
              Бесплатный тариф рассчитан на небольшой роман. Pro — на серию книг с расширенными
              справочниками, хранилищем и совместной работой.
            </p>
            <p className="mt-4 text-sm text-ink-500">
              Цены в рублях. НДС не облагается (НПД). Автопродления нет.
            </p>
          </div>
        </section>

        <section className="border-b border-paper-200">
          <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
            <div className="grid gap-6 lg:grid-cols-2">
              {plans.map((plan) => {
                const isPro = plan.id === 'pro';
                const rows = planLimitRows(plan.limits);
                return (
                  <article
                    key={plan.id}
                    className={
                      isPro
                        ? 'rounded-xl border border-accent-300 bg-white p-6 shadow-[0_18px_50px_rgba(23,21,18,0.08)]'
                        : 'rounded-xl border border-paper-200 bg-paper-50 p-6'
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-ink-900">{plan.name}</h2>
                        <p className="mt-1 text-sm leading-relaxed text-ink-500">
                          {plan.description}
                        </p>
                      </div>
                      {isPro ? (
                        <span className="rounded-full bg-accent-600/10 px-2.5 py-1 text-xs font-medium text-accent-700">
                          Pro
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-6 border-y border-paper-200 py-4">
                      {isPro ? (
                        <>
                          <p className="font-serif text-4xl text-ink-900">
                            {formatProPrice('month')}
                          </p>
                          <p className="mt-1 text-sm text-ink-500">
                            или {formatProPrice('year')} при оплате за год
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-serif text-4xl text-ink-900">0 ₽</p>
                          <p className="mt-1 text-sm text-ink-500">
                            Бесплатно, без ограничения по времени
                          </p>
                        </>
                      )}
                    </div>

                    <ul className="mt-5 space-y-2.5">
                      {rows.map((row) => (
                        <li key={row.key} className="flex items-baseline justify-between gap-4">
                          <span className="text-sm text-ink-600">{row.label}</span>
                          <span className="text-right text-sm font-medium text-ink-900">
                            {row.value}
                          </span>
                        </li>
                      ))}
                      <li className="flex items-baseline justify-between gap-4">
                        <span className="text-sm text-ink-600">Изображения по ссылке</span>
                        <span className="text-right text-sm font-medium text-ink-900">
                          Доступны
                        </span>
                      </li>
                    </ul>

                    <a
                      className={
                        isPro
                          ? 'mt-7 inline-flex h-11 w-full items-center justify-center rounded-md bg-ink-900 px-5 text-sm font-medium text-paper-50 hover:bg-ink-700'
                          : 'mt-7 inline-flex h-11 w-full items-center justify-center rounded-md border border-paper-300 bg-white/70 px-5 text-sm font-medium text-ink-800 hover:bg-paper-100'
                      }
                      href={
                        isPro
                          ? authenticated
                            ? '/plans'
                            : '/login?redirect=%2Fplans'
                          : authenticated
                            ? '/projects'
                            : '/login'
                      }
                    >
                      {isPro
                        ? authenticated
                          ? 'Перейти к оплате Pro'
                          : 'Войти, чтобы подключить Pro'
                        : authenticated
                          ? 'Открыть приложение'
                          : 'Начать бесплатно'}
                    </a>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-ink-500">
              <a
                className="underline-offset-4 hover:text-accent-700 hover:underline"
                href={`${LEGAL_LINKS.offer}#payment`}
              >
                Условия оплаты
              </a>
              <a
                className="underline-offset-4 hover:text-accent-700 hover:underline"
                href={`${LEGAL_LINKS.offer}#refund`}
              >
                Возврат и компенсация
              </a>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-5 py-14 sm:px-8">
            <h2 className="font-serif text-3xl text-ink-900">Что входит в Pro</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                'До 20 проектов и 20 книг',
                'До 500 персонажей и 5000 событий таймлайна',
                '10 миров, 500 локаций, 200 фракций и 500 записей лора',
                'Около 175 авторских листов рукописи',
                '10 ГБ хранилища',
                'Совместная работа с приглашёнными участниками',
              ].map((item) => (
                <p key={item} className="flex items-start gap-2 text-sm text-ink-600">
                  <Check className="mt-0.5 shrink-0 text-accent-700" size={16} />
                  {item}
                </p>
              ))}
            </div>
            <p className="mt-8 text-sm leading-relaxed text-ink-500">
              Оплата проходит через «РОБОКАССА». Платформа не получает и не хранит полные данные
              банковской карты. Условия предоставления доступа, возврата и компенсации при
              техническом сбое описаны в{' '}
              <a
                className="text-accent-700 underline-offset-4 hover:underline"
                href={LEGAL_LINKS.offer}
              >
                публичной оферте
              </a>
              . Вопросы — на{' '}
              <a className="text-accent-700 hover:underline" href={`mailto:${LEGAL.contacts.email}`}>
                {LEGAL.contacts.email}
              </a>
              .
            </p>
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}
