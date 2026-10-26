import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import { EditorSession } from '@/features/editor/EditorPage';
import {
  collabEnabled,
  useCollabSession,
} from '@/features/editor/useCollabSession';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';

export function SharedDocumentPage() {
  const { documentId } = useParams({ strict: false }) as { documentId: string };

  const sharedQuery = useQuery({
    queryKey: ['shared-document', documentId],
    queryFn: async () =>
      unwrap(
        await api.GET('/shared/documents/{documentId}', {
          params: { path: { documentId } },
        }),
      ),
    enabled: Boolean(documentId),
  });

  const collab = useCollabSession(documentId, collabEnabled());

  const goToProjects = () => window.location.assign('/projects');

  if (sharedQuery.isLoading || collab.loading) {
    return (
      <main className="min-h-screen bg-paper-50 px-5 py-10">
        <div className="mx-auto max-w-4xl">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-10 w-2/3" />
          <Skeleton className="mt-8 h-5 w-full" />
          <Skeleton className="mt-3 h-5 w-11/12" />
          <Skeleton className="mt-3 h-5 w-4/5" />
        </div>
      </main>
    );
  }

  if (sharedQuery.isError || !sharedQuery.data) {
    return (
      <main className="min-h-screen bg-paper-50 px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
            onClick={goToProjects}
          >
            <ArrowLeft size={15} />
            К проектам
          </button>
          <div className="mt-5">
            <ErrorState
              title="Нет доступа к документу"
              description={getApiErrorMessage(
                sharedQuery.error,
                'Ссылка могла быть отозвана. Попросите автора новую.',
              )}
              onRetry={() => void sharedQuery.refetch()}
            />
          </div>
        </div>
      </main>
    );
  }

  if (collab.error) {
    return (
      <main className="min-h-screen bg-paper-50 px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
            onClick={goToProjects}
          >
            <ArrowLeft size={15} />
            К проектам
          </button>
          <div className="mt-5">
            <ErrorState
              title="Совместное редактирование недоступно"
              description={collab.error}
              onRetry={() => window.location.reload()}
            />
          </div>
        </div>
      </main>
    );
  }

  const shared = sharedQuery.data;

  return (
    <EditorSession
      key={shared.document.id}
      projectId={shared.project.id}
      node={shared.node}
      book={shared.book}
      path={shared.path}
      document={shared.document}
      canEdit={shared.role !== 'viewer'}
      collab={collab.session ?? undefined}
      collabFallbackReason={collab.fallbackReason}
      backLabel="К проектам"
      onBack={goToProjects}
    />
  );
}
