import type { components } from '@/shared/api/schema';

export type BookStatus = components['schemas']['BookStatus'];
export type BookNodeStatus = components['schemas']['BookNodeStatus'];
export type BookNodeType = components['schemas']['BookNodeType'];

export const bookStatusLabels: Record<BookStatus, string> = {
  planning: 'Планирование',
  drafting: 'Черновик',
  revising: 'Редактура',
  final: 'Готова',
  published: 'Опубликована',
};

export const nodeStatusLabels: Record<BookNodeStatus, string> = {
  idea: 'Идея',
  outline: 'План',
  draft: 'Черновик',
  revised: 'Отредактировано',
  final: 'Готово',
};

export const nodeStatusTones: Record<
  BookNodeStatus,
  'neutral' | 'accent' | 'warning' | 'success'
> = {
  idea: 'neutral',
  outline: 'warning',
  draft: 'accent',
  revised: 'success',
  final: 'success',
};

export const nodeTypeLabels: Record<BookNodeType, string> = {
  part: 'Часть',
  chapter: 'Глава',
  scene: 'Сцена',
};

export const nodeTypeCreateLabels: Record<BookNodeType, string> = {
  part: 'Новая часть',
  chapter: 'Новая глава',
  scene: 'Новая сцена',
};
