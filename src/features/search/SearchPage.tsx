import { useQuery } from '@tanstack/react-query';
import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { FileText, Search, Sparkles } from 'lucide-react';
import { getApiErrorMessage } from '@/shared/api/errors';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { ErrorState } from '@/shared/ui/error-state';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { searchProject, type SearchResult, type SearchResultType } from './api';

const typeOptions: Array<{ value: SearchResultType; label: string }> = [
  { value: 'document', label: 'Тексты' },
  { value: 'character', label: 'Персонажи' },
  { value: 'world', label: 'Миры' },
  { value: 'location', label: 'Локации' },
  { value: 'faction', label: 'Фракции' },
  { value: 'lore', label: 'Лор' },
  { value: 'book', label: 'Книги' },
  { value: 'node', label: 'Главы и сцены' },
  { value: 'event', label: 'События' },
  { value: 'diagram', label: 'Схемы' },
];

const typeLabels: Record<SearchResultType, string> = {
  document: 'Текст',
  character: 'Персонаж',
  world: 'Мир',
  location: 'Локация',
  faction: 'Фракция',
  lore: 'Лор',
  book: 'Книга',
  node: 'Узел',
  event: 'Событие',
  diagram: 'Схема',
};

const typeTones: Record<
  SearchResultType,
  'neutral' | 'accent' | 'success' | 'warning' | 'danger'
> = {
  document: 'accent',
  character: 'success',
  world: 'warning',
  location: 'neutral',
  faction: 'danger',
  lore: 'neutral',
  book: 'success',
  node: 'accent',
  event: 'warning',
  diagram: 'accent',
};

type ResultLink =
  | { kind: 'character'; characterId: string }
  | { kind: 'world'; worldId: string }
  | { kind: 'editor'; nodeId: string }
  | { kind: 'diagram'; diagramId: string }
  | { kind: 'timeline' }
  | { kind: 'structure'; bookId?: string };

function resultLink(result: SearchResult): ResultLink {
  switch (result.type) {
    case 'character':
      return { kind: 'character', characterId: result.id };
    case 'world':
      return { kind: 'world', worldId: result.id };
    case 'document':
      return result.nodeId
        ? { kind: 'editor', nodeId: result.nodeId }
        : { kind: 'structure' };
    case 'book':
      return { kind: 'structure', bookId: result.id };
    case 'node':
      return { kind: 'editor', nodeId: result.nodeId ?? result.id };
    case 'event':
      return { kind: 'timeline' };
    case 'diagram':
      return { kind: 'diagram', diagramId: result.id };
    case 'location':
    case 'faction':
    case 'lore':
      return result.worldId
        ? { kind: 'world', worldId: result.worldId }
        : { kind: 'structure' };
  }
}

export function SearchPage() {
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const [query, setQuery] = useState('');
  const [types, setTypes] = useState<SearchResultType[]>([]);
  const deferred = useDeferredValue(query.trim());
  const active = deferred.length >= 2;
  const typesKey = useMemo(() => [...types].sort().join(','), [types]);

  const searchQuery = useQuery({
    queryKey: ['search', projectId, deferred, typesKey],
    queryFn: () => searchProject(projectId, deferred, types),
    enabled: active,
  });

  const toggleType = (type: SearchResultType) => {
    setTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    );
  };

  const items = searchQuery.data?.items ?? [];

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8 sm:px-8">
      <div>
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-accent-700">
          <Search size={14} />
          Поиск
        </div>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
          Найти в проекте
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
          Тексты глав, персонажи, миры, локации, фракции и лор — в одном поиске.
        </p>
      </div>

      <div className="mt-8 rounded-lg border border-paper-200 bg-white/45 p-3 sm:p-4">
        <label className="relative block">
          <span className="sr-only">Поиск по проекту</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
            size={16}
          />
          <Input
            className="pl-9"
            type="search"
            autoFocus
            value={query}
            placeholder="Введите хотя бы два символа…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {typeOptions.map((option) => {
            const selected = types.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2',
                  selected
                    ? 'border-accent-600 bg-accent-700/10 font-medium text-accent-800'
                    : 'border-paper-300 bg-white/50 text-ink-500 hover:border-paper-400 hover:text-ink-900',
                )}
                onClick={() => toggleType(option.value)}
              >
                {option.label}
              </button>
            );
          })}
          {types.length ? (
            <button
              type="button"
              className="rounded-full px-3 py-1 text-xs text-ink-500 underline-offset-2 hover:underline"
              onClick={() => setTypes([])}
            >
              Сбросить фильтры
            </button>
          ) : null}
        </div>
        {active && !searchQuery.isLoading && !searchQuery.isError ? (
          <p className="mt-3 text-xs text-ink-500" aria-live="polite">
            {items.length
              ? `Найдено: ${items.length}`
              : 'Ничего не найдено — попробуйте другое слово.'}
          </p>
        ) : null}
      </div>

      <div className="mt-6">
        {!active ? (
          <div className="rounded-xl border border-dashed border-paper-300 px-6 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-paper-100 text-ink-500">
              <Sparkles size={22} />
            </span>
            <h2 className="mt-5 font-serif text-2xl text-ink-900">
              Начните вводить запрос
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
              Поиск работает по подстроке и не учитывает регистр. Минимум два
              символа.
            </p>
          </div>
        ) : searchQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="rounded-lg border border-paper-200 bg-white/50 p-4"
              >
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : searchQuery.isError ? (
          <ErrorState
            title="Поиск не сработал"
            description={getApiErrorMessage(
              searchQuery.error,
              'Не удалось выполнить поиск по проекту.',
            )}
            onRetry={() => void searchQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-paper-300 px-6 py-14 text-center">
            <p className="font-serif text-2xl text-ink-900">Ничего не нашлось</p>
            <p className="mt-2 text-sm text-ink-500">
              Проверьте запрос или снимите фильтры по типам.
            </p>
          </div>
        ) : (
          <ul className="space-y-2" data-testid="search-results">
            {items.map((result) => {
              const link = resultLink(result);
              const content = (
                <article className="flex items-start gap-3 rounded-lg border border-paper-200 bg-white/60 p-4 transition hover:border-paper-300 hover:bg-white/80">
                  <FileText className="mt-0.5 shrink-0 text-ink-500" size={16} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink-900">
                        {result.title || 'Без названия'}
                      </span>
                      <Badge tone={typeTones[result.type]}>
                        {typeLabels[result.type]}
                      </Badge>
                    </div>
                    {result.snippet ? (
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-500">
                        {result.snippet}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-ink-500">
                      Обновлено {formatDate(result.updatedAt)}
                    </p>
                  </div>
                </article>
              );

              if (link.kind === 'character') {
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <Link
                      to="/projects/$projectId/characters/$characterId"
                      params={{ projectId, characterId: link.characterId }}
                      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                    >
                      {content}
                    </Link>
                  </li>
                );
              }
              if (link.kind === 'world') {
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <Link
                      to="/projects/$projectId/worlds/$worldId"
                      params={{ projectId, worldId: link.worldId }}
                      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                    >
                      {content}
                    </Link>
                  </li>
                );
              }
              if (link.kind === 'editor') {
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <Link
                      to="/projects/$projectId/write/$nodeId"
                      params={{ projectId, nodeId: link.nodeId }}
                      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                    >
                      {content}
                    </Link>
                  </li>
                );
              }
              if (link.kind === 'timeline') {
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <Link
                      to="/projects/$projectId/timeline"
                      params={{ projectId }}
                      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                    >
                      {content}
                    </Link>
                  </li>
                );
              }
              if (link.kind === 'diagram') {
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <Link
                      to="/projects/$projectId/diagrams/$diagramId"
                      params={{ projectId, diagramId: link.diagramId }}
                      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                    >
                      {content}
                    </Link>
                  </li>
                );
              }
              return (
                <li key={`${result.type}-${result.id}`}>
                  <Link
                    to="/projects/$projectId/structure"
                    params={{ projectId }}
                    search={link.bookId ? { bookId: link.bookId } : {}}
                    className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                  >
                    {content}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
