import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ViewportPortal,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type OnConnect,
  type OnSelectionChangeParams,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
} from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import { toast } from 'sonner';
import * as Y from 'yjs';
import { isVersionConflict } from '@/shared/api/errors';
import type { CollabUser } from '@/features/editor/useCollabSession';
import type { components } from '@/shared/api/schema';
import {
  getDiagram,
  updateDiagram,
  type Diagram,
} from './api';
import { renderDiagramThumbnail } from './thumbnail';

type Character = components['schemas']['Character'];

type EntityNodeData = {
  label: string;
  entityType?: string;
  entityId?: string;
};

type RFNode = Node<EntityNodeData, 'entity'>;

export type SaveStatus = 'saved' | 'saving' | 'error';

type DiagramCanvasProps = {
  projectId: string;
  diagramId: string;
  ydoc: Y.Doc;
  ready: boolean;
  canEdit: boolean;
  initialCanonical: Record<string, unknown> | null;
  versionRef: MutableRefObject<number>;
  characters: Character[];
  newEdgeLabel: string;
  users: CollabUser[];
  provider: HocuspocusProvider | null;
  onSaved: (diagram: Diagram) => void;
  onSaveStatus: (status: SaveStatus) => void;
  onUploadThumbnail: (blob: Blob) => Promise<void>;
};

const LOCAL_ORIGIN = Symbol('diagram-local');

function EntityNode({ data, selected }: NodeProps<RFNode>) {
  return (
    <div
      className={
        selected
          ? 'min-w-36 rounded-md border-2 border-accent-500 bg-white px-3 py-2 shadow-md'
          : 'min-w-36 rounded-md border border-paper-300 bg-white px-3 py-2 shadow-sm'
      }
    >
      <Handle
        className="!h-3 !w-3 !border-2 !border-white !bg-accent-600 hover:!bg-accent-700"
        position={Position.Left}
        title="Перетащите, чтобы связать с другой карточкой"
        type="target"
      />
      <p className="text-[10px] uppercase tracking-[0.08em] text-ink-400">
        {data.entityType === 'character'
          ? 'персонаж'
          : data.entityType === 'note'
            ? 'заметка'
            : 'сущность'}
      </p>
      <p className="text-sm font-medium text-ink-800">{data.label}</p>
      <Handle
        className="!h-3 !w-3 !border-2 !border-white !bg-accent-600 hover:!bg-accent-700"
        position={Position.Right}
        title="Перетащите, чтобы связать с другой карточкой"
        type="source"
      />
    </div>
  );
}

const nodeTypes = { entity: EntityNode };

type RemoteCursor = {
  clientId: number;
  name: string;
  color: string;
  x: number;
  y: number;
};

function DiagramCursors({ provider }: { provider: HocuspocusProvider | null }) {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);

  useEffect(() => {
    const awareness = provider?.awareness;
    if (!awareness) {
      return;
    }
    const update = () => {
      const next: RemoteCursor[] = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) {
          return;
        }
        const user = state.user as
          | { name?: unknown; color?: unknown }
          | undefined;
        const cursor = state.cursor as
          | { x?: unknown; y?: unknown }
          | undefined;
        if (typeof user?.name !== 'string') {
          return;
        }
        if (typeof cursor?.x !== 'number' || typeof cursor?.y !== 'number') {
          return;
        }
        next.push({
          clientId,
          name: user.name,
          color: typeof user.color === 'string' ? user.color : '#8a5a2b',
          x: cursor.x,
          y: cursor.y,
        });
      });
      setCursors((current) =>
        current.length === next.length &&
        current.every(
          (cursor, index) =>
            cursor.clientId === next[index].clientId &&
            cursor.x === next[index].x &&
            cursor.y === next[index].y &&
            cursor.name === next[index].name &&
            cursor.color === next[index].color,
        )
          ? current
          : next,
      );
    };
    awareness.on('change', update);
    update();
    return () => {
      awareness.off('change', update);
    };
  }, [provider]);

  if (!provider?.awareness) {
    return null;
  }

  return (
    <>
      {cursors.map((cursor) => (
        <ViewportPortal key={cursor.clientId}>
          <div
            className="pointer-events-none absolute z-50"
            data-diagram-cursor={cursor.clientId}
            style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
          >
            <svg
              aria-hidden
              className="absolute drop-shadow-sm"
              height="18"
              viewBox="0 0 18 18"
              width="18"
            >
              <path
                d="M2 1 L16 8 L9 9.5 L6.5 16 Z"
                fill={cursor.color}
                stroke="#ffffff"
                strokeWidth="1"
              />
            </svg>
            <span
              className="ml-4 mt-3 inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.name}
            </span>
          </div>
        </ViewportPortal>
      ))}
    </>
  );
}

type NodeRecord = Y.Map<unknown>;

function recordNumber(record: NodeRecord, key: string, fallback = 0): number {
  const value = record.get(key);
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function recordString(record: NodeRecord, key: string): string {
  const value = record.get(key);
  return typeof value === 'string' ? value : '';
}

export function DiagramCanvas({
  projectId,
  diagramId,
  ydoc,
  ready,
  canEdit,
  initialCanonical,
  versionRef,
  characters,
  newEdgeLabel,
  users,
  provider,
  onSaved,
  onSaveStatus,
  onUploadThumbnail,
}: DiagramCanvasProps) {
  const navigate = useNavigate();
  const nodesMap = useMemo(() => ydoc.getMap<NodeRecord>('nodes'), [ydoc]);
  const edgesMap = useMemo(() => ydoc.getMap<NodeRecord>('edges'), [ydoc]);
  const metaMap = useMemo(() => ydoc.getMap<unknown>('meta'), [ydoc]);
  const [nodes, setNodes] = useState<RFNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selection, setSelection] = useState<{
    nodeIds: string[];
    edgeIds: string[];
  }>({ nodeIds: [], edgeIds: [] });
  const [linkTargetId, setLinkTargetId] = useState('');
  const [thumbnailBusy, setThumbnailBusy] = useState(false);
  const nodesRef = useRef<RFNode[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  const seededRef = useRef(false);
  const lastSavedRef = useRef('');
  const saveTimerRef = useRef<number | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const defaultViewport = useMemo<Viewport>(() => {
    const viewport = initialCanonical?.viewport as
      | { x?: number; y?: number; zoom?: number }
      | undefined;
    return {
      x: Number(viewport?.x ?? 0),
      y: Number(viewport?.y ?? 0),
      zoom: Number(viewport?.zoom ?? 1),
    };
  }, [initialCanonical]);
  const viewportRef = useRef<Viewport>(defaultViewport);
  const cursorSentAtRef = useRef(0);

  // Drop the local cursor as soon as the canvas is left or unmounted.
  useEffect(
    () => () => {
      provider?.awareness?.setLocalStateField('cursor', null);
    },
    [provider],
  );

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const awareness = provider?.awareness;
    if (!awareness) {
      return;
    }
    const now = performance.now();
    if (now - cursorSentAtRef.current < 50) {
      return;
    }
    cursorSentAtRef.current = now;
    const rect = event.currentTarget.getBoundingClientRect();
    const viewport = viewportRef.current;
    awareness.setLocalStateField('cursor', {
      x: (event.clientX - rect.left - viewport.x) / viewport.zoom,
      y: (event.clientY - rect.top - viewport.y) / viewport.zoom,
    });
  };

  const onPointerLeave = () => {
    provider?.awareness?.setLocalStateField('cursor', null);
  };

  const readNodes = useCallback((): RFNode[] => {
    const result: RFNode[] = [];
    nodesMap.forEach((record, id) => {
      result.push({
        id,
        type: 'entity',
        position: {
          x: recordNumber(record, 'x'),
          y: recordNumber(record, 'y'),
        },
        data: {
          label: recordString(record, 'label') || 'Без названия',
          entityType: recordString(record, 'entityType') || undefined,
          entityId: recordString(record, 'entityId') || undefined,
        },
      });
    });
    return result;
  }, [nodesMap]);

  const readEdges = useCallback((): Edge[] => {
    const result: Edge[] = [];
    edgesMap.forEach((record, id) => {
      result.push({
        id,
        source: recordString(record, 'source'),
        target: recordString(record, 'target'),
        label: recordString(record, 'label') || undefined,
        markerEnd: { type: MarkerType.ArrowClosed },
        type: 'default',
      });
    });
    return result;
  }, [edgesMap]);

  const selectedNode = useMemo(() => {
    if (selection.nodeIds.length !== 1) {
      return null;
    }
    return nodes.find((node) => node.id === selection.nodeIds[0]) ?? null;
  }, [nodes, selection.nodeIds]);

  const linkTargets = useMemo(
    () => nodes.filter((node) => node.id !== selectedNode?.id),
    [nodes, selectedNode?.id],
  );

  // Keep the previous target when switching cards, so several cards can be
  // linked to the same one with a single click. It stops applying when the
  // target is no longer a valid node (for example, it was deleted).
  const validLinkTargetId = linkTargets.some((node) => node.id === linkTargetId)
    ? linkTargetId
    : '';

  const buildCanonical = useCallback((): Record<string, unknown> => {
    const canonicalNodes: Record<string, unknown>[] = [];
    nodesMap.forEach((record, id) => {
      canonicalNodes.push({
        id,
        type: 'entity',
        position: {
          x: recordNumber(record, 'x'),
          y: recordNumber(record, 'y'),
        },
        data: {
          label: recordString(record, 'label'),
          entityType: recordString(record, 'entityType') || undefined,
          entityId: recordString(record, 'entityId') || undefined,
        },
      });
    });
    const canonicalEdges: Record<string, unknown>[] = [];
    edgesMap.forEach((record, id) => {
      canonicalEdges.push({
        id,
        source: recordString(record, 'source'),
        target: recordString(record, 'target'),
        type: 'relation',
        label: recordString(record, 'label') || undefined,
      });
    });
    const viewport = metaMap.get('viewport') as Viewport | undefined;
    return {
      schemaVersion: 1,
      nodes: canonicalNodes,
      edges: canonicalEdges,
      viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
    };
  }, [edgesMap, metaMap, nodesMap]);

  // Seed the Yjs maps from the canonical REST payload exactly once per doc.
  useEffect(() => {
    if (!ready || seededRef.current) {
      return;
    }
    seededRef.current = true;
    if (nodesMap.size === 0 && initialCanonical) {
      const rawNodes = Array.isArray(initialCanonical.nodes)
        ? (initialCanonical.nodes as unknown[])
        : [];
      const rawEdges = Array.isArray(initialCanonical.edges)
        ? (initialCanonical.edges as unknown[])
        : [];
      ydoc.transact(() => {
        for (const raw of rawNodes) {
          if (!raw || typeof raw !== 'object') {
            continue;
          }
          const node = raw as {
            id?: unknown;
            position?: { x?: unknown; y?: unknown };
            data?: {
              label?: unknown;
              entityType?: unknown;
              entityId?: unknown;
            };
          };
          if (typeof node.id !== 'string') {
            continue;
          }
          const record = new Y.Map<unknown>();
          record.set('x', Number(node.position?.x ?? 0));
          record.set('y', Number(node.position?.y ?? 0));
          record.set(
            'label',
            typeof node.data?.label === 'string' ? node.data.label : '',
          );
          record.set(
            'entityType',
            typeof node.data?.entityType === 'string' ? node.data.entityType : '',
          );
          record.set(
            'entityId',
            typeof node.data?.entityId === 'string' ? node.data.entityId : '',
          );
          nodesMap.set(node.id, record);
        }
        for (const raw of rawEdges) {
          if (!raw || typeof raw !== 'object') {
            continue;
          }
          const edge = raw as {
            id?: unknown;
            source?: unknown;
            target?: unknown;
            label?: unknown;
          };
          if (
            typeof edge.id !== 'string' ||
            typeof edge.source !== 'string' ||
            typeof edge.target !== 'string'
          ) {
            continue;
          }
          const record = new Y.Map<unknown>();
          record.set('source', edge.source);
          record.set('target', edge.target);
          record.set('label', typeof edge.label === 'string' ? edge.label : '');
          edgesMap.set(edge.id, record);
        }
        const viewport = initialCanonical.viewport as Viewport | undefined;
        if (viewport) {
          metaMap.set('viewport', viewport);
        }
      }, LOCAL_ORIGIN);
    }
    setNodes(readNodes());
    setEdges(readEdges());
    lastSavedRef.current = JSON.stringify(buildCanonical());
  }, [
    buildCanonical,
    edgesMap,
    initialCanonical,
    metaMap,
    nodesMap,
    ready,
    readEdges,
    readNodes,
    ydoc,
  ]);

  // Remote updates rebuild local React Flow state; local writes already did.
  useEffect(() => {
    const observer = (_events: unknown, transaction: Y.Transaction) => {
      if (transaction.origin === LOCAL_ORIGIN) {
        return;
      }
      setNodes(readNodes());
      setEdges(readEdges());
    };
    nodesMap.observeDeep(observer);
    edgesMap.observeDeep(observer);
    return () => {
      nodesMap.unobserveDeep(observer);
      edgesMap.unobserveDeep(observer);
    };
  }, [edgesMap, nodesMap, readEdges, readNodes]);

  // Undo/redo tracks node and edge changes made by this client.
  useEffect(() => {
    const manager = new Y.UndoManager([nodesMap, edgesMap], {
      trackedOrigins: new Set([LOCAL_ORIGIN]),
      captureTimeout: 400,
    });
    undoManagerRef.current = manager;
    return () => {
      manager.destroy();
      undoManagerRef.current = null;
    };
  }, [edgesMap, nodesMap]);

  const persist = useCallback(
    async (canonical: Record<string, unknown>) => {
      const serialized = JSON.stringify(canonical);
      if (serialized === lastSavedRef.current) {
        return;
      }
      onSaveStatus('saving');
      try {
        const updated = await updateDiagram(diagramId, {
          canonical,
          version: versionRef.current,
        });
        versionRef.current = updated.version;
        lastSavedRef.current = serialized;
        onSaved(updated);
        onSaveStatus('saved');
      } catch (error) {
        if (!isVersionConflict(error)) {
          onSaveStatus('error');
          throw error;
        }
        // Another session saved first; take its version and write our state
        // once more so the collaborative document is not lost.
        const fresh = await getDiagram(diagramId);
        versionRef.current = fresh.version;
        const updated = await updateDiagram(diagramId, {
          canonical,
          version: fresh.version,
        });
        versionRef.current = updated.version;
        lastSavedRef.current = serialized;
        onSaved(updated);
        onSaveStatus('saved');
      }
    },
    [diagramId, onSaveStatus, onSaved, versionRef],
  );

  useEffect(() => {
    const schedule = (_events: unknown, transaction: Y.Transaction) => {
      if (
        transaction.origin !== LOCAL_ORIGIN &&
        transaction.origin !== undoManagerRef.current
      ) {
        return;
      }
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        void persist(buildCanonical()).catch((error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : 'Не удалось сохранить схему',
          );
        });
      }, 1200);
    };
    nodesMap.observeDeep(schedule);
    edgesMap.observeDeep(schedule);
    metaMap.observeDeep(schedule);
    return () => {
      nodesMap.unobserveDeep(schedule);
      edgesMap.unobserveDeep(schedule);
      metaMap.unobserveDeep(schedule);
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [buildCanonical, edgesMap, metaMap, nodesMap, persist]);

  const writeNode = useCallback(
    (node: RFNode) => {
      ydoc.transact(() => {
        let record = nodesMap.get(node.id);
        if (!record) {
          record = new Y.Map<unknown>();
          nodesMap.set(node.id, record);
        }
        record.set('x', node.position.x);
        record.set('y', node.position.y);
        record.set('label', node.data.label);
        record.set('entityType', node.data.entityType ?? '');
        record.set('entityId', node.data.entityId ?? '');
      }, LOCAL_ORIGIN);
    },
    [nodesMap, ydoc],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<RFNode>[]) => {
      const next = applyNodeChanges(changes, nodesRef.current);
      nodesRef.current = next;
      setNodes(next);
      const removed = new Set(
        changes
          .filter((change) => change.type === 'remove')
          .map((change) => change.id),
      );
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          const node = next.find((item) => item.id === change.id);
          if (node) {
            writeNode(node);
          }
        }
        if (change.type === 'remove') {
          ydoc.transact(() => {
            nodesMap.delete(change.id);
          }, LOCAL_ORIGIN);
        }
        if (change.type === 'add') {
          writeNode(change.item);
        }
      }
      if (removed.size > 0) {
        const removedEdges = edgesRef.current.filter(
          (edge) => removed.has(edge.source) || removed.has(edge.target),
        );
        if (removedEdges.length > 0) {
          const nextEdges = edgesRef.current.filter(
            (edge) => !removed.has(edge.source) && !removed.has(edge.target),
          );
          edgesRef.current = nextEdges;
          setEdges(nextEdges);
          ydoc.transact(() => {
            for (const edge of removedEdges) {
              edgesMap.delete(edge.id);
            }
          }, LOCAL_ORIGIN);
        }
      }
    },
    [edgesMap, nodesMap, writeNode, ydoc],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      const next = applyEdgeChanges(changes, edgesRef.current);
      edgesRef.current = next;
      setEdges(next);
      for (const change of changes) {
        if (change.type === 'remove') {
          ydoc.transact(() => {
            edgesMap.delete(change.id);
          }, LOCAL_ORIGIN);
        }
      }
    },
    [edgesMap, ydoc],
  );

  const createEdge = useCallback(
    (source: string, target: string, label: string) => {
      if (!canEdit) {
        return;
      }
      const id = crypto.randomUUID();
      const edge: Edge = {
        id,
        source,
        target,
        label: label || undefined,
        markerEnd: { type: MarkerType.ArrowClosed },
      };
      ydoc.transact(() => {
        const record = new Y.Map<unknown>();
        record.set('source', source);
        record.set('target', target);
        record.set('label', label);
        edgesMap.set(id, record);
      }, LOCAL_ORIGIN);
      edgesRef.current = [...edgesRef.current, edge];
      setEdges(edgesRef.current);
    },
    [canEdit, edgesMap, ydoc],
  );

  const onConnect = useCallback<OnConnect>(
    (connection) => {
      if (!connection.source || !connection.target) {
        return;
      }
      createEdge(connection.source, connection.target, newEdgeLabel);
    },
    [createEdge, newEdgeLabel],
  );

  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams<RFNode, Edge>) => {
      setSelection({
        nodeIds: params.nodes.map((node) => node.id),
        edgeIds: params.edges.map((edge) => edge.id),
      });
    },
    [],
  );

  const deleteSelection = useCallback(() => {
    if (!canEdit) {
      return;
    }
    const nodeIds = new Set(selection.nodeIds);
    const edgeIds = new Set(selection.edgeIds);
    for (const edge of edgesRef.current) {
      if (nodeIds.has(edge.source) || nodeIds.has(edge.target)) {
        edgeIds.add(edge.id);
      }
    }
    if (nodeIds.size === 0 && edgeIds.size === 0) {
      return;
    }
    ydoc.transact(() => {
      for (const id of nodeIds) {
        nodesMap.delete(id);
      }
      for (const id of edgeIds) {
        edgesMap.delete(id);
      }
    }, LOCAL_ORIGIN);
    const nextNodes = readNodes();
    const nextEdges = readEdges();
    setSelection({ nodeIds: [], edgeIds: [] });
    nodesRef.current = nextNodes;
    edgesRef.current = nextEdges;
    setNodes(nextNodes);
    setEdges(nextEdges);
  }, [
    canEdit,
    edgesMap,
    nodesMap,
    readEdges,
    readNodes,
    selection.edgeIds,
    selection.nodeIds,
    ydoc,
  ]);

  const linkSelected = () => {
    if (!selectedNode || !validLinkTargetId) {
      return;
    }
    createEdge(selectedNode.id, validLinkTargetId, newEdgeLabel);
  };

  const addCharacterNode = (character: Character) => {
    if (!canEdit) {
      return;
    }
    const index = nodesMap.size;
    const id = crypto.randomUUID();
    const node: RFNode = {
      id,
      type: 'entity',
      position: {
        x: 80 + (index % 4) * 220,
        y: 80 + Math.floor(index / 4) * 140,
      },
      data: {
        label: character.name,
        entityType: 'character',
        entityId: character.id,
      },
    };
    ydoc.transact(() => {
      const record = new Y.Map<unknown>();
      record.set('x', node.position.x);
      record.set('y', node.position.y);
      record.set('label', node.data.label);
      record.set('entityType', 'character');
      record.set('entityId', character.id);
      nodesMap.set(id, record);
    }, LOCAL_ORIGIN);
    setNodes((current) => [...current, node]);
  };

  const addNoteNode = () => {
    if (!canEdit) {
      return;
    }
    const index = nodesMap.size;
    const id = crypto.randomUUID();
    const node: RFNode = {
      id,
      type: 'entity',
      position: {
        x: 80 + (index % 4) * 220,
        y: 80 + Math.floor(index / 4) * 140,
      },
      data: { label: 'Новая заметка', entityType: 'note' },
    };
    writeNode(node);
    setNodes((current) => [...current, node]);
  };

  const arrange = () => {
    if (!canEdit) {
      return;
    }
    const currentNodes = readNodes();
    const currentEdges = readEdges();
    const ids = currentNodes.map((node) => node.id);
    const incoming = new Map<string, number>(ids.map((id) => [id, 0]));
    const outgoing = new Map<string, string[]>();
    for (const edge of currentEdges) {
      if (!incoming.has(edge.source) || !incoming.has(edge.target)) {
        continue;
      }
      incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
      outgoing.set(edge.source, [
        ...(outgoing.get(edge.source) ?? []),
        edge.target,
      ]);
    }

    // Layered layout: roots (no incoming edges) stay in the first column and
    // each following column holds the targets of the previous one. Links that
    // are part of a cycle or an unreachable component fall into the last one.
    const level = new Map<string, number>();
    const queue: Array<{ id: string; depth: number }> = [];
    const roots = ids.filter((id) => (incoming.get(id) ?? 0) === 0);
    if (roots.length > 0) {
      for (const id of roots) {
        level.set(id, 0);
        queue.push({ id, depth: 0 });
      }
    } else {
      for (const id of ids) {
        level.set(id, 0);
        queue.push({ id, depth: 0 });
      }
    }
    while (queue.length > 0) {
      const { id, depth } = queue.shift() as { id: string; depth: number };
      for (const target of outgoing.get(id) ?? []) {
        if (level.has(target)) {
          continue;
        }
        level.set(target, depth + 1);
        queue.push({ id: target, depth: depth + 1 });
      }
    }
    const maxLevel = Math.max(0, ...level.values());
    for (const id of ids) {
      if (!level.has(id)) {
        level.set(id, maxLevel + 1);
      }
    }

    const columns = new Map<number, RFNode[]>();
    for (const node of currentNodes) {
      const depth = level.get(node.id) ?? 0;
      columns.set(depth, [...(columns.get(depth) ?? []), node]);
    }

    const positions = new Map<string, { x: number; y: number }>();
    let x = 80;
    for (const depth of Array.from(columns.keys()).sort((a, b) => a - b)) {
      const column = (columns.get(depth) ?? []).sort(
        (left, right) =>
          left.position.y - right.position.y ||
          left.position.x - right.position.x,
      );
      let y = 80;
      let columnWidth = 180;
      for (const node of column) {
        const width = node.measured?.width ?? node.width ?? 180;
        const height = node.measured?.height ?? node.height ?? 60;
        positions.set(node.id, { x, y });
        columnWidth = Math.max(columnWidth, width);
        y += height + 40;
      }
      x += columnWidth + 90;
    }

    ydoc.transact(() => {
      for (const [id, position] of positions) {
        const record = nodesMap.get(id);
        if (record) {
          record.set('x', position.x);
          record.set('y', position.y);
        }
      }
    }, LOCAL_ORIGIN);
    const next = readNodes();
    nodesRef.current = next;
    setNodes(next);
  };

  const makeThumbnail = async () => {
    if (!canEdit || thumbnailBusy) {
      return;
    }
    setThumbnailBusy(true);
    try {
      const blob = await renderDiagramThumbnail(
        nodesRef.current,
        edgesRef.current,
      );
      await onUploadThumbnail(blob);
      toast.success('Миниатюра схемы обновлена');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Не удалось обновить миниатюру',
      );
    } finally {
      setThumbnailBusy(false);
    }
  };

  const undo = () => {
    undoManagerRef.current?.undo();
    setNodes(readNodes());
    setEdges(readEdges());
  };
  const redo = () => {
    undoManagerRef.current?.redo();
    setNodes(readNodes());
    setEdges(readEdges());
  };

  const onMove = useCallback((_event: unknown, viewport: Viewport) => {
    viewportRef.current = viewport;
  }, []);

  const onMoveEnd = useCallback(
    (_event: unknown, viewport: Viewport) => {
      viewportRef.current = viewport;
      ydoc.transact(() => metaMap.set('viewport', viewport), LOCAL_ORIGIN);
    },
    [metaMap, ydoc],
  );

  const onNodeDoubleClick = useCallback(
    (_event: ReactMouseEvent, node: RFNode) => {
      if (node.data.entityType === 'character' && node.data.entityId) {
        void navigate({
          to: '/projects/$projectId/characters/$characterId',
          params: { projectId, characterId: node.data.entityId },
        });
      }
    },
    [navigate, projectId],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
      <aside className="w-full shrink-0 space-y-3 rounded-lg border border-paper-200 bg-white/50 p-3 lg:w-64">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-500">
            Палитра
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Нажмите на персонажа, чтобы добавить его на схему. Чтобы связать
            карточки, перетащите точку на краю одной карточки к другой.
          </p>
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {characters.map((character) => (
            <button
              key={character.id}
              className="flex w-full items-center justify-between gap-2 rounded border border-transparent px-2 py-1.5 text-left text-xs text-ink-700 hover:border-paper-200 hover:bg-paper-50"
              disabled={!canEdit}
              onClick={() => addCharacterNode(character)}
              type="button"
            >
              <span className="truncate">{character.name}</span>
              <span className="text-[10px] text-ink-400">+</span>
            </button>
          ))}
          {characters.length === 0 ? (
            <p className="text-xs text-ink-400">В проекте нет персонажей.</p>
          ) : null}
        </div>
        <ButtonRow
          canEdit={canEdit}
          onAddNote={addNoteNode}
          onArrange={arrange}
          onRedo={redo}
          onThumbnail={() => void makeThumbnail()}
          onUndo={undo}
          thumbnailBusy={thumbnailBusy}
        />
        <div className="space-y-2 border-t border-paper-200 pt-2">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-500">
            Выбрано
          </p>
          <p className="text-xs text-ink-500">
            {selection.nodeIds.length + selection.edgeIds.length === 0
              ? 'Кликните карточку или связь, чтобы выбрать. Удаление — Delete, Backspace или кнопка ниже.'
              : `Карточек: ${selection.nodeIds.length}, связей: ${selection.edgeIds.length}`}
          </p>
          <button
            className="w-full rounded px-2 py-1.5 text-left text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
            disabled={
              !canEdit ||
              selection.nodeIds.length + selection.edgeIds.length === 0
            }
            onClick={deleteSelection}
            type="button"
          >
            Удалить выбранное
          </button>
          {selectedNode ? (
            <div className="space-y-1 border-t border-paper-200 pt-2">
              <label
                className="block text-[11px] text-ink-500"
                htmlFor="diagram-link-target"
              >
                Связать «{selectedNode.data.label}» с
              </label>
              <select
                className="w-full rounded border border-paper-300 bg-white px-2 py-1.5 text-xs text-ink-700 disabled:opacity-50"
                disabled={!canEdit}
                id="diagram-link-target"
                onChange={(event) => setLinkTargetId(event.target.value)}
                value={validLinkTargetId}
              >
                <option value="">— выберите карточку —</option>
                {linkTargets.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.data.label}
                    {node.data.entityType === 'note' ? ' (заметка)' : ''}
                  </option>
                ))}
              </select>
              <button
                className="w-full rounded px-2 py-1.5 text-left text-xs text-ink-700 hover:bg-paper-50 disabled:opacity-50"
                disabled={!canEdit || !validLinkTargetId}
                onClick={linkSelected}
                type="button"
              >
                + Создать связь
              </button>
              <p className="text-[10px] leading-snug text-ink-400">
                Стрелка идёт от выбранной карточки к указанной. Несколько
                карточек можно связать с одной, выбирая их по очереди.
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-ink-400">
          {users.map((user) => (
            <span
              key={user.clientId}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold text-white"
              style={{ backgroundColor: user.color }}
              title={`${user.name}${user.isLocal ? ' (вы)' : ''}`}
            >
              {user.name.slice(0, 2).toLocaleUpperCase('ru')}
            </span>
          ))}
          {users.length === 0 ? <span>Нет других участников</span> : null}
        </div>
      </aside>

      <div
        className="h-[68vh] min-h-[420px] flex-1 overflow-hidden rounded-lg border border-paper-200 bg-paper-50"
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
      >
        <ReactFlow
          connectionMode={ConnectionMode.Loose}
          defaultViewport={defaultViewport}
          deleteKeyCode={['Backspace', 'Delete']}
          edges={edges}
          fitView={!initialCanonical?.viewport}
          minZoom={0.2}
          nodeTypes={nodeTypes}
          nodes={nodes}
          nodesConnectable={canEdit}
          nodesDraggable={canEdit}
          onConnect={onConnect}
          onEdgesChange={onEdgesChange}
          onMove={onMove}
          onMoveEnd={onMoveEnd}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodesChange={onNodesChange}
          onSelectionChange={onSelectionChange}
        >
          <Background gap={20} variant={BackgroundVariant.Dots} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable />
          <DiagramCursors provider={provider} />
        </ReactFlow>
      </div>
    </div>
  );
}

function ButtonRow({
  canEdit,
  onAddNote,
  onArrange,
  onRedo,
  onThumbnail,
  onUndo,
  thumbnailBusy,
}: {
  canEdit: boolean;
  onAddNote: () => void;
  onArrange: () => void;
  onRedo: () => void;
  onThumbnail: () => void;
  onUndo: () => void;
  thumbnailBusy: boolean;
}) {
  return (
    <div className="space-y-1 border-t border-paper-200 pt-2">
      <button
        className="w-full rounded px-2 py-1.5 text-left text-xs text-ink-700 hover:bg-paper-50 disabled:opacity-50"
        disabled={!canEdit}
        onClick={onAddNote}
        type="button"
      >
        + Заметка
      </button>
      <button
        className="w-full rounded px-2 py-1.5 text-left text-xs text-ink-700 hover:bg-paper-50 disabled:opacity-50"
        disabled={!canEdit}
        onClick={onArrange}
        type="button"
      >
        Упорядочить по связям
      </button>
      <button
        className="w-full rounded px-2 py-1.5 text-left text-xs text-ink-700 hover:bg-paper-50 disabled:opacity-50"
        disabled={!canEdit || thumbnailBusy}
        onClick={onThumbnail}
        type="button"
      >
        {thumbnailBusy ? 'Готовим миниатюру…' : 'Обновить миниатюру'}
      </button>
      <div className="flex gap-1">
        <button
          className="flex-1 rounded px-2 py-1.5 text-left text-xs text-ink-700 hover:bg-paper-50 disabled:opacity-50"
          disabled={!canEdit}
          onClick={onUndo}
          type="button"
        >
          Отменить
        </button>
        <button
          className="flex-1 rounded px-2 py-1.5 text-left text-xs text-ink-700 hover:bg-paper-50 disabled:opacity-50"
          disabled={!canEdit}
          onClick={onRedo}
          type="button"
        >
          Повторить
        </button>
      </div>
    </div>
  );
}
