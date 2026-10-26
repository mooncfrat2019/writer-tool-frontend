import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  BookOpen,
  Clock3,
  Library,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import { formatDate, formatNumber, formatWords } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/error-state';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { UserMenu } from '@/features/auth/UserMenu';
import { CreateProjectDialog } from './CreateProjectDialog';
import { projectRoleLabels } from './constants';

function ProjectsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Загрузка проектов">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="rounded-lg border border-paper-200 bg-white/60 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-5 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <div className="mt-6 flex gap-5 border-t border-paper-200 pt-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="ml-auto h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => unwrap(await api.GET('/projects')),
  });

  const projects = useMemo(
    () => projectsQuery.data?.items ?? [],
    [projectsQuery.data],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase('ru');
  const filteredProjects = useMemo(
    () =>
      normalizedSearch
        ? projects.filter((project) =>
            `${project.title} ${project.genre ?? ''}`
              .toLocaleLowerCase('ru')
              .includes(normalizedSearch),
          )
        : projects,
    [normalizedSearch, projects],
  );

  return (
    <div className="min-h-screen bg-paper-50">
      <header className="border-b border-paper-200 bg-paper-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link className="flex items-center gap-3" to="/projects">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink-900 text-paper-50">
              <BookOpen size={17} />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-none">Writer Tool</span>
              <span className="mt-1 hidden text-xs text-ink-500 sm:block">
                мастерская текста
              </span>
            </span>
          </Link>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-700">
              Ваша библиотека
            </p>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">
              Проекты
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-500 sm:text-base">
              Книги, серии и отдельные истории. Внутри каждого проекта — структура,
              герои и рукопись.
            </p>
          </div>
          <Button variant="accent" onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Новый проект
          </Button>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-b border-paper-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full max-w-sm">
            <span className="sr-only">Поиск по проектам</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
              size={16}
            />
            <Input
              className="pl-9"
              type="search"
              value={search}
              placeholder="Найти проект или жанр…"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {!projectsQuery.isLoading && !projectsQuery.isError ? (
            <p className="text-xs text-ink-500" aria-live="polite">
              {normalizedSearch
                ? `Найдено: ${filteredProjects.length} из ${projects.length}`
                : `Всего проектов: ${projects.length}`}
            </p>
          ) : null}
        </div>

        <div className="mt-6">
          {projectsQuery.isLoading ? (
            <ProjectsSkeleton />
          ) : projectsQuery.isError ? (
            <ErrorState
              title="Проекты не загрузились"
              description={getApiErrorMessage(
                projectsQuery.error,
                'Проверьте соединение и попробуйте снова.',
              )}
              onRetry={() => void projectsQuery.refetch()}
            />
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-paper-300 bg-white/35 px-6 py-16 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-paper-100 text-ink-500">
                <Library size={22} />
              </span>
              <h2 className="mt-5 font-serif text-2xl text-ink-900">Здесь пока тихо</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
                Создайте первый проект — и начните с названия. Структура и персонажи
                появятся, когда будете готовы.
              </p>
              <Button className="mt-6" variant="accent" onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                Создать первый проект
              </Button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-paper-300 px-6 py-14 text-center">
              <p className="font-serif text-2xl text-ink-900">Ничего не нашлось</p>
              <p className="mt-2 text-sm text-ink-500">
                Попробуйте другое название или очистите поиск.
              </p>
              <Button className="mt-5" variant="outline" onClick={() => setSearch('')}>
                Очистить поиск
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  to="/projects/$projectId/structure"
                  params={{ projectId: project.id }}
                  className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                  data-testid="project-card"
                >
                  <article className="flex h-full flex-col rounded-lg border border-paper-200 bg-white/70 p-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-paper-300 group-hover:shadow-[0_8px_28px_rgba(31,29,26,0.07)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-serif text-xl leading-snug text-ink-900">
                          {project.title}
                        </h2>
                        <p className="mt-1 text-xs uppercase tracking-wide text-ink-500">
                          {project.genre || 'Жанр не указан'}
                        </p>
                      </div>
                      <Badge tone={project.role === 'owner' ? 'accent' : 'neutral'}>
                        {projectRoleLabels[project.role]}
                      </Badge>
                    </div>

                    <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-relaxed text-ink-500">
                      {project.description || 'Описание пока не заполнено.'}
                    </p>

                    <div className="mt-auto pt-6">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-paper-200 pt-4 text-xs text-ink-500">
                        <span className="inline-flex items-center gap-1.5">
                          <BookOpen size={14} />
                          {formatNumber(project.booksCount ?? 0)}{' '}
                          {(project.booksCount ?? 0) === 1 ? 'книга' : 'книг'}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users size={14} />
                          {formatNumber(project.membersCount ?? 1)} уч.
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={14} />
                          {formatDate(project.updatedAt)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-ink-700">
                        {formatWords(project.wordCount ?? 0)}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(project) => {
          void navigate({
            to: '/projects/$projectId/structure',
            params: { projectId: project.id },
          });
        }}
      />
    </div>
  );
}
