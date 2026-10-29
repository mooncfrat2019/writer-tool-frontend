import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { BookOpen, CreditCard } from 'lucide-react';
import { UserMenu } from '@/features/auth/UserMenu';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { Badge } from '@/shared/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Progress } from '@/shared/ui/progress';

type BillingCounters = components['schemas']['BillingCounters'];
type BillingMe = components['schemas']['BillingMe'];
type BillingPlan = components['schemas']['BillingPlan'];

const AUTHOR_SHEET = 40_000;

function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU');
}

function formatAuthorSheets(characters: number): string {
  const sheets = characters / AUTHOR_SHEET;
  return `${formatNumber(characters)} символов · ${sheets.toLocaleString('ru-RU', {
    maximumFractionDigits: 1,
  })} а.л.`;
}

function formatBytes(bytes: number): string {
  const gibibyte = 1024 ** 3;
  if (bytes >= gibibyte) {
    return `${(bytes / gibibyte).toLocaleString('ru-RU', {
      maximumFractionDigits: 1,
    })} ГБ`;
  }
  return `${Math.round(bytes / 1024 / 1024)} МБ`;
}

type LimitRowProps = {
  label: string;
  limit: string;
  used?: string;
  progress?: number;
};

function LimitRow({ label, limit, used, progress }: LimitRowProps) {
  return (
    <div className="space-y-1.5 border-b border-paper-100 py-2.5 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-ink-600">{label}</span>
        <span className="text-right text-sm font-medium text-ink-900">
          {limit}
        </span>
      </div>
      {used ? (
        <div className="space-y-1">
          <span className="text-xs text-ink-500">Использовано: {used}</span>
          {progress !== undefined ? (
            <Progress value={progress} label={`${label}: использование`} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type PlanCardProps = {
  plan: BillingPlan;
  current: BillingMe | undefined;
};

function PlanCard({ plan, current }: PlanCardProps) {
  const isCurrent = current?.plan === plan.id;
  const limits = plan.limits;
  const usage: BillingCounters | undefined = isCurrent ? current?.usage : undefined;
  const share = (used: number, limit: number) =>
    limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <Card
      className={
        isCurrent ? 'border-accent-300 bg-white shadow-sm' : 'bg-white/60'
      }
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="text-accent-700" size={18} />
            <CardTitle>{plan.name}</CardTitle>
          </div>
          {isCurrent ? <Badge tone="accent">Текущий тариф</Badge> : null}
        </div>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <LimitRow
            label="Проекты"
            limit={formatNumber(limits.projects)}
            used={usage ? formatNumber(usage.projects) : undefined}
            progress={usage ? share(usage.projects, limits.projects) : undefined}
          />
          <LimitRow
            label="Книги"
            limit={formatNumber(limits.books)}
            used={usage ? formatNumber(usage.books) : undefined}
            progress={usage ? share(usage.books, limits.books) : undefined}
          />
          <LimitRow
            label="Персонажи"
            limit={formatNumber(limits.characters)}
            used={usage ? formatNumber(usage.characters) : undefined}
            progress={usage ? share(usage.characters, limits.characters) : undefined}
          />
          <LimitRow
            label="События таймлайна"
            limit={formatNumber(limits.timelineEvents)}
            used={usage ? formatNumber(usage.timelineEvents) : undefined}
            progress={
              usage ? share(usage.timelineEvents, limits.timelineEvents) : undefined
            }
          />
          <LimitRow
            label="Миры"
            limit={formatNumber(limits.worlds)}
            used={usage ? formatNumber(usage.worlds) : undefined}
            progress={usage ? share(usage.worlds, limits.worlds) : undefined}
          />
          <LimitRow
            label="Локации"
            limit={formatNumber(limits.locations)}
            used={usage ? formatNumber(usage.locations) : undefined}
            progress={usage ? share(usage.locations, limits.locations) : undefined}
          />
          <LimitRow
            label="Фракции"
            limit={formatNumber(limits.factions)}
            used={usage ? formatNumber(usage.factions) : undefined}
            progress={usage ? share(usage.factions, limits.factions) : undefined}
          />
          <LimitRow
            label="Записи лора"
            limit={formatNumber(limits.loreEntries)}
            used={usage ? formatNumber(usage.loreEntries) : undefined}
            progress={usage ? share(usage.loreEntries, limits.loreEntries) : undefined}
          />
          <LimitRow
            label="Объём рукописи"
            limit={formatAuthorSheets(limits.manuscriptCharacters)}
            used={
              usage
                ? formatAuthorSheets(usage.manuscriptCharacters)
                : undefined
            }
            progress={
              usage
                ? share(usage.manuscriptCharacters, limits.manuscriptCharacters)
                : undefined
            }
          />
          <LimitRow
            label="Хранилище"
            limit={formatBytes(limits.storageBytes)}
            used={usage ? formatBytes(usage.storageBytes) : undefined}
            progress={usage ? share(usage.storageBytes, limits.storageBytes) : undefined}
          />
          <LimitRow label="Изображения по ссылке" limit="Доступны" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PlansPage() {
  const plansQuery = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: async () => unwrap(await api.GET('/billing/plans')),
  });
  const meQuery = useQuery({
    queryKey: ['billing', 'me'],
    queryFn: async () => unwrap(await api.GET('/billing/me')),
    retry: false,
  });

  return (
    <div className="min-h-screen bg-paper-50">
      <header className="border-b border-paper-200 bg-paper-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link className="flex items-center gap-3" to="/projects">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink-900 text-paper-50">
              <BookOpen size={17} />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-none">
                Writer Tool
              </span>
              <span className="mt-1 hidden text-xs text-ink-500 sm:block">
                мастерская текста
              </span>
            </span>
          </Link>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-700">
          Тарифы
        </p>
        <h1 className="mt-3 font-serif text-3xl text-ink-900 sm:text-4xl">
          Выберите масштаб мастерской
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-base">
          Бесплатный тариф рассчитан на небольшой роман. Профессиональный —
          на серию из десяти и более полноценных книг с расширенными
          справочниками и хранилищем.
        </p>

        {plansQuery.isLoading ? (
          <p className="mt-10 text-sm text-ink-500" role="status">
            Загружаем тарифы…
          </p>
        ) : null}

        {plansQuery.isError ? (
          <p
            className="mt-10 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            Не удалось загрузить тарифы. Обновите страницу.
          </p>
        ) : null}

        {plansQuery.data ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {plansQuery.data.items.map((plan) => (
              <PlanCard key={plan.id} plan={plan} current={meQuery.data} />
            ))}
          </div>
        ) : null}

        <div className="mt-8 space-y-2 text-xs leading-relaxed text-ink-500">
          <p>
            Лимиты на проекты, книги, персонажей, события, миры, локации,
            фракции, лор и хранилище применяются автоматически. Ограничение
            объёма рукописи пока справочное — оно появится вместе с подпиской.
          </p>
          <p>
            Самостоятельная оплата ещё не подключена: тариф переключает
            администратор.
          </p>
        </div>
      </main>
    </div>
  );
}
