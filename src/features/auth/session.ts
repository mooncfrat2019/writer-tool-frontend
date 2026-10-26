import { useSyncExternalStore } from 'react';
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import { setAccessToken } from '@/shared/api/token';
import type { components } from '@/shared/api/schema';

type User = components['schemas']['User'];
type AuthResponse = components['schemas']['AuthResponse'];

export type SessionState = {
  status: 'initializing' | 'authenticated' | 'unauthenticated';
  user: User | null;
};

let sessionState: SessionState = { status: 'initializing', user: null };
let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setState(next: SessionState): void {
  sessionState = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SessionState {
  return sessionState;
}

export function getSessionState(): SessionState {
  return sessionState;
}

export function isAuthenticated(): boolean {
  return sessionState.status === 'authenticated';
}

export function setSessionFromAuth(auth: AuthResponse): void {
  setAccessToken(auth.accessToken);
  bootstrapped = true;
  setState({ status: 'authenticated', user: auth.user });
}

export function clearSessionState(): void {
  setAccessToken(null);
  bootstrapped = true;
  if (sessionState.status !== 'unauthenticated' || sessionState.user !== null) {
    setState({ status: 'unauthenticated', user: null });
  }
}

export async function bootstrapSession(): Promise<SessionState> {
  if (bootstrapped) {
    return sessionState;
  }
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        const auth = unwrap(await api.POST('/auth/refresh'));
        setAccessToken(auth.accessToken);
        bootstrapped = true;
        setState({ status: 'authenticated', user: auth.user });
      } catch {
        setAccessToken(null);
        bootstrapped = true;
        setState({ status: 'unauthenticated', user: null });
      }
    })();
  }
  await bootstrapPromise;
  return sessionState;
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
