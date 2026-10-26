import { api } from '@/shared/api/client';
import { ApiError, unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';

export type Diagram = components['schemas']['Diagram'];
export type DiagramCreate = components['schemas']['DiagramCreate'];
export type DiagramUpdate = components['schemas']['DiagramUpdate'];
export type DiagramType = components['schemas']['DiagramType'];
export type CollabToken = components['schemas']['CollabToken'];

export async function listDiagrams(projectId: string, query?: string) {
  return unwrap(
    await api.GET('/projects/{projectId}/diagrams', {
      params: { path: { projectId }, query: { q: query || undefined } },
    }),
  );
}

export async function getDiagram(diagramId: string) {
  return unwrap(
    await api.GET('/diagrams/{diagramId}', {
      params: { path: { diagramId } },
    }),
  );
}

export async function createDiagram(projectId: string, body: DiagramCreate) {
  return unwrap(
    await api.POST('/projects/{projectId}/diagrams', {
      params: { path: { projectId } },
      body,
    }),
  );
}

export async function updateDiagram(diagramId: string, body: DiagramUpdate) {
  return unwrap(
    await api.PATCH('/diagrams/{diagramId}', {
      params: { path: { diagramId } },
      body,
    }),
  );
}

export async function deleteDiagram(diagramId: string) {
  const { error } = await api.DELETE('/diagrams/{diagramId}', {
    params: { path: { diagramId } },
  });
  if (error) {
    throw new ApiError(error);
  }
}

export async function createDiagramCollabToken(diagramId: string) {
  return unwrap(
    await api.POST('/diagrams/{diagramId}/collab-token', {
      params: { path: { diagramId } },
    }),
  );
}

export async function setDiagramThumbnail(diagramId: string, assetId: string) {
  return unwrap(
    await api.POST('/diagrams/{diagramId}/thumbnail', {
      params: { path: { diagramId } },
      body: { assetId },
    }),
  );
}
