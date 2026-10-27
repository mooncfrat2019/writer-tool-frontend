import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';

type Asset = components['schemas']['Asset'];

async function waitForReadyAsset(assetId: string): Promise<Asset> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const asset = unwrap(
      await api.GET('/assets/{assetId}', {
        params: { path: { assetId } },
      }),
    );
    if (asset.status === 'ready') {
      return asset;
    }
    if (asset.status === 'failed') {
      throw new Error('Не удалось обработать изображение.');
    }
    await new Promise((resolve) => window.setTimeout(resolve, 400));
  }
  throw new Error('Изображение не было обработано вовремя.');
}

/**
 * Uploads an image through the shared asset pipeline (presigned URL in
 * production, dev adapter or MSW locally) and waits until it is ready.
 */
export async function uploadProjectImage(
  projectId: string,
  file: File,
): Promise<Asset> {
  const uploadRequest = unwrap(
    await api.POST('/projects/{projectId}/assets/uploads', {
      params: { path: { projectId } },
      body: {
        filename: file.name,
        mime: file.type,
        sizeBytes: file.size,
      },
    }),
  );
  const uploadResponse = await fetch(uploadRequest.uploadUrl, {
    method: uploadRequest.method,
    headers: uploadRequest.headers,
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error(`Не удалось загрузить файл (${uploadResponse.status}).`);
  }
  const completed = unwrap(
    await api.POST('/assets/{assetId}/complete', {
      params: { path: { assetId: uploadRequest.assetId } },
    }),
  );
  return completed.status === 'ready'
    ? completed
    : waitForReadyAsset(uploadRequest.assetId);
}
