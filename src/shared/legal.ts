/**
 * Public seller, pricing and document data. Keep this file as the single
 * source for the landing page, pricing, footer and auth consent links.
 */
export const LEGAL_VERSIONS = {
  offerVersion: '2026-10-31',
  termsVersion: '2026-10-31',
} as const;

export const LEGAL_LINKS = {
  offer: '/legal/offer',
  terms: '/legal/terms',
  cookies: '/legal/cookies',
} as const;

export const LEGAL = {
  siteUrl: 'https://tool.melzix.net',
  seller: {
    status: 'Самозанятый',
    fullName: 'Коломойцев Игорь Сергеевич',
    inn: '410201815392',
    city: 'Санкт-Петербург',
    postalAddress:
      '196628, Санкт-Петербург, п. Шушары, тер. Славянка, Колпинское ш., д. 38, к. 1, литера А, а/я 7',
  },
  contacts: {
    email: 'support@tool.melzix.net',
    phone: '+7 931 706-70-55',
  },
  pro: {
    priceMonthlyRub: 399,
    priceYearlyRub: 3990,
    autoRenew: false,
  },
} as const;

export function formatRub(value: number): string {
  return `${value} ₽`;
}

export function formatProPrice(period: 'month' | 'year' = 'month'): string {
  const value = period === 'month' ? LEGAL.pro.priceMonthlyRub : LEGAL.pro.priceYearlyRub;
  return `${formatRub(value)}/${period === 'month' ? 'мес' : 'год'}`;
}

export function formatProPriceBoth(): string {
  return `${formatProPrice('month')} или ${formatProPrice('year')}`;
}
