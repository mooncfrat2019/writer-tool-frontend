import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

type ExportFormat = components['schemas']['ExportFormat'];

const statusLabels: Record<string, string> = {
  queued: 'в очереди',
  running: 'экспорт…',
  succeeded: 'готово',
  failed: 'ошибка',
  canceled: 'отменён',
};

const statusTones: Record<string, 'neutral' | 'accent' | 'success' | 'warning' | 'danger'> = {
  queued: 'neutral',
  running: 'accent',
  succeeded: 'success',
  failed: 'danger',
  canceled: 'warning',
};

export function ExportsPage() {
  const { t } = useTranslation();
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const queryClient = useQueryClient();
  const [format, setFormat] = useState<ExportFormat>('docx');

  const exportsQuery = useQuery({
    queryKey: ['exports', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}/exports', {
          params: { path: { projectId } },
        }),
      ),
    enabled: Boolean(projectId),
    refetchInterval: (query) =>
      query.state.data?.items.some((item) => item.status === 'queued' || item.status === 'running')
        ? 2000
        : false,
  });

  const createExport = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST('/projects/{projectId}/exports', {
          params: { path: { projectId } },
          body: {
            format,
            options: {
              includeTitlePage: true,
              includeToc: true,
              includeSynopsis: false,
              includeNotes: false,
              chapterPageBreak: true,
              fontFamily: 'Times New Roman',
              fontSizePt: 12,
              lineSpacing: 2,
            },
          },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exports', projectId] });
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-500">Рукопись</p>
        <h1 className="mt-1 font-serif text-3xl">{t('exports')}</h1>
        <p className="mt-2 text-sm text-ink-500">
          DOCX для редакторов и издательств, FB2 для читалок. Экспорт выполняется в фоне.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Новый экспорт</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="format">
                Формат
              </label>
              <select
                id="format"
                className="h-10 rounded-md border border-paper-300 bg-white px-3 text-sm"
                value={format}
                onChange={(event) => setFormat(event.target.value as ExportFormat)}
              >
                <option value="docx">DOCX · Word</option>
                <option value="fb2">FB2 · FictionBook</option>
              </select>
            </div>
            <Button
              variant="accent"
              onClick={() => createExport.mutate()}
              disabled={createExport.isPending}
            >
              {createExport.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <FileText size={16} />
              )}
              Экспортировать
            </Button>
          </div>
          {createExport.error ? (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
              {createExport.error.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">История</h2>

      {exportsQuery.isLoading ? (
        <p className="text-sm text-ink-500">{t('loading')}</p>
      ) : exportsQuery.error ? (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          {exportsQuery.error.message}
        </p>
      ) : exportsQuery.data?.items.length ? (
        <div className="space-y-2">
          {exportsQuery.data.items.map((job) => (
            <div
              key={job.id}
              className="flex flex-col gap-3 rounded-lg border border-paper-200 bg-white/60 p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-paper-100 text-xs font-semibold uppercase">
                  {job.format}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {job.format === 'docx' ? 'Word-документ' : 'FictionBook'}
                    </p>
                    <Badge tone={statusTones[job.status] ?? 'neutral'}>
                      {statusLabels[job.status] ?? job.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    {new Date(job.createdAt).toLocaleString('ru-RU')}
                  </p>
                  {job.status === 'running' || job.status === 'queued' ? (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-paper-200">
                      <div
                        className="h-full bg-accent-500 transition-all"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  ) : null}
                  {job.error ? <p className="mt-1 text-xs text-red-700">{job.error}</p> : null}
                </div>
              </div>
              {job.downloadUrl ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={job.downloadUrl} target="_blank" rel="noreferrer">
                    <Download size={14} />
                    Скачать
                  </a>
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-paper-300 p-12 text-center">
          <p className="font-serif text-2xl">Экспортов пока нет</p>
          <p className="mt-2 text-sm text-ink-500">
            Соберите рукопись и выгрузите её в DOCX или FB2.
          </p>
        </div>
      )}
    </div>
  );
}
