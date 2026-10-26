import { HocuspocusProvider, WebSocketStatus } from '@hocuspocus/provider';
import { useEffect, useRef, useState } from 'react';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';
import { getApiErrorMessage } from '@/shared/api/errors';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import { getSessionState } from '@/features/auth/session';

export type CollabUser = {
  clientId: number;
  name: string;
  color: string;
  isLocal: boolean;
};

export type CollabSession = {
  status: WebSocketStatus;
  synced: boolean;
  syncedRef: React.MutableRefObject<boolean>;
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  user: { name: string; color: string };
  users: CollabUser[];
};

export type CollabState = {
  session: CollabSession | null;
  loading: boolean;
  error: string | null;
  fallbackReason: string | null;
  accessRevoked: boolean;
};

const USER_COLORS = ['#8a5a2b', '#4a6a7a', '#7a4a5a', '#4a7a5a', '#6a5a8a'];

function colorFor(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return USER_COLORS[hash % USER_COLORS.length];
}

export function collabEnabled(): boolean {
  return import.meta.env.VITE_COLLAB_ENABLED === 'true';
}

function generationKey(documentId: string): string {
  return `writer-tool-doc-generation-${documentId}`;
}

function readStoredGeneration(documentId: string): string | null {
  try {
    return window.localStorage.getItem(generationKey(documentId));
  } catch {
    return null;
  }
}

function storeGeneration(documentId: string, generation: string): void {
  try {
    window.localStorage.setItem(generationKey(documentId), generation);
  } catch {
    // Generation tracking is best-effort; the server still rejects stale tokens.
  }
}

function clearLocalYjs(documentId: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.deleteDatabase(`writer-tool-doc-${documentId}`);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function useCollabSession(documentId: string, enabled: boolean): CollabState {
  const [state, setState] = useState<CollabState>(() =>
    enabled
      ? {
          session: null,
          loading: true,
          error: null,
          fallbackReason: null,
          accessRevoked: false,
        }
      : {
          session: null,
          loading: false,
          error: null,
          fallbackReason: null,
          accessRevoked: false,
        },
  );
  const syncedRef = useRef(false);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const accessRevokedRef = useRef(false);
  const checkAccessRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let provider: HocuspocusProvider | null = null;
    let persistence: IndexeddbPersistence | null = null;
    const ydoc = new Y.Doc();
    syncedRef.current = false;
    accessRevokedRef.current = false;

    const updateSession = (patch: Partial<CollabSession>) => {
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
      updateSession({ users });
    };

    const load = async () => {
      try {
        const token = unwrap(
          await api.POST('/documents/{documentId}/collab-token', {
            params: { path: { documentId } },
          }),
        );
        if (cancelled) {
          return;
        }
        if (!token.collabAvailable) {
          setState({
            session: null,
            loading: false,
            error: null,
            fallbackReason: token.reason ?? 'legacy_document_without_yjs_state',
            accessRevoked: false,
          });
          return;
        }

        // A generation changes on version restore. Drop the local Yjs state
        // before connecting, otherwise the offline copy would merge the old
        // text back into the restored document.
        const generation = String(token.generation);
        if (readStoredGeneration(documentId) !== generation) {
          await clearLocalYjs(documentId);
          storeGeneration(documentId, generation);
        }
        if (cancelled) {
          return;
        }

        const currentUser = getSessionState().user;
        const user = {
          name: currentUser?.displayName ?? 'Автор',
          color: colorFor(currentUser?.id ?? documentId),
        };

        persistence = new IndexeddbPersistence(`writer-tool-doc-${documentId}`, ydoc);
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${window.location.host}${token.websocketPath}?token=${encodeURIComponent(token.token)}`;
        provider = new HocuspocusProvider({
          url,
          name: documentId,
          document: ydoc,
        });
        providerRef.current = provider;

        provider.on('status', ({ status }: { status: WebSocketStatus }) => {
          if (status !== 'connected') {
            syncedRef.current = false;
            checkAccessRef.current();
          }
          updateSession({ status, synced: syncedRef.current });
        });
        provider.on('synced', ({ state: synced }: { state: boolean }) => {
          syncedRef.current = synced;
          updateSession({ synced });
          readUsers();
        });
        provider.on('awarenessChange', readUsers);
        provider.on('authenticationFailed', () => {
          checkAccessRef.current();
          setState((current) => ({
            ...current,
            error:
              'Соединение отклонено. Возможно, доступ отозван или документ был восстановлен из версии.',
          }));
        });
        provider.setAwarenessField('user', user);

        setState({
          session: {
            status: WebSocketStatus.Connecting,
            synced: false,
            syncedRef,
            ydoc,
            provider,
            user,
            users: [],
          },
          loading: false,
          error: null,
          fallbackReason: null,
          accessRevoked: false,
        });
        readUsers();
      } catch (error) {
        if (!cancelled) {
          setState({
            session: null,
            loading: false,
            error: getApiErrorMessage(
              error,
              'Не удалось подключиться к совместному редактированию.',
            ),
            fallbackReason: null,
            accessRevoked: false,
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      syncedRef.current = false;
      providerRef.current = null;
      provider?.destroy();
      persistence?.destroy();
      ydoc.destroy();
    };
  }, [documentId, enabled]);

  const hasSession = state.session !== null;
  useEffect(() => {
    if (!enabled || !hasSession || state.accessRevoked) {
      return;
    }
    let cancelled = false;

    const checkAccess = async () => {
      if (cancelled || accessRevokedRef.current) {
        return;
      }
      try {
        const { response } = await api.GET('/documents/{documentId}/access', {
          params: { path: { documentId } },
        });
        if (response.status !== 403 && response.status !== 404) {
          return;
        }
        accessRevokedRef.current = true;
        providerRef.current?.destroy();
        await clearLocalYjs(documentId);
        if (!cancelled) {
          setState((current) => ({
            ...current,
            accessRevoked: true,
            error: null,
          }));
        }
      } catch {
        // Offline or transient failure: keep editing locally and retry later.
      }
    };

    checkAccessRef.current = () => void checkAccess();
    void checkAccess();
    const interval = window.setInterval(() => void checkAccess(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      checkAccessRef.current = () => undefined;
    };
  }, [documentId, enabled, hasSession, state.accessRevoked]);

  return state;
}
