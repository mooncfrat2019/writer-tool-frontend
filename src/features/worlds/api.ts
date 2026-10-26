import { api } from '@/shared/api/client';
import { ApiError, unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';

export type World = components['schemas']['World'];
export type WorldCreate = components['schemas']['WorldCreate'];
export type WorldUpdate = components['schemas']['WorldUpdate'];
export type WorldRule = components['schemas']['WorldRule'];
export type WorldRuleCreate = components['schemas']['WorldRuleCreate'];
export type WorldRuleUpdate = components['schemas']['WorldRuleUpdate'];
export type Location = components['schemas']['Location'];
export type LocationCreate = components['schemas']['LocationCreate'];
export type LocationUpdate = components['schemas']['LocationUpdate'];
export type LocationMove = components['schemas']['LocationMove'];
export type Faction = components['schemas']['Faction'];
export type FactionCreate = components['schemas']['FactionCreate'];
export type FactionUpdate = components['schemas']['FactionUpdate'];
export type LoreEntry = components['schemas']['LoreEntry'];
export type LoreEntryCreate = components['schemas']['LoreEntryCreate'];
export type LoreEntryUpdate = components['schemas']['LoreEntryUpdate'];

export async function listWorlds(projectId: string) {
  return unwrap(
    await api.GET('/projects/{projectId}/worlds', {
      params: { path: { projectId }, query: { limit: 100 } },
    }),
  );
}

export async function getWorld(worldId: string) {
  return unwrap(await api.GET('/worlds/{worldId}', { params: { path: { worldId } } }));
}

export async function createWorld(projectId: string, body: WorldCreate) {
  return unwrap(
    await api.POST('/projects/{projectId}/worlds', {
      params: { path: { projectId } },
      body,
    }),
  );
}

export async function updateWorld(worldId: string, body: WorldUpdate) {
  return unwrap(
    await api.PATCH('/worlds/{worldId}', { params: { path: { worldId } }, body }),
  );
}

export async function deleteWorld(worldId: string) {
  const { error } = await api.DELETE('/worlds/{worldId}', {
    params: { path: { worldId } },
  });
  if (error) {
    throw new ApiError(error);
  }
}

export async function listLocations(worldId: string) {
  return unwrap(
    await api.GET('/worlds/{worldId}/locations', { params: { path: { worldId } } }),
  );
}

export async function createLocation(worldId: string, body: LocationCreate) {
  return unwrap(
    await api.POST('/worlds/{worldId}/locations', {
      params: { path: { worldId } },
      body,
    }),
  );
}

export async function updateLocation(locationId: string, body: LocationUpdate) {
  return unwrap(
    await api.PATCH('/locations/{locationId}', {
      params: { path: { locationId } },
      body,
    }),
  );
}

export async function deleteLocation(locationId: string) {
  const { error } = await api.DELETE('/locations/{locationId}', {
    params: { path: { locationId } },
  });
  if (error) {
    throw new ApiError(error);
  }
}

export async function moveLocation(locationId: string, body: LocationMove) {
  return unwrap(
    await api.POST('/locations/{locationId}/move', {
      params: { path: { locationId } },
      body,
    }),
  );
}

export async function listRules(worldId: string) {
  return unwrap(
    await api.GET('/worlds/{worldId}/rules', { params: { path: { worldId } } }),
  );
}

export async function createRule(worldId: string, body: WorldRuleCreate) {
  return unwrap(
    await api.POST('/worlds/{worldId}/rules', { params: { path: { worldId } }, body }),
  );
}

export async function updateRule(ruleId: string, body: WorldRuleUpdate) {
  return unwrap(
    await api.PATCH('/world-rules/{ruleId}', { params: { path: { ruleId } }, body }),
  );
}

export async function deleteRule(ruleId: string) {
  const { error } = await api.DELETE('/world-rules/{ruleId}', {
    params: { path: { ruleId } },
  });
  if (error) {
    throw new ApiError(error);
  }
}

export async function listFactions(worldId: string) {
  return unwrap(
    await api.GET('/worlds/{worldId}/factions', { params: { path: { worldId } } }),
  );
}

export async function createFaction(worldId: string, body: FactionCreate) {
  return unwrap(
    await api.POST('/worlds/{worldId}/factions', {
      params: { path: { worldId } },
      body,
    }),
  );
}

export async function updateFaction(factionId: string, body: FactionUpdate) {
  return unwrap(
    await api.PATCH('/factions/{factionId}', {
      params: { path: { factionId } },
      body,
    }),
  );
}

export async function deleteFaction(factionId: string) {
  const { error } = await api.DELETE('/factions/{factionId}', {
    params: { path: { factionId } },
  });
  if (error) {
    throw new ApiError(error);
  }
}

export async function listLore(worldId: string) {
  return unwrap(
    await api.GET('/worlds/{worldId}/lore', { params: { path: { worldId } } }),
  );
}

export async function createLore(worldId: string, body: LoreEntryCreate) {
  return unwrap(
    await api.POST('/worlds/{worldId}/lore', { params: { path: { worldId } }, body }),
  );
}

export async function updateLore(loreId: string, body: LoreEntryUpdate) {
  return unwrap(
    await api.PATCH('/lore/{loreId}', { params: { path: { loreId } }, body }),
  );
}

export async function deleteLore(loreId: string) {
  const { error } = await api.DELETE('/lore/{loreId}', {
    params: { path: { loreId } },
  });
  if (error) {
    throw new ApiError(error);
  }
}
