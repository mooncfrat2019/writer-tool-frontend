import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useParams } from '@tanstack/react-router';
import { BookOpen, Download, Network, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import { Badge } from '@/shared/ui/badge';

const navClassName =
  'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-700 transition hover:bg-paper-100';
const activeClassName = 'bg-paper-100 font-medium text-ink-900';

export function ProjectLayout() {
  const { t } = useTranslation();
  const { projectId } = useParams({ strict: false }) as { projectId: string };

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}', {
          params: { path: { projectId } },
        }),
      ),
    enabled: Boolean(projectId),
  });

  return (
    <div className="flex min-h-screen bg-paper-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-paper-200 bg-paper-100/60 p-4 md:flex">
        <Link className="mb-6 flex items-center gap-2 px-2" to="/projects">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink-900 text-paper-50">
            <BookOpen size={16} />
          </span>
          <span className="text-sm font-semibold">{t('appName')}</span>
        </Link>

        <div className="mb-4 rounded-md border border-paper-200 bg-white/60 p-3">
          <p className="text-xs uppercase tracking-wide text-ink-500">Проект</p>
          <p className="mt-1 line-clamp-2 font-serif text-lg leading-tight">
            {projectQuery.data?.title ?? t('loading')}
          </p>
          {projectQuery.data?.role ? (
            <Badge className="mt-2" tone="accent">
              {projectQuery.data.role}
            </Badge>
          ) : null}
        </div>

        <nav className="space-y-1">
          <Link
            to="/projects/$projectId/structure"
            params={{ projectId }}
            className={navClassName}
            activeProps={{ className: `${navClassName} ${activeClassName}` }}
          >
            <Network size={16} />
            {t('structure')}
          </Link>
          <Link
            to="/projects/$projectId/characters"
            params={{ projectId }}
            className={navClassName}
            activeProps={{ className: `${navClassName} ${activeClassName}` }}
          >
            <Users size={16} />
            {t('characters')}
          </Link>
          <Link
            to="/projects/$projectId/exports"
            params={{ projectId }}
            className={navClassName}
            activeProps={{ className: `${navClassName} ${activeClassName}` }}
          >
            <Download size={16} />
            {t('exports')}
          </Link>
        </nav>

        <div className="mt-auto pt-6 text-xs text-ink-500">Phase 1 · mock mode</div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-paper-200 px-4 py-3 md:hidden">
          <Link className="flex items-center gap-2 text-sm font-semibold" to="/projects">
            <BookOpen size={16} />
            {t('appName')}
          </Link>
          <nav className="flex gap-3 text-xs">
            <Link to="/projects/$projectId/structure" params={{ projectId }}>
              {t('structure')}
            </Link>
            <Link to="/projects/$projectId/characters" params={{ projectId }}>
              {t('characters')}
            </Link>
            <Link to="/projects/$projectId/exports" params={{ projectId }}>
              {t('exports')}
            </Link>
          </nav>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
