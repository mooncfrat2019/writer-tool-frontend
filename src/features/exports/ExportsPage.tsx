import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  Settings2,
  TriangleAlert,
  X,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { formatDateTime } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { ErrorState } from '@/shared/ui/error-state';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Progress } from '@/shared/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  defaultExportOptions,
  exportFontOptions,
  exportFormatOptions,
  exportStatusLabels,
  exportStatusTones,
  isActiveExportStatus,
  type ExportFormat,
  type ExportOptions,
} from './constants';

type ExportJob = components['schemas']['ExportJob'];

const optionHelp: Array<{
  key: keyof Pick<
    ExportOptions,
    'includeTitlePage' | 'includeToc' | 'includeSynopsis' | 'includeNotes' | 'chapterPageBreak'
  >;
  label: string;
  hint: string;
}> = [
  {
    key: 'includeTitlePage',
    label: 'Титульная страница',
    hint: 'Название книги, автор и год.',
  },
  {
    key: 'includeToc',
    label: 'Оглавление',
    hint: 'Список глав со ссылками на страницы.',
  },
  {
    key: 'includeSynopsis',
    label: 'Синапсис книги',
    hint: 'Краткое описание из карточки книги.',
  },
  {
    key: 'includeNotes',
    label: 'Заметки',
    hint: 'Рабочие заметки глав и сцен. Обычно остаются вне рукописи.',
  },
  {
    key: 'chapterPageBreak',
    label: 'Каждая глава с новой страницы',
    hint: 'Привычная вёрстка для рукописи.',
  },
];

function ExportStatusIcon({ status }: { status: ExportJob['status'] }) {
  if (status === 'succeeded') {
    return <CheckCircle2 size={16} />;
  }
  if (status === 'failed') {
    return <XCircle size={16} />;
  }
  if (status === 'canceled') {
    return <X size={16} />;
  }
  return <LoaderCircle className="animate-spin" size={16} />;
}

function ExportJobCard({
  job,
  canEdit,
  onCancel,
}: {
  job: ExportJob;
  canEdit: boolean;
  onCancel: (job: ExportJob) => void;
}) {
  const formatOption = exportFormatOptions.find((item) => item.value === job.format);
  const active = isActiveExportStatus(job.status);
  const title = `${
    job.format === 'docx' ? 'Word-документ' : 'FictionBook'
  } ${formatOption?.extension ?? ''}`;

  return (
    <li className="rounded-lg border border-paper-200 bg-white/55 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xs font-semibold uppercase',
            job.format === 'docx'
              ? 'bg-blue-700/10 text-blue-800'
              : 'bg-amber-700/10 text-amber-800',
          )}
          aria-hidden="true"
        >
          {job.format}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-ink-900">{title}</p>
            <Badge tone={exportStatusTones[job.status]}>
              <span className="mr-1 inline-flex">
                <ExportStatusIcon status={job.status} />
              </span>
              {exportStatusLabels[job.status]}
            </Badge>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={12} />
              Создан {formatDateTime(job.createdAt)}
            </span>
            {job.finishedAt ? (
              <span>Завершён {formatDateTime(job.finishedAt)}</span>
            ) : null}
          </div>

          {active ? (
            <div className="mt-3">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-ink-500">
                  <LoaderCircle className="animate-spin" size={12} />
                  {job.status === 'queued'
                    ? 'Ждёт очереди'
                    : 'Собираем документ'}
                </span>
                <span className="tabular-nums text-ink-700">{job.progress}%</span>
              </div>
              <Progress
                className="mt-1.5"
                value={job.progress}
                label={`Экспорт готов на ${job.progress}%`}
              />
            </div>
          ) : null}

          {(job.warnings ?? []).length ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-950">
                <TriangleAlert size={13} />
                Предупреждения
              </p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs leading-relaxed text-amber-900">
                {(job.warnings ?? []).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {job.error ? (
            <p
              role="alert"
              className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-900"
            >
              {job.error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
          {job.downloadUrl ? (
            <Button variant="outline" size="sm" asChild>
              <a href={job.downloadUrl} rel="noreferrer">
                <Download size={14} />
                Скачать
              </a>
            </Button>
          ) : null}
          {canEdit && active ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-800 hover:bg-red-50 hover:text-red-900"
              onClick={() => onCancel(job)}
            >
              <X size={14} />
              Отменить
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function ExportsPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const queryClient = useQueryClient();
  const [format, setFormat] = useState<ExportFormat>('docx');
  const [options, setOptions] = useState<ExportOptions>({ ...defaultExportOptions });
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ExportJob | null>(null);

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}', {
          params: { path: { projectId } },
        }),
      ),
  });
  const canEdit = projectQuery.data?.role !== 'viewer';

  const exportsQuery = useQuery({
    queryKey: ['exports', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}/exports', {
          params: { path: { projectId } },
          query: { limit: 50 },
        }),
      ),
    refetchInterval: (query) =>
      query.state.data?.items.some((job) => isActiveExportStatus(job.status))
        ? 1500
        : false,
  });

  const createExport = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST('/projects/{projectId}/exports', {
          params: { path: { projectId } },
          body: { format, options },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exports', projectId] });
      toast.success('Экспорт запущен. Он появится в истории ниже.');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось запустить экспорт.'));
    },
  });

  const cancelExport = useMutation({
    mutationFn: async (job: ExportJob) => {
      const { error } = await api.DELETE('/exports/{exportId}', {
        params: { path: { exportId: job.id } },
      });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exports', projectId] });
      toast.success('Задание экспорта отменено.');
      setCancelTarget(null);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось отменить экспорт.'));
    },
  });

  const items = exportsQuery.data?.items ?? [];
  const hasActiveJobs = items.some((job) => isActiveExportStatus(job.status));
  const selectedFormat = exportFormatOptions.find((item) => item.value === format);

  const setOption = <Key extends keyof ExportOptions>(
    key: Key,
    value: ExportOptions[Key],
  ) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-700">
            <FileText size={14} />
            Рукопись
          </div>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
            Экспорт
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
            Соберите книгу в DOCX для редакторов и издательств или в FB2 для
            электронных читалок. Файл готовится в фоне.
          </p>
        </div>
        {hasActiveJobs ? (
          <span
            className="inline-flex items-center gap-1.5 self-start rounded-full bg-paper-100 px-3 py-1.5 text-xs text-ink-500 sm:self-auto"
            aria-live="polite"
          >
            <RefreshCw className="animate-spin" size={13} />
            Статус обновляется автоматически
          </span>
        ) : null}
      </div>

      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-paper-200 bg-white/55 p-5">
          <h2 className="font-serif text-2xl text-ink-900">Новый экспорт</h2>
          <p className="mt-1 text-sm text-ink-500">
            Выберите формат. Параметры вёрстки можно изменить ниже.
          </p>

          <fieldset className="mt-5">
            <legend className="sr-only">Формат экспорта</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {exportFormatOptions.map((option) => {
                const checked = format === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'relative flex cursor-pointer flex-col rounded-lg border p-4 transition focus-within:ring-2 focus-within:ring-accent-500 focus-within:ring-offset-2',
                      checked
                        ? 'border-accent-500 bg-accent-600/5'
                        : 'border-paper-200 bg-paper-50/60 hover:border-paper-300 hover:bg-paper-100/50',
                    )}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="export-format"
                      value={option.value}
                      checked={checked}
                      onChange={() => setFormat(option.value)}
                    />
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-ink-900">
                        {option.label}
                        <span className="ml-1 text-[11px] font-normal text-ink-500">
                          {option.extension}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded-full border',
                          checked
                            ? 'border-accent-600 bg-accent-600'
                            : 'border-paper-300 bg-white',
                        )}
                        aria-hidden="true"
                      >
                        {checked ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        ) : null}
                      </span>
                    </span>
                    <span className="mt-2 text-xs leading-relaxed text-ink-500">
                      {option.description}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5 rounded-lg border border-paper-200">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              aria-expanded={optionsOpen}
              aria-controls="export-options"
              onClick={() => setOptionsOpen((current) => !current)}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-ink-900">
                <Settings2 size={15} />
                Параметры вёрстки
              </span>
              <span className="flex items-center gap-2 text-xs text-ink-500">
                {options.fontFamily}, {options.fontSizePt} pt
                <ChevronDown
                  className={cn('transition-transform', optionsOpen && 'rotate-180')}
                  size={15}
                />
              </span>
            </button>

            {optionsOpen ? (
              <div id="export-options" className="border-t border-paper-200 px-4 py-4">
                <div className="space-y-3">
                  {optionHelp.map((option) => (
                    <label
                      key={option.key}
                      className="flex cursor-pointer items-start gap-2.5"
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={Boolean(options[option.key])}
                        onChange={(event) =>
                          setOption(option.key, event.target.checked)
                        }
                      />
                      <span>
                        <span className="block text-sm text-ink-900">
                          {option.label}
                        </span>
                        <span className="block text-xs text-ink-500">
                          {option.hint}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="export-font">Шрифт</Label>
                    <Select
                      value={options.fontFamily ?? defaultExportOptions.fontFamily}
                      onValueChange={(value) => setOption('fontFamily', value)}
                    >
                      <SelectTrigger id="export-font">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {exportFontOptions.map((font) => (
                          <SelectItem key={font} value={font}>
                            {font}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="export-font-size">Размер, pt</Label>
                    <Input
                      id="export-font-size"
                      type="number"
                      min={8}
                      max={24}
                      value={options.fontSizePt ?? defaultExportOptions.fontSizePt}
                      onChange={(event) =>
                        setOption(
                          'fontSizePt',
                          Math.min(24, Math.max(8, Number(event.target.value) || 12)),
                        )
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 max-w-40 space-y-2">
                  <Label htmlFor="export-line-spacing">Межстрочный интервал</Label>
                  <Select
                    value={String(
                      options.lineSpacing ?? defaultExportOptions.lineSpacing,
                    )}
                    onValueChange={(value) => setOption('lineSpacing', Number(value))}
                  >
                    <SelectTrigger id="export-line-spacing">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 1.5, 2, 2.5, 3].map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value.toLocaleString('ru-RU')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-ink-500">
              {selectedFormat
                ? `Готовим ${selectedFormat.label} по структуре книги.`
                : null}
            </p>
            <Button
              type="button"
              variant="accent"
              disabled={createExport.isPending || !canEdit}
              onClick={() => createExport.mutate()}
            >
              {createExport.isPending ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <FileText size={16} />
              )}
              {createExport.isPending ? 'Запускаем…' : 'Экспортировать книгу'}
            </Button>
          </div>
          {!canEdit ? (
            <p className="mt-3 text-xs text-ink-500">
              В этом проекте у вас доступ только для чтения, поэтому экспорт
              недоступен.
            </p>
          ) : null}
          {createExport.isError ? (
            <p
              role="alert"
              className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900"
            >
              {getApiErrorMessage(
                createExport.error,
                'Не удалось запустить экспорт. Попробуйте ещё раз.',
              )}
            </p>
          ) : null}
        </section>

        <aside className="rounded-lg border border-paper-200 bg-white/40 p-5">
          <h2 className="font-serif text-xl text-ink-900">Как это работает</h2>
          <ol className="mt-3 space-y-3 text-xs leading-relaxed text-ink-500">
            <li>
              <span className="font-medium text-ink-700">1. Задание встаёт в очередь.</span>{' '}
              Можно продолжать работать — экспорт идёт в фоне.
            </li>
            <li>
              <span className="font-medium text-ink-700">2. Собираем структуру.</span>{' '}
              Части, главы и сцены становятся разделами документа.
            </li>
            <li>
              <span className="font-medium text-ink-700">3. Скачиваем файл.</span>{' '}
              Ссылка появится в истории, когда задание завершится.
            </li>
          </ol>
          <p className="mt-4 border-t border-paper-200 pt-3 text-[11px] leading-relaxed text-ink-500">
            Предупреждения не отменяют экспорт: документ будет собран, но на них
            стоит обратить внимание.
          </p>
        </aside>
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-ink-900">История экспортов</h2>
            <p className="mt-1 text-sm text-ink-500">
              Готовые файлы, текущие задания и ошибки сборки.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={exportsQuery.isFetching}
            onClick={() => void exportsQuery.refetch()}
          >
            <RefreshCw
              className={exportsQuery.isFetching ? 'animate-spin' : undefined}
              size={14}
            />
            Обновить
          </Button>
        </div>

        <div className="mt-4">
          {exportsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-28 w-full" />
              ))}
            </div>
          ) : exportsQuery.isError ? (
            <ErrorState
              title="История не загрузилась"
              description={getApiErrorMessage(
                exportsQuery.error,
                'Не удалось получить список заданий экспорта.',
              )}
              onRetry={() => void exportsQuery.refetch()}
            />
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-paper-300 px-6 py-14 text-center">
              <FileText className="mx-auto text-ink-500" size={24} />
              <p className="mt-3 font-serif text-xl text-ink-900">
                Экспортов пока нет
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
                Соберите книгу и запустите первый экспорт — результат появится
                здесь вместе со ссылкой на файл.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((job) => (
                <ExportJobCard
                  key={job.id}
                  job={job}
                  canEdit={canEdit}
                  onCancel={setCancelTarget}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
          }
        }}
        title="Отменить экспорт?"
        description="Задание будет удалено из истории. Если файл уже готов, ссылка на него перестанет быть доступна здесь."
        confirmLabel="Отменить задание"
        pending={cancelExport.isPending}
        onConfirm={() => cancelTarget && cancelExport.mutate(cancelTarget)}
      />
    </main>
  );
}
