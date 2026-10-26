import type { components } from '@/shared/api/schema';

export type ExportFormat = components['schemas']['ExportFormat'];
export type ExportStatus = components['schemas']['ExportStatus'];
export type ExportOptions = components['schemas']['ExportOptions'];

export const exportFormatOptions: Array<{
  value: ExportFormat;
  label: string;
  extension: string;
  description: string;
}> = [
  {
    value: 'docx',
    label: 'DOCX',
    extension: '.docx',
    description:
      'Для Word, редакторов и издательств. Сохраняет заголовки, списки и разрывы страниц.',
  },
  {
    value: 'fb2',
    label: 'FB2',
    extension: '.fb2',
    description:
      'Для электронных читалок. Удобен для вычитки на «электронных чернилах» и в приложениях.',
  },
];

export const exportStatusLabels: Record<ExportStatus, string> = {
  queued: 'В очереди',
  running: 'Собирается',
  succeeded: 'Готово',
  failed: 'Ошибка',
  canceled: 'Отменён',
};

export const exportStatusTones: Record<
  ExportStatus,
  'neutral' | 'accent' | 'success' | 'warning' | 'danger'
> = {
  queued: 'neutral',
  running: 'accent',
  succeeded: 'success',
  failed: 'danger',
  canceled: 'warning',
};

export const defaultExportOptions: ExportOptions = {
  includeTitlePage: true,
  includeToc: true,
  includeSynopsis: false,
  includeNotes: false,
  chapterPageBreak: true,
  fontFamily: 'Times New Roman',
  fontSizePt: 12,
  lineSpacing: 2,
};

export const exportFontOptions = [
  'Times New Roman',
  'Georgia',
  'PT Serif',
  'Literata',
  'Arial',
] as const;

export function isActiveExportStatus(status: ExportStatus): boolean {
  return status === 'queued' || status === 'running';
}
