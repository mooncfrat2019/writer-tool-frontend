import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ChevronLeft, Loader2, Pencil, Trash2, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import * as Y from 'yjs';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { ErrorState } from '@/shared/ui/error-state';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { diagramTypeLabels, diagramTypeOptions } from './constants';
import { DiagramCanvas, type SaveStatus } from './DiagramCanvas';
import {
  deleteDiagram,
  updateDiagram,
  uploadDiagramThumbnail,
  type Diagram,
  type DiagramType,
} from './api';
import { diagramKeys, useDiagram } from './queries';
import { diagramsCollabEnabled, useDiagramSession } from './useDiagramSession';

export function DiagramEditorPage() {
  const { projectId, diagramId } = useParams({ strict: false }) as {
    projectId: string;
    diagramId: string;
  };
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const diagramQuery = useDiagram(diagramId);
  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}', {
          params: { path: { projectId } },
        }),
      ),
  });
  const charactersQuery = useQuery({
    queryKey: ['characters', projectId, 'options'],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}/characters', {
          params: { path: { projectId }, query: { limit: 100 } },
        }),
      ),
  });
  const collabWanted = diagramsCollabEnabled();
  const sessionState = useDiagramSession(diagramId, collabWanted);
  const localDoc = useMemo(() => {
    void diagramId;
    return new Y.Doc();
  }, [diagramId]);

  const versionRef = useRef(0);
  useEffect(() => {
    if (diagramQuery.data) {
      versionRef.current = diagramQuery.data.version;
    }
  }, [diagramQuery.data]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [newEdgeLabel, setNewEdgeLabel] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DiagramType>('freeform');

  const openSettings = () => {
    if (diagramQuery.data) {
      setTitle(diagramQuery.data.title);
      setType(diagramQuery.data.type);
    }
    setSettingsOpen(true);
  };

  const saveSettings = useMutation({
    mutationFn: () =>
      updateDiagram(diagramId, {
        title: title.trim(),
        type,
        version: versionRef.current,
      }),
    onSuccess: (updated) => {
      versionRef.current = updated.version;
      queryClient.setQueryData(diagramKeys.detail(diagramId), updated);
      void queryClient.invalidateQueries({ queryKey: ['diagrams', projectId] });
      setSettingsOpen(false);
      toast.success('Схема обновлена');
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, 'Не удалось сохранить схему')),
  });

  const removeDiagram = useMutation({
    mutationFn: () => deleteDiagram(diagramId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['diagrams', projectId] });
      toast.success('Схема удалена');
      void navigate({ to: '/projects/$projectId/diagrams', params: { projectId } });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, 'Не удалось удалить схему')),
  });

  const onSaved = useCallback(
    (updated: Diagram) => {
      queryClient.setQueryData(diagramKeys.detail(diagramId), updated);
    },
    [diagramId, queryClient],
  );

  const onUploadThumbnail = useCallback(
    async (blob: Blob) => {
      const updated = await uploadDiagramThumbnail(projectId, diagramId, blob);
      versionRef.current = updated.version;
      queryClient.setQueryData(diagramKeys.detail(diagramId), updated);
      void queryClient.invalidateQueries({ queryKey: ['diagrams', projectId] });
    },
    [diagramId, projectId, queryClient],
  );

  if (diagramQuery.isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 py-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-9 w-72" />
        <Skeleton className="mt-6 h-[60vh] w-full" />
      </main>
    );
  }

  if (diagramQuery.isError || !diagramQuery.data) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-16">
        <ErrorState
          title="Схема недоступна"
          description={getApiErrorMessage(
            diagramQuery.error,
            'Возможно, схема была удалена.',
          )}
          onRetry={() => void diagramQuery.refetch()}
        />
        <Link
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 hover:underline"
          params={{ projectId }}
          to="/projects/$projectId/diagrams"
        >
          <ChevronLeft size={16} />
          Все схемы
        </Link>
      </main>
    );
  }

  const diagram = diagramQuery.data;
  const canEdit = projectQuery.data ? projectQuery.data.role !== 'viewer' : false;
  const collabSession = sessionState.session;
  const collabFailed = collabWanted && !sessionState.loading && !collabSession;
  const ready =
    !collabWanted ||
    collabFailed ||
    Boolean(collabSession?.synced) ||
    Boolean(sessionState.error);
  const ydoc = collabSession?.ydoc ?? localDoc;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col px-5 pb-12 pt-8 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            className="inline-flex items-center gap-1.5 text-xs text-ink-500 transition hover:text-ink-900"
            params={{ projectId }}
            to="/projects/$projectId/diagrams"
          >
            <ChevronLeft size={14} />
            Все схемы
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-3xl leading-tight text-ink-900">
              {diagram.title}
            </h1>
            <Badge tone="neutral">{diagramTypeLabels[diagram.type]}</Badge>
            <SaveIndicator status={saveStatus} />
            {collabWanted ? (
              collabSession ? (
                <Badge tone="success">
                  <Wifi size={11} /> live
                </Badge>
              ) : (
                <Badge tone="warning">
                  <WifiOff size={11} /> без live
                </Badge>
              )
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-ink-500">
            Подпись новой связи
            <Input
              className="h-8 w-40"
              value={newEdgeLabel}
              onChange={(event) => setNewEdgeLabel(event.target.value)}
              placeholder="наставник"
            />
          </label>
          <Button
            variant="outline"
            onClick={openSettings}
            type="button"
          >
            <Pencil size={14} />
            Настройки
          </Button>
        </div>
      </div>

      {sessionState.error ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {sessionState.error}
        </p>
      ) : null}
      {canEdit === false ? (
        <p className="mt-3 rounded-md border border-paper-200 bg-white/60 px-3 py-2 text-xs text-ink-500">
          Режим просмотра: перемещение узлов и создание связей недоступны.
        </p>
      ) : null}

      <div className="mt-4 flex min-h-[68vh] flex-col">
        {!ready ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-paper-200 bg-white/45">
            <span className="flex items-center gap-2 text-sm text-ink-500">
              <Loader2 className="animate-spin" size={16} />
              Подключаемся к совместной схеме…
            </span>
          </div>
        ) : (
          <DiagramCanvas
            characters={charactersQuery.data?.items ?? []}
            canEdit={canEdit}
            diagramId={diagramId}
            initialCanonical={diagram.canonical as Record<string, unknown> | null}
            newEdgeLabel={newEdgeLabel}
            onSaveStatus={setSaveStatus}
            onSaved={onSaved}
            onUploadThumbnail={onUploadThumbnail}
            projectId={projectId}
            provider={collabSession?.provider ?? null}
            ready={ready}
            users={collabSession?.users ?? []}
            versionRef={versionRef}
            ydoc={ydoc}
          />
        )}
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Настройки схемы</DialogTitle>
            <DialogDescription>
              Название и тип схемы. Содержимое хранится в совместном документе.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block">
              <Label htmlFor="diagram-title">Название</Label>
              <Input
                id="diagram-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="block">
              <Label htmlFor="diagram-type">Тип</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as DiagramType)}
              >
                <SelectTrigger id="diagram-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {diagramTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              className="text-red-700"
              disabled={!canEdit || removeDiagram.isPending}
              onClick={() => {
                if (window.confirm('Удалить схему без возможности восстановления?')) {
                  removeDiagram.mutate();
                }
              }}
              type="button"
              variant="ghost"
            >
              <Trash2 size={14} />
              Удалить схему
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={() => setSettingsOpen(false)}
                type="button"
                variant="outline"
              >
                Отмена
              </Button>
              <Button
                disabled={!canEdit || saveSettings.isPending || !title.trim()}
                onClick={() => saveSettings.mutate()}
                type="button"
                variant="accent"
              >
                {saveSettings.isPending ? 'Сохраняем…' : 'Сохранить'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-ink-400">
        <Loader2 className="animate-spin" size={11} />
        Сохраняем…
      </span>
    );
  }
  if (status === 'error') {
    return <span className="text-[11px] text-red-700">Не сохранено</span>;
  }
  return <span className="text-[11px] text-ink-400">Сохранено</span>;
}
