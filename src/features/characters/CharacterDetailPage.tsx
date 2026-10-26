import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
  ArrowLeft,
  Images,
  Link2,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { CharacterAvatar } from './CharacterAvatar';
import { CharacterProfileForm } from './CharacterProfileForm';
import {
  characterRoleLabels,
  characterStatusLabels,
  characterStatusTones,
} from './constants';
import { IllustrationsTab } from './IllustrationsTab';
import { RelationsTab } from './RelationsTab';

type DetailTab = 'profile' | 'relations' | 'illustrations';

export function CharacterDetailPage() {
  const { projectId, characterId } = useParams({ strict: false }) as {
    projectId: string;
    characterId: string;
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<DetailTab>('profile');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}', {
          params: { path: { projectId } },
        }),
      ),
  });

  const characterQuery = useQuery({
    queryKey: ['character', characterId],
    queryFn: async () =>
      unwrap(
        await api.GET('/characters/{characterId}', {
          params: { path: { characterId } },
        }),
      ),
  });

  const charactersQuery = useQuery({
    queryKey: ['characters', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}/characters', {
          params: { path: { projectId } },
          query: { limit: 100 },
        }),
      ),
  });

  const canEdit = projectQuery.data?.role !== 'viewer';
  const character = characterQuery.data;

  const deleteCharacter = useMutation({
    mutationFn: async () =>
      api.DELETE('/characters/{characterId}', {
        params: { path: { characterId } },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['characters', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Персонаж удалён.');
      void navigate({
        to: '/projects/$projectId/characters',
        params: { projectId },
      });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось удалить персонажа.'));
    },
  });

  if (characterQuery.isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8">
        <Skeleton className="h-4 w-36" />
        <div className="mt-6 flex items-center gap-5">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-9 w-64 max-w-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
        </div>
        <Skeleton className="mt-8 h-10 w-full max-w-md" />
        <Skeleton className="mt-6 h-96 w-full" />
      </main>
    );
  }

  if (characterQuery.isError || !character) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 pb-20 pt-10 sm:px-8">
        <Link
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
          to="/projects/$projectId/characters"
          params={{ projectId }}
        >
          <ArrowLeft size={15} />
          Все персонажи
        </Link>
        <div className="mt-6">
          <ErrorState
            title="Персонаж недоступен"
            description={getApiErrorMessage(
              characterQuery.error,
              'Не удалось открыть профиль. Возможно, персонаж был удалён.',
            )}
            onRetry={() => void characterQuery.refetch()}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-6 sm:px-8 sm:pt-8">
      <Link
        className="inline-flex items-center gap-1.5 rounded text-sm text-ink-500 transition hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        to="/projects/$projectId/characters"
        params={{ projectId }}
      >
        <ArrowLeft size={15} />
        Все персонажи
      </Link>

      <header className="mt-5 rounded-lg border border-paper-200 bg-white/55 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <CharacterAvatar
            size="xl"
            name={character.name}
            color={character.color}
            avatarUrl={character.avatarUrl}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
                  {character.name}
                </h1>
                {character.fullName && character.fullName !== character.name ? (
                  <p className="mt-1 text-sm text-ink-500">{character.fullName}</p>
                ) : null}
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-800 hover:bg-red-50 hover:text-red-900"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 size={14} />
                  Удалить
                </Button>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="accent">{characterRoleLabels[character.role]}</Badge>
              <Badge tone={characterStatusTones[character.status]}>
                {characterStatusLabels[character.status]}
              </Badge>
              {character.age ? (
                <span className="text-xs text-ink-500">{character.age}</span>
              ) : null}
            </div>

            {(character.aliases ?? []).length ? (
              <p className="mt-3 text-xs text-ink-500">
                Также известен как:{' '}
                <span className="italic">{(character.aliases ?? []).join(', ')}</span>
              </p>
            ) : null}

            {character.tags.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {character.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-paper-100 px-2.5 py-0.5 text-[11px] text-ink-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            {character.goal ? (
              <p className="mt-4 max-w-3xl border-l-2 border-accent-500/40 pl-3 text-sm leading-relaxed text-ink-700">
                {character.goal}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <Tabs
        className="mt-7"
        value={tab}
        onValueChange={(value) => setTab(value as DetailTab)}
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile">
            <UserRound size={15} />
            Профиль
          </TabsTrigger>
          <TabsTrigger value="relations">
            <Link2 size={15} />
            Связи
          </TabsTrigger>
          <TabsTrigger value="illustrations">
            <Images size={15} />
            Иллюстрации
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <CharacterProfileForm character={character} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="relations">
          <RelationsTab
            character={character}
            characters={charactersQuery.data?.items ?? [character]}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="illustrations">
          <IllustrationsTab character={character} canEdit={canEdit} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Удалить персонажа?"
        description={`${character.name} исчезнет из проекта. Связанные отношения и иллюстрации также будут удалены. Это действие нельзя отменить.`}
        confirmLabel="Удалить персонажа"
        pending={deleteCharacter.isPending}
        onConfirm={() => deleteCharacter.mutate()}
      />
    </main>
  );
}
