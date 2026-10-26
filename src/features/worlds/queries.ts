import { useQuery } from '@tanstack/react-query';
import * as worldApi from './api';

export const worldKeys = {
  list: (projectId: string) => ['worlds', projectId] as const,
  detail: (worldId: string) => ['world', worldId] as const,
  locations: (worldId: string) => ['world', worldId, 'locations'] as const,
  factions: (worldId: string) => ['world', worldId, 'factions'] as const,
  rules: (worldId: string) => ['world', worldId, 'rules'] as const,
  lore: (worldId: string) => ['world', worldId, 'lore'] as const,
};

export function useWorlds(projectId: string) {
  return useQuery({
    queryKey: worldKeys.list(projectId),
    queryFn: () => worldApi.listWorlds(projectId),
  });
}

export function useWorld(worldId: string) {
  return useQuery({
    queryKey: worldKeys.detail(worldId),
    queryFn: () => worldApi.getWorld(worldId),
    enabled: Boolean(worldId),
  });
}

export function useLocations(worldId: string) {
  return useQuery({
    queryKey: worldKeys.locations(worldId),
    queryFn: () => worldApi.listLocations(worldId),
    enabled: Boolean(worldId),
  });
}

export function useFactions(worldId: string) {
  return useQuery({
    queryKey: worldKeys.factions(worldId),
    queryFn: () => worldApi.listFactions(worldId),
    enabled: Boolean(worldId),
  });
}

export function useRules(worldId: string) {
  return useQuery({
    queryKey: worldKeys.rules(worldId),
    queryFn: () => worldApi.listRules(worldId),
    enabled: Boolean(worldId),
  });
}

export function useLore(worldId: string) {
  return useQuery({
    queryKey: worldKeys.lore(worldId),
    queryFn: () => worldApi.listLore(worldId),
    enabled: Boolean(worldId),
  });
}
