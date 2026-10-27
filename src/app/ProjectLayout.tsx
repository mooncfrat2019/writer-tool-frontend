import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useParams } from '@tanstack/react-router';
import {
  BookOpen,
  ChevronLeft,
  Download,
  GitCommitHorizontal,
  Globe2,
  Images,
  Network,
  Search,
  Users,
  Workflow,
} from 'lucide-react';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { UserMenu } from '@/features/auth/UserMenu';
import { projectRoleLabels } from '@/features/projects/constants';

const navItems = [
  { to: '/projects/$projectId/structure', label: 'Структура', icon: Network },
  { to: '/projects/$projectId/characters', label: 'Персонажи', icon: Users },
  { to: '/projects/$projectId/worlds', label: 'Миры', icon: Globe2 },
  { to: '/projects/$projectId/gallery', label: 'Галерея', icon: Images },
  { to: '/projects/$projectId/timeline', label: 'Таймлайн', icon: GitCommitHorizontal },
  { to: '/projects/$projectId/diagrams', label: 'Схемы', icon: Workflow },
  { to: '/projects/$projectId/search', label: 'Поиск', icon: Search },
  { to: '/projects/$projectId/exports', label: 'Экспорт', icon: Download },
] as const;

const desktopNavClass =
  'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-ink-700 transition hover:bg-paper-100 hover:text-ink-900';
const desktopNavActiveClass = 'bg-paper-100 font-medium text-ink-900';

function ProjectShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-paper-50">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-paper-200 bg-paper-100/50 p-5 lg:flex">
        <Skeleton className="h-9 w-32" />
        <div className="mt-8 rounded-lg border border-paper-200 bg-white/50 p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-6 w-4/5" />
          <Skeleton className="mt-3 h-5 w-20 rounded-full" />
        </div>
        <div className="mt-6 space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="border-b border-paper-200 px-5 py-4 lg:hidden">
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-10 w-72 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
          <Skeleton className="mt-10 h-80 w-full" />
        </div>
      </div>
    </div>
  );
}

export function ProjectLayout() {
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

  if (projectQuery.isLoading) {
    return <ProjectShellSkeleton />;
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <main className="flex min-h-screen flex-col bg-paper-50">
        <header className="border-b border-paper-200 px-5 py-4">
          <Link className="inline-flex items-center gap-2 text-sm font-semibold" to="/projects">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink-900 text-paper-50">
              <BookOpen size={15} />
            </span>
            Writer Tool
          </Link>
        </header>
        <div className="mx-auto w-full max-w-3xl px-5 py-16">
          <ErrorState
            title="Проект недоступен"
            description={
              projectQuery.error
                ? getApiErrorMessage(
                    projectQuery.error,
                    'Не удалось открыть проект. Возможно, он был удалён.',
                  )
                : 'Не удалось открыть проект.'
            }
            onRetry={() => void projectQuery.refetch()}
          />
          <Link
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 hover:underline"
            to="/projects"
          >
            <ChevronLeft size={16} />
            Вернуться к проектам
          </Link>
        </div>
      </main>
    );
  }

  const project = projectQuery.data;

  return (
    <div className="flex min-h-screen bg-paper-50">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-paper-200 bg-paper-100/50 p-5 lg:flex">
        <Link className="flex items-center gap-2.5 px-1" to="/projects">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink-900 text-paper-50">
            <BookOpen size={17} />
          </span>
          <span className="text-sm font-semibold">Writer Tool</span>
        </Link>

        <Link
          className="mt-7 inline-flex items-center gap-1.5 rounded px-1 text-xs text-ink-500 transition hover:text-ink-900"
          to="/projects"
        >
          <ChevronLeft size={13} />
          Все проекты
        </Link>

        <div className="mt-3 rounded-lg border border-paper-200 bg-white/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">
            Текущий проект
          </p>
          <h1 className="mt-2 line-clamp-3 font-serif text-xl leading-snug text-ink-900">
            {project.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone={project.role === 'owner' ? 'accent' : 'neutral'}>
              {projectRoleLabels[project.role]}
            </Badge>
            {project.genre ? (
              <span className="truncate text-xs text-ink-500">{project.genre}</span>
            ) : null}
          </div>
        </div>

        <nav className="mt-5 space-y-1" aria-label="Навигация по проекту">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              params={{ projectId }}
              className={desktopNavClass}
              activeProps={{ className: cn(desktopNavClass, desktopNavActiveClass) }}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-paper-200 pt-4">
          <UserMenu align="start" />
          <p className="mt-3 px-2 text-[11px] uppercase tracking-[0.12em] text-ink-500/80">
            Phase 1 · рабочая версия
          </p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-paper-200 bg-paper-50/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 pt-3">
            <Link
              className="inline-flex items-center gap-1.5 text-xs text-ink-500 transition hover:text-ink-900"
              to="/projects"
            >
              <ChevronLeft size={14} />
              Все проекты
            </Link>
            <UserMenu />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-2">
            <h1 className="line-clamp-1 font-serif text-xl text-ink-900">{project.title}</h1>
            <Badge tone={project.role === 'owner' ? 'accent' : 'neutral'}>
              {projectRoleLabels[project.role]}
            </Badge>
          </div>
          <nav
            className="grid grid-cols-4 border-t border-paper-200"
            aria-label="Навигация по проекту"
          >
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                params={{ projectId }}
                className="flex items-center justify-center gap-1.5 border-b-2 border-transparent px-2 py-2.5 text-xs font-medium text-ink-500 transition hover:bg-paper-100 hover:text-ink-900"
                activeProps={{
                  className:
                    'flex items-center justify-center gap-1.5 border-b-2 border-accent-600 bg-paper-100/60 px-2 py-2.5 text-xs font-medium text-accent-700',
                }}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </nav>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
