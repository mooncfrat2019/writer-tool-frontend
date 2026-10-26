import { useQuery } from '@tanstack/react-query';
import * as timelineApi from './api';
import type { TimelineFilters } from './api';

export const timelineKeys = {
  view: (projectId: string, filters: TimelineFilters) =>
    ['timeline', projectId, filters] as const,
  calendars: (projectId: string) => ['timeline', projectId, 'calendars'] as const,
  threads: (projectId: string) => ['timeline', projectId, 'threads'] as const,
};

export function useTimeline(projectId: string, filters: TimelineFilters) {
  return useQuery({
    queryKey: timelineKeys.view(projectId, filters),
    queryFn: () => timelineApi.getTimeline(projectId, filters),
    enabled: Boolean(projectId),
  });
}

export function useCalendars(projectId: string) {
  return useQuery({
    queryKey: timelineKeys.calendars(projectId),
    queryFn: () => timelineApi.listCalendars(projectId),
    enabled: Boolean(projectId),
  });
}

export function usePlotThreads(projectId: string) {
  return useQuery({
    queryKey: timelineKeys.threads(projectId),
    queryFn: () => timelineApi.listPlotThreads(projectId),
    enabled: Boolean(projectId),
  });
}
