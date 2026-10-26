import { api } from '@/shared/api/client';
import { ApiError, unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';

export type CustomFieldDef = components['schemas']['CustomFieldDef'];
export type CustomFieldDefCreate = components['schemas']['CustomFieldDefCreate'];
export type CustomFieldDefUpdate = components['schemas']['CustomFieldDefUpdate'];
export type CustomFieldReorder = components['schemas']['CustomFieldReorder'];
export type CustomFieldEntityType = components['schemas']['CustomFieldEntityType'];
export type CustomFieldType = components['schemas']['CustomFieldType'];

export async function listCustomFields(
  projectId: string,
  entityType: CustomFieldEntityType,
) {
  return unwrap(
    await api.GET('/projects/{projectId}/custom-fields', {
      params: { path: { projectId }, query: { entityType } },
    }),
  );
}

export async function createCustomField(
  projectId: string,
  body: CustomFieldDefCreate,
) {
  return unwrap(
    await api.POST('/projects/{projectId}/custom-fields', {
      params: { path: { projectId } },
      body,
    }),
  );
}

export async function updateCustomField(
  fieldId: string,
  body: CustomFieldDefUpdate,
) {
  return unwrap(
    await api.PATCH('/custom-fields/{fieldId}', {
      params: { path: { fieldId } },
      body,
    }),
  );
}

export async function reorderCustomFields(
  projectId: string,
  body: CustomFieldReorder,
) {
  return unwrap(
    await api.POST('/projects/{projectId}/custom-fields/reorder', {
      params: { path: { projectId } },
      body,
    }),
  );
}

export async function deleteCustomField(fieldId: string) {
  const { error } = await api.DELETE('/custom-fields/{fieldId}', {
    params: { path: { fieldId } },
  });
  if (error) {
    throw new ApiError(error);
  }
}
