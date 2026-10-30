/**
 * Versions of the public documents a user accepts before OAuth sign-in.
 * Bump these together with the published legal texts.
 */
export const LEGAL_VERSIONS = {
  offerVersion: '2026-10-30',
  termsVersion: '2026-10-30',
} as const;

export const LEGAL_LINKS = {
  offer: '/legal/offer',
  terms: '/legal/terms',
  privacy: '/legal/privacy',
  cookies: '/legal/cookies',
} as const;
