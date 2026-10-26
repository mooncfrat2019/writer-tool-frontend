import type { CustomFieldEntityType, CustomFieldType } from './api';

export const customFieldTypeLabels: Record<CustomFieldType, string> = {
  text: 'Текст',
  longtext: 'Длинный текст',
  number: 'Число',
  date: 'Дата',
  select: 'Список',
  multiselect: 'Мультивыбор',
  url: 'Ссылка',
  checkbox: 'Флажок',
};

export const customFieldTypeOptions = Object.entries(customFieldTypeLabels) as Array<
  [CustomFieldType, string]
>;

export const customFieldEntityLabels: Record<CustomFieldEntityType, string> = {
  character: 'персонажа',
  world: 'мира',
};

export const customFieldEntityTitle: Record<CustomFieldEntityType, string> = {
  character: 'Поля персонажа',
  world: 'Поля мира',
};
