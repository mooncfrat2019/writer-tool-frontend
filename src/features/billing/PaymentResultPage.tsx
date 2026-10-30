import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useSession } from '@/features/auth/session';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import { usePageMeta } from '@/shared/lib/usePageMeta';
import { MarketingLayout } from '@/features/marketing/MarketingLayout';

function formatPlanDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function PaymentState({
  title,
  children,
  tone,
}: {
  title: string;
  children: ReactNode;
  tone: 'success' | 'pending' | 'error';
}) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'pending' ? Loader2 : AlertCircle;
  const iconClass =
    tone === 'success'
      ? 'text-emerald-700'
      : tone === 'pending'
        ? 'animate-spin text-accent-700'
        : 'text-red-700';

  return (
    <div className="rounded-xl border border-paper-200 bg-white p-7 shadow-[0_18px_50px_rgba(23,21,18,0.06)] sm:p-9">
      <Icon aria-hidden="true" className={iconClass} size={30} />
      <h1 className="mt-4 font-serif text-3xl leading-tight text-ink-900">{title}</h1>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-ink-600">{children}</div>
    </div>
  );
}

function PaymentActions() {
  return (
    <div className="mt-7 flex flex-wrap gap-3">
      <Link
        className="inline-flex h-10 items-center justify-center rounded-md bg-ink-900 px-4 text-sm font-medium text-paper-50 hover:bg-ink-700"
        to="/projects"
      >
        Перейти в приложение
      </Link>
      <Link
        className="inline-flex h-10 items-center justify-center rounded-md border border-ink-300 bg-white px-4 text-sm font-medium text-ink-800 hover:bg-paper-100"
        to="/plans"
      >
        К тарифам
      </Link>
    </div>
  );
}

export function PaymentSuccessPage() {
  usePageMeta(
    'Оплата Pro — Writer Tool',
    'Подтверждение оплаты тарифа Pro Writer Tool.',
    true,
  );
  const session = useSession();
  const queryClient = useQueryClient();
  const search = useLocation({ select: (location) => location.searchStr });
  const params = new URLSearchParams(search);
  const rawInvoice = params.get('InvId') ?? params.get('invId');
  const invoiceId =
    rawInvoice && /^\d+$/.test(rawInvoice) && Number.isSafeInteger(Number(rawInvoice))
      ? Number(rawInvoice)
      : null;

  const paymentQuery = useQuery({
    queryKey: ['billing', 'payment', invoiceId],
    queryFn: async () =>
      unwrap(
        await api.GET('/billing/payments/{invoiceId}', {
          params: { path: { invoiceId: invoiceId as number } },
        }),
      ),
    enabled: invoiceId !== null && session.status === 'authenticated',
    retry: 1,
    refetchInterval: (query) => {
      if (query.state.status === 'error') {
        return false;
      }
      const status = query.state.data?.status;
      return status === 'paid' || status === 'failed' ? false : 3000;
    },
  });

  useEffect(() => {
    if (paymentQuery.data?.status === 'paid') {
      void queryClient.invalidateQueries({ queryKey: ['billing', 'me'] });
    }
  }, [paymentQuery.data?.status, queryClient]);

  if (invoiceId === null) {
    return (
      <MarketingLayout>
        <main className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
          <PaymentState title="Не указан номер платежа" tone="error">
            <p>
              Robokassa вернула на страницу без номера заказа. Если деньги
              списались, напишите на support@tool.melzix.net — мы проверим
              платёж по вашей почте и времени оплаты.
            </p>
            <PaymentActions />
          </PaymentState>
        </main>
      </MarketingLayout>
    );
  }

  if (session.status === 'unauthenticated') {
    return (
      <MarketingLayout>
        <main className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
          <PaymentState title="Войдите в аккаунт" tone="pending">
            <p>
              Платёж №{invoiceId} уже создан. Войдите в тот аккаунт, с которого
              начали оплату, чтобы увидеть статус и обновить тариф.
            </p>
            <a
              className="inline-flex h-10 items-center justify-center rounded-md bg-ink-900 px-4 text-sm font-medium text-paper-50 hover:bg-ink-700"
              href={`/login?redirect=${encodeURIComponent(`/payment/success?InvId=${invoiceId}`)}`}
            >
              Войти
            </a>
          </PaymentState>
        </main>
      </MarketingLayout>
    );
  }

  if (paymentQuery.isPending) {
    return (
      <MarketingLayout>
        <main className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
          <PaymentState title="Проверяем платёж" tone="pending">
            <p>Запрашиваем статус заказа №{invoiceId} у Robokassa.</p>
          </PaymentState>
        </main>
      </MarketingLayout>
    );
  }

  if (paymentQuery.isError) {
    return (
      <MarketingLayout>
        <main className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
          <PaymentState title="Платёж не найден" tone="error">
            <p>
              Заказ №{invoiceId} не относится к текущему аккаунту или ещё не
              создан. Проверьте, что вы вошли с того же аккаунта, с которого
              начали оплату.
            </p>
            <p>
              Если деньги списались, а доступа нет, напишите на
              support@tool.melzix.net и укажите номер платежа.
            </p>
            <PaymentActions />
          </PaymentState>
        </main>
      </MarketingLayout>
    );
  }

  const payment = paymentQuery.data;
  if (payment.status === 'paid') {
    return (
      <MarketingLayout>
        <main className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
          <PaymentState title="Оплата подтверждена" tone="success">
            <p>
              Доступ к тарифу Pro активирован
              {payment.planExpiresAt
                ? ` до ${formatPlanDate(payment.planExpiresAt)}`
                : ''}
              .
            </p>
            <p>
              Платёж №{payment.invoiceId}. Чек НПД Robokassa направит на
              контакт, указанный при оплате.
            </p>
            <PaymentActions />
          </PaymentState>
        </main>
      </MarketingLayout>
    );
  }

  if (payment.status === 'failed') {
    return (
      <MarketingLayout>
        <main className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
          <PaymentState title="Платёж не прошёл" tone="error">
            <p>
              Robokassa не подтвердила оплату заказа №{payment.invoiceId}.
              Деньги не списаны, доступ к Pro не изменился.
            </p>
            <PaymentActions />
          </PaymentState>
        </main>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <main className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
        <PaymentState title="Платёж обрабатывается" tone="pending">
          <p>
            Robokassa ещё подтверждает оплату заказа №{payment.invoiceId}.
            Обычно это занимает несколько секунд. Страница обновится
            автоматически.
          </p>
          <p className="text-xs text-ink-500">
            Не закрывайте страницу и не оплачивайте повторно. Если статус не
            изменился через несколько минут, напишите на support@tool.melzix.net.
          </p>
        </PaymentState>
      </main>
    </MarketingLayout>
  );
}

export function PaymentFailPage() {
  usePageMeta(
    'Платёж не завершён — Writer Tool',
    'Оплата тарифа Pro не была завершена.',
    true,
  );

  return (
    <MarketingLayout>
      <main className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
        <PaymentState title="Платёж не завершён" tone="error">
          <p>
            Robokassa вернула на страницу отмены. Деньги не списаны, доступ к
            Pro не изменился.
          </p>
          <p>
            Можно вернуться к тарифам и попробовать снова. Если на карте
            осталась блокировка суммы, она снимется автоматически по правилам
            банка.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-ink-900 px-4 text-sm font-medium text-paper-50 hover:bg-ink-700"
              to="/plans"
            >
              Вернуться к тарифам
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-ink-300 bg-white px-4 text-sm font-medium text-ink-800 hover:bg-paper-100"
              to="/"
            >
              На главную
            </Link>
          </div>
        </PaymentState>
      </main>
    </MarketingLayout>
  );
}
