import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Plus, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

const roleLabels: Record<string, string> = {
  protagonist: 'Протагонист',
  antagonist: 'Антагонист',
  deuteragonist: 'Второй главный',
  supporting: 'Второстепенный',
  minor: 'Эпизодический',
  other: 'Другой',
};

export function CharactersPage() {
  const { t } = useTranslation();
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const queryClient = useQueryClient();

  const charactersQuery = useQuery({
    queryKey: ['characters', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}/characters', {
          params: { path: { projectId } },
        }),
      ),
    enabled: Boolean(projectId),
  });

  const createCharacter = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST('/projects/{projectId}/characters', {
          params: { path: { projectId } },
          body: { name: 'Новый персонаж', role: 'supporting' },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['characters', projectId] });
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink-500">Библия персонажей</p>
          <h1 className="mt-1 font-serif text-3xl">{t('characters')}</h1>
          <p className="mt-2 text-sm text-ink-500">
            Характеристики, мотивация, связи и иллюстрации — в одной карточке.
          </p>
        </div>
        <Button
          variant="accent"
          onClick={() => createCharacter.mutate()}
          disabled={createCharacter.isPending}
        >
          <Plus size={16} />
          {createCharacter.isPending ? t('loading') : 'Новый персонаж'}
        </Button>
      </div>

      {charactersQuery.isLoading ? (
        <p className="text-sm text-ink-500">{t('loading')}</p>
      ) : charactersQuery.error ? (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          {charactersQuery.error.message}
        </p>
      ) : charactersQuery.data?.items.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {charactersQuery.data.items.map((character) => (
            <Card key={character.id} className="transition hover:border-paper-300 hover:shadow-md">
              <CardHeader>
                <div className="flex items-start gap-3">
                  {character.avatarUrl ? (
                    <img
                      alt={character.name}
                      className="h-14 w-14 rounded-full object-cover"
                      src={character.avatarUrl}
                    />
                  ) : (
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
                      style={{ backgroundColor: character.color ?? '#8a5a2b' }}
                    >
                      {character.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <CardTitle className="truncate font-serif text-xl">{character.name}</CardTitle>
                    <p className="mt-1 text-xs text-ink-500">
                      {roleLabels[character.role] ?? character.role}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 min-h-15 text-sm text-ink-700">
                  {character.goal || character.personality || 'Карточка пока не заполнена.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {character.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} tone="neutral">
                      {tag}
                    </Badge>
                  ))}
                  {character.tags.length === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                      <UserRound size={13} />
                      без тегов
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-paper-300 p-12 text-center">
          <UserRound className="mx-auto mb-3 text-ink-500" size={26} />
          <p className="font-serif text-2xl">Персонажей пока нет</p>
          <p className="mt-2 text-sm text-ink-500">
            Создайте первого героя, злодея или второстепенного участника.
          </p>
          <Button
            className="mt-6"
            variant="accent"
            onClick={() => createCharacter.mutate()}
            disabled={createCharacter.isPending}
          >
            <Plus size={16} />
            Новый персонаж
          </Button>
        </div>
      )}
    </div>
  );
}
