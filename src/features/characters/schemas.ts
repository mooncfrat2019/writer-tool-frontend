import { z } from 'zod';
import type { components } from '@/shared/api/schema';

const optionalText = (max: number, label: string) =>
  z.string().max(max, `${label} не длиннее ${max} символов`);

export const characterCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Введите имя персонажа')
    .max(200, 'Имя не длиннее 200 символов'),
  fullName: optionalText(200, 'Полное имя'),
  role: z.enum([
    'protagonist',
    'antagonist',
    'deuteragonist',
    'supporting',
    'minor',
    'other',
  ]),
  status: z.enum(['alive', 'dead', 'missing', 'unknown']),
  tags: z.string().max(500, 'Теги не длиннее 500 символов'),
  goal: optionalText(2000, 'Цель'),
  worldId: z.string(),
});

export type CharacterCreateValues = z.infer<typeof characterCreateSchema>;

export const characterCreateDefaults: CharacterCreateValues = {
  name: '',
  fullName: '',
  role: 'supporting',
  status: 'alive',
  tags: '',
  goal: '',
  worldId: '',
};

export const customFieldSchema = z.object({
  key: z.string().trim().max(100, 'Ключ не длиннее 100 символов'),
  value: z.string().max(1000, 'Значение не длиннее 1000 символов'),
});

export const characterProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Введите имя персонажа')
    .max(200, 'Имя не длиннее 200 символов'),
  fullName: optionalText(200, 'Полное имя'),
  aliases: z.string().max(1000, 'Псевдонимы не длиннее 1000 символов'),
  role: z.enum([
    'protagonist',
    'antagonist',
    'deuteragonist',
    'supporting',
    'minor',
    'other',
  ]),
  status: z.enum(['alive', 'dead', 'missing', 'unknown']),
  age: optionalText(100, 'Возраст'),
  birthDate: optionalText(200, 'Дата рождения'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Цвет должен быть в формате #RRGGBB'),
  tags: z.string().max(1000, 'Теги не длиннее 1000 символов'),
  appearance: optionalText(10_000, 'Внешность'),
  personality: optionalText(10_000, 'Характер'),
  motivation: optionalText(10_000, 'Мотивация'),
  goal: optionalText(10_000, 'Цель'),
  conflict: optionalText(10_000, 'Конфликт'),
  arc: optionalText(10_000, 'Арка'),
  backstory: optionalText(20_000, 'Предыстория'),
  voice: optionalText(10_000, 'Голос'),
  secrets: optionalText(10_000, 'Секреты'),
  notes: optionalText(20_000, 'Заметки'),
  worldId: z.string(),
  locationId: z.string(),
  customFields: z.array(customFieldSchema).max(50, 'Не больше 50 полей'),
});

export type CharacterProfileValues = z.infer<typeof characterProfileSchema>;

function splitList(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function characterToProfileValues(
  character: components['schemas']['Character'],
): CharacterProfileValues {
  return {
    name: character.name,
    fullName: character.fullName ?? '',
    aliases: (character.aliases ?? []).join(', '),
    role: character.role,
    status: character.status,
    age: character.age ?? '',
    birthDate: character.birthDate ?? '',
    color: character.color ?? '#8a5a2b',
    tags: (character.tags ?? []).join(', '),
    appearance: character.appearance ?? '',
    personality: character.personality ?? '',
    motivation: character.motivation ?? '',
    goal: character.goal ?? '',
    conflict: character.conflict ?? '',
    arc: character.arc ?? '',
    backstory: character.backstory ?? '',
    voice: character.voice ?? '',
    secrets: character.secrets ?? '',
    notes: character.notes ?? '',
    worldId: character.worldId ?? '',
    locationId: character.locationId ?? '',
    customFields: Object.entries(character.customFields ?? {}).map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
    })),
  };
}

export function profileValuesToPayload(values: CharacterProfileValues) {
  const customFields = Object.fromEntries(
    values.customFields
      .filter((field) => field.key.trim())
      .map((field) => [field.key.trim(), field.value]),
  );

  return {
    name: values.name,
    fullName: values.fullName,
    aliases: splitList(values.aliases),
    role: values.role,
    status: values.status,
    age: values.age || null,
    birthDate: values.birthDate || null,
    color: values.color,
    tags: splitList(values.tags),
    appearance: values.appearance,
    personality: values.personality,
    motivation: values.motivation,
    goal: values.goal,
    conflict: values.conflict,
    arc: values.arc,
    backstory: values.backstory,
    voice: values.voice,
    secrets: values.secrets,
    notes: values.notes,
    // The API uses the nil UUID to clear an optional link because an omitted
    // field and an explicit null decode identically.
    worldId: values.worldId || '00000000-0000-0000-0000-000000000000',
    locationId: values.locationId || '00000000-0000-0000-0000-000000000000',
    customFields,
  };
}

export const relationCreateSchema = z.object({
  toCharacterId: z.string().min(1, 'Выберите персонажа'),
  type: z.enum([
    'family',
    'friend',
    'rival',
    'enemy',
    'mentor',
    'romantic',
    'ally',
    'other',
  ]),
  label: z.string().max(200, 'Подпись не длиннее 200 символов'),
  strength: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (/^-?\d{1,3}$/.test(value) && Math.abs(Number(value)) <= 100),
      'Введите число от -100 до 100',
    ),
  isMutual: z.boolean(),
  notes: z.string().max(2000, 'Заметки не длиннее 2000 символов'),
});

export type RelationCreateValues = z.infer<typeof relationCreateSchema>;
