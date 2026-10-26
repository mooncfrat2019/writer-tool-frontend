import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Link2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/errors';
import { unwrap } from '@/shared/api/request';
import type { components } from '@/shared/api/schema';
import { formatDate } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

type ShareLink = components['schemas']['ShareLink'];
type ShareRole = components['schemas']['ShareRole'];
type ShareTargetType = components['schemas']['ShareTargetType'];

export type ShareTarget = {
  targetType: ShareTargetType;
  targetId: string;
  title: string;
};

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  target: ShareTarget;
};

const roleLabels: Record<ShareRole, string> = {
  viewer: 'Просмотр',
  editor: 'Редактирование',
};

const expiryOptions = [
  { value: '24', label: '24 часа' },
  { value: '168', label: '7 дней' },
  { value: '720', label: '30 дней' },
  { value: '0', label: 'Без ограничения' },
];

export function ShareDialog({
  open,
  onOpenChange,
  projectId,
  target,
}: ShareDialogProps) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<ShareRole>('editor');
  const [expiresInHours, setExpiresInHours] = useState('168');
  const [createdLink, setCreatedLink] = useState<ShareLink | null>(null);
  const [copied, setCopied] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setCreatedLink(null);
      setCopied(false);
    }
    onOpenChange(next);
  };

  const linksQuery = useQuery({
    queryKey: ['share-links', projectId],
    queryFn: async () =>
      unwrap(
        await api.GET('/projects/{projectId}/share-links', {
          params: { path: { projectId } },
        }),
      ),
    enabled: open,
  });

  const createLink = useMutation({
    mutationFn: async () => {
      const body: components['schemas']['ShareLinkCreate'] = {
        targetType: target.targetType,
        role,
        expiresInHours: Number(expiresInHours),
      };
      if (target.targetType === 'document') {
        body.targetId = target.targetId;
      }
      return unwrap(
        await api.POST('/projects/{projectId}/share-links', {
          params: { path: { projectId } },
          body,
        }),
      );
    },
    onSuccess: (link) => {
      setCreatedLink(link);
      setCopied(false);
      void queryClient.invalidateQueries({ queryKey: ['share-links', projectId] });
      toast.success('Ссылка создана.');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось создать ссылку.'));
    },
  });

  const revokeLink = useMutation({
    mutationFn: async (shareId: string) => {
      await api.DELETE('/share-links/{shareId}', {
        params: { path: { shareId } },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['share-links', projectId] });
      toast.success('Ссылка отозвана.');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Не удалось отозвать ссылку.'));
    },
  });

  const relevantLinks = (linksQuery.data?.items ?? []).filter(
    (link) =>
      link.targetType === target.targetType && link.targetId === target.targetId,
  );

  const absoluteLink = createdLink?.url
    ? new URL(createdLink.url, window.location.origin).toString()
    : '';

  const copyLink = async () => {
    if (!absoluteLink) {
      return;
    }
    try {
      await navigator.clipboard.writeText(absoluteLink);
      setCopied(true);
      toast.success('Ссылка скопирована.');
    } catch {
      toast.error('Не удалось скопировать ссылку. Выделите её вручную.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {target.targetType === 'project' ? 'Поделиться проектом' : 'Поделиться главой'}
          </DialogTitle>
          <DialogDescription>
            «{target.title}» · получатель сможет войти или зарегистрироваться по ссылке.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Доступ</Label>
            <Select value={role} onValueChange={(value) => setRole(value as ShareRole)}>
              <SelectTrigger aria-label="Доступ по ссылке">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Редактирование</SelectItem>
                <SelectItem value="viewer">Только просмотр</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Срок действия</Label>
            <Select value={expiresInHours} onValueChange={setExpiresInHours}>
              <SelectTrigger aria-label="Срок действия ссылки">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {expiryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          variant="accent"
          className="w-full"
          onClick={() => createLink.mutate()}
          disabled={createLink.isPending}
        >
          <Link2 size={16} />
          {createLink.isPending ? 'Создаём…' : 'Создать ссылку'}
        </Button>

        {createdLink ? (
          <div className="rounded-md border border-paper-200 bg-paper-100/60 p-3">
            <p className="text-xs font-medium text-ink-700">Ссылка создана</p>
            <div className="mt-2 flex gap-2">
              <Input
                readOnly
                aria-label="Ссылка для доступа"
                value={absoluteLink}
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => void copyLink()}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-ink-500">
              Скопируйте ссылку сейчас: позже увидеть её целиком будет нельзя.
            </p>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-ink-500">
            Ранее созданные ссылки
          </p>
          {linksQuery.isLoading ? (
            <p className="text-sm text-ink-500">Загрузка…</p>
          ) : relevantLinks.length === 0 ? (
            <p className="text-sm text-ink-500">Для этого объекта ссылок пока нет.</p>
          ) : (
            <ul className="space-y-2">
              {relevantLinks.map((link) => (
                <li
                  key={link.id}
                  className="flex items-center gap-3 rounded-md border border-paper-200 bg-white/60 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={link.role === 'editor' ? 'accent' : 'neutral'}>
                        {roleLabels[link.role]}
                      </Badge>
                      <span className="text-xs text-ink-500">
                        {link.expiresAt ? `до ${formatDate(link.expiresAt)}` : 'бессрочно'}
                      </span>
                      <span className="text-xs text-ink-500">
                        использований: {link.useCount}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Отозвать ссылку"
                    onClick={() => revokeLink.mutate(link.id)}
                    disabled={revokeLink.isPending}
                  >
                    <Trash2 size={15} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
