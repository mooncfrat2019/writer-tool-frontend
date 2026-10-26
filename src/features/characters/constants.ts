import type { components } from '@/shared/api/schema';

export type CharacterRole = components['schemas']['CharacterRole'];
export type CharacterStatus = components['schemas']['CharacterStatus'];
export type RelationType = components['schemas']['RelationType'];

export const characterRoleLabels: Record<CharacterRole, string> = {
  protagonist: 'Протагонист',
  antagonist: 'Антагонист',
  deuteragonist: 'Второй главный',
  supporting: 'Второстепенный',
  minor: 'Эпизодический',
  other: 'Другой',
};

export const characterStatusLabels: Record<CharacterStatus, string> = {
  alive: 'Жив',
  dead: 'Погиб',
  missing: 'Пропал',
  unknown: 'Неизвестно',
};

export const characterStatusTones: Record<
  CharacterStatus,
  'success' | 'danger' | 'warning' | 'neutral'
> = {
  alive: 'success',
  dead: 'danger',
  missing: 'warning',
  unknown: 'neutral',
};

export const relationTypeLabels: Record<RelationType, string> = {
  family: 'Семья',
  friend: 'Друг',
  rival: 'Соперник',
  enemy: 'Враг',
  mentor: 'Наставник',
  romantic: 'Романтическая связь',
  ally: 'Союзник',
  other: 'Другое',
};

export const characterRoleOptions = Object.entries(characterRoleLabels) as [
  CharacterRole,
  string,
][];

export const characterStatusOptions = Object.entries(characterStatusLabels) as [
  CharacterStatus,
  string,
][];

export const relationTypeOptions = Object.entries(relationTypeLabels) as [
  RelationType,
  string,
][];

export const characterColorPalette = [
  '#8a5a2b',
  '#4a6a7a',
  '#7a4a5a',
  '#6d6a52',
  '#5a5a7a',
  '#7a624a',
];
