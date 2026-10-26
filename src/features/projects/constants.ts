import type { components } from '@/shared/api/schema';

export type ProjectRole = components['schemas']['ProjectRole'];

export const projectRoleLabels: Record<ProjectRole, string> = {
  owner: 'Владелец',
  editor: 'Редактор',
  viewer: 'Читатель',
};

export const languageLabels: Record<string, string> = {
  ru: 'Русский',
  en: 'English',
};
