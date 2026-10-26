import { WebSocketStatus } from '@hocuspocus/provider';
import { CloudOff, Loader2, Wifi } from 'lucide-react';
import type { CollabSession, CollabUser } from './useCollabSession';

export function CollabStatus({ session }: { session: CollabSession }) {
  const label =
    session.status === WebSocketStatus.Connected
      ? 'Синхронизировано'
      : session.status === WebSocketStatus.Connecting
        ? 'Подключение…'
        : 'Офлайн';
  const Icon =
    session.status === WebSocketStatus.Connected
      ? Wifi
      : session.status === WebSocketStatus.Connecting
        ? Loader2
        : CloudOff;
  return (
    <span
      className="hidden items-center gap-1.5 text-xs text-ink-500 sm:inline-flex"
      title={label}
      data-testid="collab-status"
      data-status={session.status}
    >
      <Icon
        size={13}
        className={
          session.status === WebSocketStatus.Connecting ? 'animate-spin' : undefined
        }
      />
      {label}
    </span>
  );
}

export function PresenceAvatars({ users }: { users: CollabUser[] }) {
  const visible = users.slice(0, 5);
  if (visible.length === 0) {
    return null;
  }
  return (
    <div
      className="hidden items-center -space-x-1.5 sm:flex"
      aria-label={`Участники: ${visible.map((user) => user.name).join(', ')}`}
      data-testid="presence-avatars"
    >
      {visible.map((user) => (
        <span
          key={user.clientId}
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-paper-50 text-[10px] font-semibold text-white"
          style={{ backgroundColor: user.color }}
          title={`${user.name}${user.isLocal ? ' (вы)' : ''}`}
        >
          {user.name.slice(0, 2).toLocaleUpperCase('ru')}
        </span>
      ))}
    </div>
  );
}
