import type { DiagramType } from './api';

export const diagramTypeOptions: Array<{ value: DiagramType; label: string }> = [
  { value: 'relationship', label: 'Связи персонажей' },
  { value: 'plot', label: 'Сюжетные линии' },
  { value: 'freeform', label: 'Свободная схема' },
];

export const diagramTypeLabels: Record<DiagramType, string> = {
  relationship: 'Связи',
  plot: 'Сюжет',
  freeform: 'Свободная',
};
