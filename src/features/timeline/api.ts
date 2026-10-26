import { api } from '@/shared/api/client';
import { ApiError, unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';

export type Calendar = components['schemas']['Calendar'];
export type CalendarCreate = components['schemas']['CalendarCreate'];
export type CalendarUpdate = components['schemas']['CalendarUpdate'];
export type PlotThread = components['schemas']['PlotThread'];
export type PlotThreadCreate = components['schemas']['PlotThreadCreate'];
export type PlotThreadUpdate = components['schemas']['PlotThreadUpdate'];
export type TimelineEvent = components['schemas']['TimelineEvent'];
export type TimelineEventCreate = components['schemas']['TimelineEventCreate'];
export type TimelineEventUpdate = components['schemas']['TimelineEventUpdate'];
export type TimelineEventLink = components['schemas']['TimelineEventLink'];
export type TimelineEventLinkCreate = components['schemas']['TimelineEventLinkCreate'];
export type TimelineView = components['schemas']['TimelineView'];
export type TimelinePrecision = components['schemas']['TimelinePrecision'];
export type TimelineDateMode = components['schemas']['TimelineDateMode'];
export type TimelineLinkEntityType = components['schemas']['TimelineLinkEntityType'];
export type TimelineMode = 'world' | 'narrative';

export type TimelineFilters = {
  mode: TimelineMode;
  plotThreadId?: string;
  characterId?: string;
  locationId?: string;
  factionId?: string;
  bookId?: string;
  q?: string;
  fromValue?: number;
  toValue?: number;
  importanceMin?: number;
};

export async function listCalendars(projectId: string) {
  return unwrap(
    await api.GET('/projects/{projectId}/calendars', {
      params: { path: { projectId } },
    }),
  );
}

export async function createCalendar(projectId: string, body: CalendarCreate) {
  return unwrap(
    await api.POST('/projects/{projectId}/calendars', {
      params: { path: { projectId } },
      body,
    }),
  );
}

export async function updateCalendar(calendarId: string, body: CalendarUpdate) {
  return unwrap(
    await api.PATCH('/calendars/{calendarId}', {
      params: { path: { calendarId } },
      body,
    }),
  );
}

export async function deleteCalendar(calendarId: string) {
  const { error } = await api.DELETE('/calendars/{calendarId}', {
    params: { path: { calendarId } },
  });
  if (error) {
    throw new ApiError(error);
  }
}

export async function listPlotThreads(projectId: string) {
  return unwrap(
    await api.GET('/projects/{projectId}/plot-threads', {
      params: { path: { projectId } },
    }),
  );
}

export async function createPlotThread(projectId: string, body: PlotThreadCreate) {
  return unwrap(
    await api.POST('/projects/{projectId}/plot-threads', {
      params: { path: { projectId } },
      body,
    }),
  );
}

export async function updatePlotThread(threadId: string, body: PlotThreadUpdate) {
  return unwrap(
    await api.PATCH('/plot-threads/{threadId}', {
      params: { path: { threadId } },
      body,
    }),
  );
}

export async function deletePlotThread(threadId: string) {
  const { error } = await api.DELETE('/plot-threads/{threadId}', {
    params: { path: { threadId } },
  });
  if (error) {
    throw new ApiError(error);
  }
}

export async function getTimeline(projectId: string, filters: TimelineFilters) {
  return unwrap(
    await api.GET('/projects/{projectId}/timeline', {
      params: {
        path: { projectId },
        query: {
          mode: filters.mode,
          plotThreadId: filters.plotThreadId,
          characterId: filters.characterId,
          locationId: filters.locationId,
          factionId: filters.factionId,
          bookId: filters.bookId,
          q: filters.q,
          fromValue: filters.fromValue,
          toValue: filters.toValue,
          importanceMin: filters.importanceMin,
        },
      },
    }),
  );
}

export async function getTimelineEvent(eventId: string) {
  return unwrap(
    await api.GET('/timeline-events/{eventId}', {
      params: { path: { eventId } },
    }),
  );
}

export async function createTimelineEvent(
  projectId: string,
  body: TimelineEventCreate,
) {
  return unwrap(
    await api.POST('/projects/{projectId}/timeline-events', {
      params: { path: { projectId } },
      body,
    }),
  );
}

export async function updateTimelineEvent(
  eventId: string,
  body: TimelineEventUpdate,
) {
  return unwrap(
    await api.PATCH('/timeline-events/{eventId}', {
      params: { path: { eventId } },
      body,
    }),
  );
}

export async function deleteTimelineEvent(eventId: string) {
  const { error } = await api.DELETE('/timeline-events/{eventId}', {
    params: { path: { eventId } },
  });
  if (error) {
    throw new ApiError(error);
  }
}

export async function addTimelineEventLink(
  eventId: string,
  body: TimelineEventLinkCreate,
) {
  return unwrap(
    await api.POST('/timeline-events/{eventId}/links', {
      params: { path: { eventId } },
      body,
    }),
  );
}

export async function removeTimelineEventLink(eventId: string, linkId: string) {
  const { error } = await api.DELETE('/timeline-events/{eventId}/links/{linkId}', {
    params: { path: { eventId, linkId } },
  });
  if (error) {
    throw new ApiError(error);
  }
}
