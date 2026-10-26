import { useQuery } from '@tanstack/react-query';
import {
  listCustomFields,
  type CustomFieldEntityType,
} from './api';

export const customFieldKeys = {
  list: (projectId: string, entityType: CustomFieldEntityType) =>
    ['custom-fields', projectId, entityType] as const,
};

export function useCustomFields(
  projectId: string,
  entityType: CustomFieldEntityType,
) {
  return useQuery({
    queryKey: customFieldKeys.list(projectId, entityType),
    queryFn: () => listCustomFields(projectId, entityType),
    enabled: Boolean(projectId),
  });
}
