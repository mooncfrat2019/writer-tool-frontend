import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';

export type SearchResult = components['schemas']['SearchResult'];
export type SearchResultType = components['schemas']['SearchResultType'];

export async function searchProject(
  projectId: string,
  query: string,
  types: SearchResultType[],
) {
  return unwrap(
    await api.GET('/projects/{projectId}/search', {
      params: {
        path: { projectId },
        query: {
          q: query,
          types: types.length ? types.join(',') : undefined,
          limit: 50,
        },
      },
    }),
  );
}
