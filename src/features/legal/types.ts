export type LegalBlock =
  | { type: 'h2'; text: string; id?: string; aliases?: string[] }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] };

export type LegalDocument = {
  slug: string;
  title: string;
  subtitle?: string;
  version: string;
  updatedAt: string;
  blocks: LegalBlock[];
};
