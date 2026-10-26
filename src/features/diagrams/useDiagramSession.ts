import { HocuspocusProvider, WebSocketStatus } from '@hocuspocus/provider';
import { useEffect, useRef, useState } from 'react';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';
import { getApiErrorMessage } from '@/shared/api/errors';
import { createDiagramCollabToken } from './api';
import { collabEnabled, type CollabUser } from '@/features/editor/useCollabSession';
import { getSessionState } from '@/features/auth/session';

const USER_COLORS = ['#8a5a2b', '#4a6a7a', '#7a4a5a', '#4a7a5a', '#6a5a8a'];

function colorFor(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return USER_COLORS[hash % USER_COLORS.length];
}

export type DiagramSession = {
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
  synced: boolean;
  status: WebSocketStatus;
  users: CollabUser[];
};

export type DiagramSessionState = {
  session: DiagramSession | null;
  loading: boolean;
  error: string | null;
};

/**
 * Connects a diagram document to the same Yjs room infrastructure as text
 * documents. Without a collaboration flag the diagram still opens: the caller
 * edits locally and persists the canonical React Flow JSON through the REST
 * endpoint.
 */
export function useDiagramSession(
  diagramId: string,
  enabled: boolean,
): DiagramSessionState {
  const [state, setState] = useState<DiagramSessionState>({
    session: null,
    loading: Boolean(enabled),
    error: null,
  });
  const syncedRef = useRef(false);
  const usersKeyRef = useRef('');

  useEffect(() => {
    if (!enabled || !diagramId) {
      return;
    }
    let cancelled = false;
    usersKeyRef.current = '\0';
    let provider: HocuspocusProvider | null = null;
    let persistence: IndexeddbPersistence | null = null;
    const ydoc = new Y.Doc();

    const update = (patch: Partial<DiagramSession>) => {
      setState((current) => {
        if (!current.session) {
          return current;
        }
        return { ...current, session: { ...current.session, ...patch } };
      });
    };

    const readUsers = () => {
      if (!provider?.awareness) {
        return;
      }
      const localClientId = provider.awareness.clientID;
      const users: CollabUser[] = [];
      provider.awareness.getStates().forEach((awarenessState, clientId) => {
        const user = awarenessState.user as
          | { name?: unknown; color?: unknown }
          | undefined;
        if (typeof user?.name !== 'string' || user.name.length === 0) {
          return;
        }
        users.push({
          clientId,
          name: user.name,
          color:
            typeof user.color === 'string' ? user.color : colorFor(String(clientId)),
          isLocal: clientId === localClientId,
        });
      });
      // Cursor updates arrive many times per second; only re-render when the
      // participant list itself changed.
      const key = users
        .map((item) => `${item.clientId}:${item.name}:${item.color}`)
        .join('|');
      if (key === usersKeyRef.current) {
        return;
      }
      usersKeyRef.current = key;
      update({ users });
    };

    const load = async () => {
      try {
        const token = await createDiagramCollabToken(diagramId);
        if (cancelled) {
          return;
        }
        const currentUser = getSessionState().user;
        const user = {
          name: currentUser?.displayName ?? 'Автор',
          color: colorFor(currentUser?.id ?? diagramId),
        };
        persistence = new IndexeddbPersistence(
          `writer-tool-diagram-${diagramId}`,
          ydoc,
        );
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${window.location.host}${token.websocketPath}?token=${encodeURIComponent(token.token)}`;
        provider = new HocuspocusProvider({
          url,
          name: diagramId,
          document: ydoc,
        });
        provider.on('status', ({ status }: { status: WebSocketStatus }) => {
          syncedRef.current = status === WebSocketStatus.Connected && syncedRef.current;
          update({ status, synced: syncedRef.current });
        });
        provider.on('synced', ({ state: synced }: { state: boolean }) => {
          syncedRef.current = synced;
          update({ synced });
          readUsers();
        });
        provider.on('awarenessChange', readUsers);
        provider.setAwarenessField('user', user);
        setState({
          session: {
            ydoc,
            provider,
            synced: false,
            status: WebSocketStatus.Connecting,
            users: [],
          },
          loading: false,
          error: null,
        });
        readUsers();
      } catch (error) {
        if (!cancelled) {
          setState({
            session: null,
            loading: false,
            error: getApiErrorMessage(
              error,
              'Не удалось подключиться к совместной схеме. Изменения сохранятся через API.',
            ),
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      syncedRef.current = false;
      provider?.destroy();
      persistence?.destroy();
      ydoc.destroy();
    };
  }, [diagramId, enabled]);

  return state;
}

export function diagramsCollabEnabled(): boolean {
  return collabEnabled();
}
