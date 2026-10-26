import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { BookOpen, LogOut, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import { setAccessToken } from '@/shared/api/token';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

const roleLabels: Record<string, string> = {
  owner: 'Владелец',
  editor: 'Редактор',
  viewer: 'Читатель',
};

export function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => unwrap(await api.GET('/projects')),
  });

  const createProject = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST('/projects', {
          body: { title: 'Новый проект', language: 'ru' },
        }),
      ),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void navigate({
        to: '/projects/$projectId/structure',
        params: { projectId: project.id },
      });
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      await api.POST('/auth/logout');
    },
    onSettled: () => {
      setAccessToken(null);
      void navigate({ to: '/login' });
    },
  });

  return (
    <main className="min-h-screen bg-paper-50">
      <header className="border-b border-paper-200 bg-paper-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ink-900 text-paper-50">
              <BookOpen size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">{t('appName')}</p>
              <p className="mt-1 text-xs text-ink-500">{t('tagline')}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => logout.mutate()}>
            <LogOut size={15} />
            Выйти
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-4xl">{t('projects')}</h1>
            <p className="mt-2 text-sm text-ink-500">
              Пространства для книг и серий. Внутри — структура, персонажи и миры.
            </p>
          </div>
          <Button variant="accent" onClick={() => createProject.mutate()} disabled={createProject.isPending}>
            <Plus size={16} />
            {createProject.isPending ? t('loading') : t('newProject')}
          </Button>
        </div>

        {projectsQuery.isLoading ? (
          <p className="text-sm text-ink-500">{t('loading')}</p>
        ) : projectsQuery.error ? (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
            {projectsQuery.error.message}
          </p>
        ) : projectsQuery.data?.items.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projectsQuery.data.items.map((project) => (
              <Link
                key={project.id}
                to="/projects/$projectId/structure"
                params={{ projectId: project.id }}
                className="group block"
              >
                <Card className="h-full transition hover:-translate-y-0.5 hover:border-paper-300 hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="font-serif text-xl">{project.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {project.genre || 'Жанр не указан'}
                        </CardDescription>
                      </div>
                      <Badge tone={project.role === 'owner' ? 'accent' : 'neutral'}>
                        {roleLabels[project.role] ?? project.role}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 min-h-10 text-sm text-ink-500">
                      {project.description || 'Описание пока не заполнено.'}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-paper-200 pt-4 text-xs text-ink-500">
                      <span>{project.booksCount ?? 0} кн. · {project.membersCount ?? 1} уч.</span>
                      <span>{new Intl.NumberFormat('ru-RU').format(project.wordCount ?? 0)} слов</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-paper-300 p-12 text-center">
            <p className="font-serif text-2xl">{t('emptyProjects')}</p>
            <p className="mt-2 text-sm text-ink-500">
              Начните с книги, а персонажей и мир добавите позже.
            </p>
            <Button
              className="mt-6"
              variant="accent"
              onClick={() => createProject.mutate()}
              disabled={createProject.isPending}
            >
              <Plus size={16} />
              {t('newProject')}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
