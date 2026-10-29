import { useNavigate } from '@tanstack/react-router';
import {
  ChevronDown,
  CreditCard,
  LogOut,
  Settings,
  UserRound,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { useLogout } from './useLogout';
import { useSession } from './session';

type UserMenuProps = {
  align?: 'start' | 'center' | 'end';
};

export function UserMenu({ align = 'end' }: UserMenuProps) {
  const { user } = useSession();
  const logout = useLogout();
  const navigate = useNavigate();
  const initial = user?.displayName.slice(0, 1).toLocaleUpperCase('ru') ?? '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-auto min-h-9 gap-2 px-2 py-1.5"
          aria-label="Меню пользователя"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-600/15 text-xs font-semibold text-accent-700">
            {initial || <UserRound size={14} />}
          </span>
          <span className="hidden max-w-36 truncate text-sm sm:inline">
            {user?.displayName ?? 'Пользователь'}
          </span>
          <ChevronDown className="text-ink-500" size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-60">
        <DropdownMenuLabel>
          <span className="block truncate normal-case tracking-normal text-sm font-medium text-ink-900">
            {user?.displayName}
          </span>
          <span className="mt-0.5 block truncate normal-case tracking-normal text-xs font-normal text-ink-500">
            {user?.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate({ to: '/plans' })}>
          <CreditCard size={15} />
          Тарифы
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate({ to: '/settings' })}>
          <Settings size={15} />
          Настройки
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-800 focus:bg-red-50"
          disabled={logout.isPending}
          onSelect={() => logout.mutate()}
        >
          <LogOut size={15} />
          {logout.isPending ? 'Выходим…' : 'Выйти'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
