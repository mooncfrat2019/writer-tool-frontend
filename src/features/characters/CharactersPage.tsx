import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { Plus, Search, UserRoundPlus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { formatDate } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/error-state';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Skeleton } from '@/shared/ui/skeleton';
import { CustomFieldsManager } from '@/features/customFields/CustomFieldsManager';
import { CharacterAvatar } from './CharacterAvatar';
import { CharacterCreateDialog } from './CharacterCreateDialog';
import {
  characterRoleLabels,
  characterRoleOptions,
  characterStatusLabels,
  characterStatusOptions,
  characterStatusTones,
} from './constants';

type CharacterRole = components['schemas']['CharacterRole'];
type CharacterStatus = components['schemas']['CharacterStatus'];

const ALL = 'all';

function CharactersSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="rounded-lg border border-paper-200 bg-white/55 p-5">
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CharactersPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<CharacterRole | typeof ALL>(ALL);
  const [statusFilter, setStatusFilter] = useState<CharacterStatus | typeof ALL>(ALL);
  const [createOpen, setCreateOpen] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);

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
    queryKey: ['characters', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}/characters', {
          params: { path: { projectId } },
          query: { limit: 100 },
        }),
      ),
  });

  const characters = useMemo(
    () => charactersQuery.data?.items ?? [],
    [charactersQuery.data],
  );
  const canEdit = projectQuery.data?.role !== 'viewer';
  const query = search.trim().toLocaleLowerCase('ru');

  const filtered = useMemo(
    () =>
      characters.filter((character) => {
        if (roleFilter !== ALL && character.role !== roleFilter) {
          return false;
        }
        if (statusFilter !== ALL && character.status !== statusFilter) {
          return false;
        }
        if (!query) {
          return true;
        }
        return [
          character.name,
          character.fullName ?? '',
          ...(character.aliases ?? []),
          ...character.tags,
        ]
          .join(' ')
          .toLocaleLowerCase('ru')
          .includes(query);
      }),
    [characters, query, roleFilter, statusFilter],
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-700">
            <Users size={14} />
            Люди истории
          </div>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
            Персонажи
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
            Профили, связи и иллюстрации. Один взгляд — и понятно, кто здесь зачем.
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setFieldsOpen(true)}>
              Поля профиля
            </Button>
            <Button variant="accent" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Новый персонаж
            </Button>
          </div>
        ) : (
          <Badge className="h-8 px-3" tone="neutral">
            Только чтение
          </Badge>
        )}
      </div>

      <div className="mt-8 rounded-lg border border-paper-200 bg-white/45 p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_180px]">
          <label className="relative block">
            <span className="sr-only">Поиск персонажей</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
              size={16}
            />
            <Input
              className="pl-9"
              type="search"
              value={search}
              placeholder="Имя, псевдоним или тег…"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div>
            <span className="sr-only" id="role-filter-label">
              Фильтр по роли
            </span>
            <Select
              value={roleFilter}
              onValueChange={(value) => setRoleFilter(value as CharacterRole | typeof ALL)}
            >
              <SelectTrigger aria-labelledby="role-filter-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Все роли</SelectItem>
                {characterRoleOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <span className="sr-only" id="status-filter-label">
              Фильтр по статусу
            </span>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as CharacterStatus | typeof ALL)
              }
            >
              <SelectTrigger aria-labelledby="status-filter-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Все статусы</SelectItem>
                {characterStatusOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {!charactersQuery.isLoading && !charactersQuery.isError ? (
          <p className="mt-3 text-xs text-ink-500" aria-live="polite">
            {query || roleFilter !== ALL || statusFilter !== ALL
              ? `Показано: ${filtered.length} из ${characters.length}`
              : `В истории ${characters.length} персонажей`}
          </p>
        ) : null}
      </div>

      <div className="mt-6">
        {charactersQuery.isLoading ? (
          <CharactersSkeleton />
        ) : charactersQuery.isError ? (
          <ErrorState
            title="Персонажи не загрузились"
            description={getApiErrorMessage(
              charactersQuery.error,
              'Не удалось получить список персонажей.',
            )}
            onRetry={() => void charactersQuery.refetch()}
          />
        ) : characters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-paper-300 bg-white/35 px-6 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-paper-100 text-ink-500">
              <UserRoundPlus size={22} />
            </span>
            <h2 className="mt-5 font-serif text-2xl text-ink-900">Пока никого нет</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
              Добавьте первого персонажа, чтобы связать сцены и POV с живыми людьми
              истории.
            </p>
            {canEdit ? (
              <Button
                className="mt-6"
                variant="accent"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={16} />
                Добавить персонажа
              </Button>
            ) : null}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-paper-300 px-6 py-14 text-center">
            <p className="font-serif text-2xl text-ink-900">Ничего не нашлось</p>
            <p className="mt-2 text-sm text-ink-500">
              Смягчите фильтры или попробуйте другое имя.
            </p>
            <Button
              className="mt-5"
              variant="outline"
              onClick={() => {
                setSearch('');
                setRoleFilter(ALL);
                setStatusFilter(ALL);
              }}
            >
              Сбросить фильтры
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((character) => (
              <Link
                key={character.id}
                to="/projects/$projectId/characters/$characterId"
                params={{ projectId, characterId: character.id }}
                className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                data-testid="character-card"
              >
                <article className="flex h-full flex-col rounded-lg border border-paper-200 bg-white/65 p-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-paper-300 group-hover:shadow-[0_8px_28px_rgba(31,29,26,0.07)]">
                  <div className="flex items-start gap-3">
                    <CharacterAvatar
                      name={character.name}
                      color={character.color}
                      avatarUrl={character.avatarUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-serif text-xl leading-snug text-ink-900">
                        {character.name}
                      </h2>
                      {character.fullName && character.fullName !== character.name ? (
                        <p className="mt-0.5 truncate text-xs text-ink-500">
                          {character.fullName}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone="accent">{characterRoleLabels[character.role]}</Badge>
                        <Badge tone={characterStatusTones[character.status]}>
                          {characterStatusLabels[character.status]}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-relaxed text-ink-500">
                    {character.goal ||
                      character.motivation ||
                      character.personality ||
                      'Профиль пока не заполнен.'}
                  </p>

                  {character.tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {character.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-paper-100 px-2 py-0.5 text-[11px] text-ink-500"
                        >
                          {tag}
                        </span>
                      ))}
                      {character.tags.length > 3 ? (
                        <span className="px-1 text-[11px] text-ink-500">
                          +{character.tags.length - 3}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <p className="mt-auto border-t border-paper-200 pt-3 text-[11px] text-ink-500">
                    Обновлён {formatDate(character.updatedAt)}
                  </p>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CharacterCreateDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(character) => {
          void navigate({
            to: '/projects/$projectId/characters/$characterId',
            params: { projectId, characterId: character.id },
          });
        }}
      />
      <CustomFieldsManager
        projectId={projectId}
        entityType="character"
        open={fieldsOpen}
        onOpenChange={setFieldsOpen}
      />
    </main>
  );
}
