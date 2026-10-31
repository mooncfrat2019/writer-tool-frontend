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

export type LegalProfile = {
  siteUrl: string;
  email: string;
};

const DEFAULT_LEGAL_PROFILE: LegalProfile = {
  siteUrl: 'https://tool.melzix.net',
  email: 'support@tool.melzix.net',
};

const LEGAL_PROFILES: Record<string, LegalProfile> = {
  'writer-tool.ru': {
    siteUrl: 'https://writer-tool.ru',
    email: 'support@writer-tool.ru',
  },
  'www.writer-tool.ru': {
    siteUrl: 'https://writer-tool.ru',
    email: 'support@writer-tool.ru',
  },
};

export function legalProfileForHost(hostname: string): LegalProfile {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  return LEGAL_PROFILES[normalized] ?? DEFAULT_LEGAL_PROFILE;
}

const currentLegalProfile = legalProfileForHost(
  typeof window === 'undefined' ? '' : window.location.hostname,
);

export const LEGAL = {
  siteUrl: currentLegalProfile.siteUrl,
  seller: {
    status: 'Самозанятый',
    fullName: 'Коломойцев Игорь Сергеевич',
    inn: '410201815392',
    city: 'Санкт-Петербург',
    postalAddress:
      '196628, Санкт-Петербург, п. Шушары, тер. Славянка, Колпинское ш., д. 38, к. 1, литера А, а/я 7',
  },
  contacts: {
    email: currentLegalProfile.email,
    phone: '+7 931 706-70-55',
  },
  pro: {
    priceMonthlyRub: 399,
    priceYearlyRub: 3990,
    autoRenew: false,
  },
} as const;

// Legal documents keep the original domain as a placeholder in their source
// strings. Replace it with the profile for the host that is serving the page.
export function localizeLegalText(
  text: string,
  profile: LegalProfile = currentLegalProfile,
): string {
  return text
    .split(DEFAULT_LEGAL_PROFILE.siteUrl)
    .join(profile.siteUrl)
    .split(DEFAULT_LEGAL_PROFILE.email)
    .join(profile.email);
}

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
