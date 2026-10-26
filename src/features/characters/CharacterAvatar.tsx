import { cn } from '@/shared/lib/utils';

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('ru') ?? '')
    .join('');
}

type CharacterAvatarProps = {
  name: string;
  color?: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

const sizes = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
} as const;

export function CharacterAvatar({
  name,
  color = '#8a5a2b',
  avatarUrl,
  size = 'md',
  className,
}: CharacterAvatarProps) {
  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-serif font-medium text-white shadow-inner',
        sizes[size],
        className,
      )}
      style={{ backgroundColor: color }}
      aria-hidden={avatarUrl ? undefined : true}
    >
      {avatarUrl ? (
        <img
          className="h-full w-full object-cover"
          src={avatarUrl}
          alt={`Портрет: ${name}`}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
