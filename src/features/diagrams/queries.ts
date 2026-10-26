import { useQuery } from '@tanstack/react-query';
import * as diagramApi from './api';

export const diagramKeys = {
  list: (projectId: string, query: string) =>
    ['diagrams', projectId, query] as const,
  detail: (diagramId: string) => ['diagram', diagramId] as const,
};

export function useDiagrams(projectId: string, query = '') {
  return useQuery({
    queryKey: diagramKeys.list(projectId, query),
    queryFn: () => diagramApi.listDiagrams(projectId, query),
    enabled: Boolean(projectId),
  });
}

export function useDiagram(diagramId: string) {
  return useQuery({
    queryKey: diagramKeys.detail(diagramId),
    queryFn: () => diagramApi.getDiagram(diagramId),
    enabled: Boolean(diagramId),
  });
}
