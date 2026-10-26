import { useQuery } from '@tanstack/react-query';
import {
  listFactions,
  listLocations,
  listLore,
  listWorlds,
} from '@/features/worlds/api';
import type { TimelineLinkEntityType } from './api';

export type TimelineLinkOption = {
  id: string;
  name: string;
  worldName?: string;
};

export type TimelineLinkOptions = Record<
  Exclude<TimelineLinkEntityType, 'character'>,
  TimelineLinkOption[]
>;

/**
 * Loads every location, faction and lore entry of the project so the event
 * dialog can link an event to world entities. Locations and factions live
 * under a world, so the lists are gathered across all project worlds.
 */
export function useTimelineLinkOptions(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['timeline-link-options', projectId],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<TimelineLinkOptions> => {
      const worlds = await listWorlds(projectId);
      const lists = await Promise.all(
        worlds.items.map(async (world) => {
          const [locations, factions, lore] = await Promise.all([
            listLocations(world.id),
            listFactions(world.id),
            listLore(world.id),
          ]);
          return { world, locations, factions, lore };
        }),
      );
      return {
        location: lists.flatMap(({ world, locations }) =>
          locations.items.map((location) => ({
            id: location.id,
            name: location.name,
            worldName: world.name,
          })),
        ),
        faction: lists.flatMap(({ world, factions }) =>
          factions.items.map((faction) => ({
            id: faction.id,
            name: faction.name,
            worldName: world.name,
          })),
        ),
        lore: lists.flatMap(({ world, lore }) =>
          lore.items.map((entry) => ({
            id: entry.id,
            name: entry.title,
            worldName: world.name,
          })),
        ),
      };
    },
  });
}
