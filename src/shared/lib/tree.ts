import type { components } from '@/shared/api/schema';

export type BookNode = components['schemas']['BookNode'];
export type BookNodeType = components['schemas']['BookNodeType'];

export type FlatBookNode = {
  node: BookNode;
  depth: number;
  parentId: string | null;
};

export type NodeMoveTarget = {
  parentId: string | null;
  beforeId: string | null;
  afterId: string | null;
};

const childTypes: Record<BookNodeType, readonly BookNodeType[]> = {
  part: ['chapter', 'scene'],
  chapter: ['scene'],
  scene: [],
};

export function canContain(parentType: BookNodeType | null, childType: BookNodeType): boolean {
  if (parentType === null) {
    return childType === 'part' || childType === 'chapter';
  }
  return childTypes[parentType].includes(childType);
}

export function flattenTree(
  nodes: BookNode[],
  depth = 0,
  parentId: string | null = null,
): FlatBookNode[] {
  return nodes.flatMap((node) => [
    { node, depth, parentId },
    ...flattenTree(node.children ?? [], depth + 1, node.id),
  ]);
}

export function countTreeNodes(nodes: BookNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countTreeNodes(node.children ?? []), 0);
}

export function findTreeNode(nodes: BookNode[], nodeId: string): BookNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }
    const found = findTreeNode(node.children ?? [], nodeId);
    if (found) {
      return found;
    }
  }
  return null;
}

export function findNodePath(nodes: BookNode[], nodeId: string, path: BookNode[] = []): BookNode[] {
  for (const node of nodes) {
    const nextPath = [...path, node];
    if (node.id === nodeId) {
      return nextPath;
    }
    const found = findNodePath(node.children ?? [], nodeId, nextPath);
    if (found.length > 0) {
      return found;
    }
  }
  return [];
}

export function isDescendantOf(nodes: BookNode[], ancestorId: string, nodeId: string): boolean {
  const ancestorPath = findNodePath(nodes, nodeId);
  return ancestorPath.some((node) => node.id === ancestorId);
}

export function findFirstNodeWithDocument(nodes: BookNode[]): BookNode | null {
  for (const node of nodes) {
    if (node.documentId) {
      return node;
    }
    const found = findFirstNodeWithDocument(node.children ?? []);
    if (found) {
      return found;
    }
  }
  return null;
}

function insertIntoList(
  nodes: BookNode[],
  node: BookNode,
  beforeId: string | null,
  afterId: string | null,
): BookNode[] {
  if (beforeId) {
    const index = nodes.findIndex((candidate) => candidate.id === beforeId);
    if (index >= 0) {
      return [...nodes.slice(0, index), node, ...nodes.slice(index)];
    }
  }
  if (afterId) {
    const index = nodes.findIndex((candidate) => candidate.id === afterId);
    if (index >= 0) {
      return [...nodes.slice(0, index + 1), node, ...nodes.slice(index + 1)];
    }
  }
  return [...nodes, node];
}

function removeNode(nodes: BookNode[], nodeId: string): { nodes: BookNode[]; removed: BookNode | null } {
  let removed: BookNode | null = null;
  const next: BookNode[] = [];

  for (const node of nodes) {
    if (node.id === nodeId) {
      removed = node;
      continue;
    }

    if (removed) {
      next.push(node);
      continue;
    }

    if (node.children?.length) {
      const childResult = removeNode(node.children, nodeId);
      if (childResult.removed) {
        removed = childResult.removed;
        next.push({ ...node, children: childResult.nodes });
        continue;
      }
    }

    next.push(node);
  }

  return { nodes: next, removed };
}

function insertNode(
  nodes: BookNode[],
  parentId: string | null,
  node: BookNode,
  beforeId: string | null,
  afterId: string | null,
): { nodes: BookNode[]; inserted: boolean } {
  if (parentId === null) {
    return { nodes: insertIntoList(nodes, node, beforeId, afterId), inserted: true };
  }

  let inserted = false;
  const next = nodes.map((candidate) => {
    if (inserted) {
      return candidate;
    }
    if (candidate.id === parentId) {
      inserted = true;
      return {
        ...candidate,
        children: insertIntoList(candidate.children ?? [], node, beforeId, afterId),
      };
    }
    if (candidate.children?.length) {
      const childResult = insertNode(candidate.children, parentId, node, beforeId, afterId);
      if (childResult.inserted) {
        inserted = true;
        return { ...candidate, children: childResult.nodes };
      }
    }
    return candidate;
  });

  return { nodes: next, inserted };
}

/**
 * Returns a new tree with the node moved under the requested parent. The move
 * is rejected (returns the original tree) when the destination is invalid.
 */
export function moveTreeNode(
  nodes: BookNode[],
  nodeId: string,
  parentId: string | null,
  beforeId: string | null = null,
  afterId: string | null = null,
): BookNode[] {
  const node = findTreeNode(nodes, nodeId);
  if (!node) {
    return nodes;
  }

  const parent = parentId ? findTreeNode(nodes, parentId) : null;
  if (parentId && !parent) {
    return nodes;
  }
  if (!canContain(parent?.type ?? null, node.type)) {
    return nodes;
  }
  if (parentId && isDescendantOf(nodes, nodeId, parentId)) {
    return nodes;
  }
  if (beforeId === nodeId || afterId === nodeId) {
    return nodes;
  }

  const removed = removeNode(nodes, nodeId);
  if (!removed.removed) {
    return nodes;
  }

  const movedNode: BookNode = { ...removed.removed, parentId };
  const inserted = insertNode(removed.nodes, parentId, movedNode, beforeId, afterId);
  return inserted.inserted ? inserted.nodes : nodes;
}

/**
 * Resolves a drag-and-drop operation into an API move payload. Dropping onto
 * a compatible container appends to it; dropping onto a sibling places the
 * node before or after that sibling.
 */
export function resolveNodeDrop(
  nodes: BookNode[],
  activeId: string,
  overId: string,
  dropAfter: boolean,
): NodeMoveTarget | null {
  if (activeId === overId) {
    return null;
  }

  const flat = flattenTree(nodes);
  const active = flat.find((entry) => entry.node.id === activeId);
  const over = flat.find((entry) => entry.node.id === overId);
  if (!active || !over) {
    return null;
  }
  if (isDescendantOf(nodes, activeId, overId)) {
    return null;
  }

  let parentId: string | null;
  let siblingId: string | null = null;

  if (active.node.type === 'part') {
    parentId = null;
    let root = over;
    while (root.parentId) {
      const parent = flat.find((entry) => entry.node.id === root.parentId);
      if (!parent) {
        return null;
      }
      root = parent;
    }
    siblingId = root.node.id;
  } else if (canContain(over.node.type, active.node.type)) {
    parentId = over.node.id;
  } else {
    let reference = over;
    parentId = over.parentId;

    while (parentId !== null) {
      const parent = flat.find((entry) => entry.node.id === parentId);
      if (!parent) {
        return null;
      }
      if (canContain(parent.node.type, active.node.type)) {
        break;
      }
      reference = parent;
      parentId = parent.parentId;
    }

    if (!canContain(parentId ? (flat.find((entry) => entry.node.id === parentId)?.node.type ?? null) : null, active.node.type)) {
      return null;
    }
    siblingId = reference.node.id;
  }

  if (siblingId === activeId) {
    return null;
  }

  if (siblingId === null) {
    return { parentId, beforeId: null, afterId: null };
  }

  return {
    parentId,
    beforeId: dropAfter ? null : siblingId,
    afterId: dropAfter ? siblingId : null,
  };
}
