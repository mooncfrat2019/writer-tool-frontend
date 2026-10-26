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

/**
 * Uploads a generated PNG through the shared asset pipeline (presigned URL in
 * production, dev adapter or MSW locally) and attaches it to the diagram.
 */
export async function uploadDiagramThumbnail(
  projectId: string,
  diagramId: string,
  blob: Blob,
) {
  const uploadRequest = unwrap(
    await api.POST('/projects/{projectId}/assets/uploads', {
      params: { path: { projectId } },
      body: {
        filename: `diagram-${diagramId}.png`,
        mime: blob.type || 'image/png',
        sizeBytes: blob.size,
      },
    }),
  );
  const uploadResponse = await fetch(uploadRequest.uploadUrl, {
    method: uploadRequest.method,
    headers: uploadRequest.headers,
    body: blob,
  });
  if (!uploadResponse.ok) {
    throw new Error(`Не удалось загрузить миниатюру (${uploadResponse.status}).`);
  }
  let asset = unwrap(
    await api.POST('/assets/{assetId}/complete', {
      params: { path: { assetId: uploadRequest.assetId } },
    }),
  );
  for (let attempt = 0; attempt < 12 && asset.status !== 'ready'; attempt += 1) {
    if (asset.status === 'failed') {
      throw new Error('Обработка миниатюры не удалась.');
    }
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    asset = unwrap(
      await api.GET('/assets/{assetId}', {
        params: { path: { assetId: uploadRequest.assetId } },
      }),
    );
  }
  if (asset.status !== 'ready') {
    throw new Error('Миниатюра не была обработана вовремя.');
  }
  return setDiagramThumbnail(diagramId, asset.id);
}
