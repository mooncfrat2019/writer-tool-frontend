import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlignLeft,
  BookOpen,
  GripVertical,
  Layers,
  PenLine,
  Plus,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { formatNumber } from '@/shared/lib/format';
import {
  flattenTree,
  resolveNodeDrop,
  type BookNode,
  type BookNodeType,
  type NodeMoveTarget,
} from '@/shared/lib/tree';
import { Badge } from '@/shared/ui/badge';
import { nodeStatusLabels, nodeStatusTones, nodeTypeLabels } from './constants';

const nodeIcon: Record<BookNodeType, typeof Layers> = {
  part: Layers,
  chapter: BookOpen,
  scene: AlignLeft,
};

type SortableNodeProps = {
  node: BookNode;
  depth: number;
  selected: boolean;
  canEdit: boolean;
  isOver: boolean;
  onSelect: (nodeId: string) => void;
  onCreateChild: (parent: BookNode) => void;
  onDelete: (node: BookNode) => void;
  onOpenEditor: (node: BookNode) => void;
};

function SortableNode({
  node,
  depth,
  selected,
  canEdit,
  isOver,
  onSelect,
  onCreateChild,
  onDelete,
  onOpenEditor,
}: SortableNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id, disabled: !canEdit });
  const Icon = nodeIcon[node.type];
  const hasChildren = Boolean(node.children?.length);
  const canAddChild = node.type !== 'scene';

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        paddingLeft: `${Math.min(depth, 4) * 18}px`,
      }}
      className={cn('relative', isDragging && 'z-10 opacity-40')}
      data-testid={`structure-node-${node.type}`}
    >
      {depth > 0 ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 top-0 border-l border-paper-200"
          style={{ left: `${Math.min(depth, 4) * 18 - 9}px` }}
        />
      ) : null}
      <div
        className={cn(
          'group my-0.5 flex items-center gap-1 rounded-md border border-transparent pr-1 transition',
          selected ? 'border-paper-300 bg-white shadow-sm' : 'hover:bg-white/65',
          isOver && canEdit && 'border-accent-500/60 bg-accent-600/5',
        )}
      >
        {canEdit ? (
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="ml-1 cursor-grab touch-none rounded p-1 text-ink-500/50 opacity-60 transition hover:bg-paper-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 group-hover:opacity-100 active:cursor-grabbing"
            aria-label={`Переместить «${node.title}»`}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={14} />
          </button>
        ) : (
          <span className="ml-1 w-6" aria-hidden="true" />
        )}

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          onClick={() => onSelect(node.id)}
          aria-current={selected ? 'true' : undefined}
        >
          <Icon
            className={cn(
              'shrink-0',
              node.type === 'part' ? 'text-accent-700' : 'text-ink-500',
            )}
            size={node.type === 'part' ? 16 : 14}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink-900">
              {node.title}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
              <span>{nodeTypeLabels[node.type]}</span>
              <span aria-hidden="true">·</span>
              <span>{formatNumber(node.wordCount)} слов</span>
              {node.targetWordCount ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>цель {formatNumber(node.targetWordCount)}</span>
                </>
              ) : null}
              {hasChildren ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{node.children?.length} внутри</span>
                </>
              ) : null}
            </span>
          </span>
          <Badge className="hidden sm:inline-flex" tone={nodeStatusTones[node.status]}>
            {nodeStatusLabels[node.status]}
          </Badge>
        </button>

        <div className="flex shrink-0 items-center">
          {node.documentId ? (
            <button
              type="button"
              className="rounded p-1.5 text-ink-500 opacity-0 transition hover:bg-paper-100 hover:text-ink-900 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 group-hover:opacity-100"
              aria-label={`Открыть «${node.title}» в редакторе`}
              onClick={() => onOpenEditor(node)}
            >
              <PenLine size={14} />
            </button>
          ) : null}
          {canEdit && canAddChild ? (
            <button
              type="button"
              className="rounded p-1.5 text-ink-500 opacity-0 transition hover:bg-paper-100 hover:text-ink-900 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 group-hover:opacity-100"
              aria-label={`Добавить вложенный элемент в «${node.title}»`}
              onClick={() => onCreateChild(node)}
            >
              <Plus size={14} />
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="rounded p-1.5 text-ink-500 opacity-0 transition hover:bg-red-50 hover:text-red-800 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 group-hover:opacity-100"
              aria-label={`Удалить «${node.title}»`}
              onClick={() => onDelete(node)}
            >
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

type StructureTreeProps = {
  nodes: BookNode[];
  selectedId: string | null;
  canEdit: boolean;
  onSelect: (nodeId: string) => void;
  onCreateChild: (parent: BookNode) => void;
  onDelete: (node: BookNode) => void;
  onOpenEditor: (node: BookNode) => void;
  onMove: (node: BookNode, target: NodeMoveTarget) => void;
};

export function StructureTree({
  nodes,
  selectedId,
  canEdit,
  onSelect,
  onCreateChild,
  onDelete,
  onOpenEditor,
  onMove,
}: StructureTreeProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const flat = useMemo(() => flattenTree(nodes), [nodes]);
  const activeNode = activeId
    ? (flat.find((entry) => entry.node.id === activeId)?.node ?? null)
    : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const draggedId = String(event.active.id);
    setActiveId(null);
    setOverId(null);
    if (!event.over) {
      return;
    }
    const dragged = flat.find((entry) => entry.node.id === draggedId)?.node;
    if (!dragged) {
      return;
    }

    const activeRect = event.active.rect.current.translated;
    const overRect = event.over.rect;
    const dropAfter = activeRect
      ? activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2
      : false;
    const target = resolveNodeDrop(nodes, draggedId, String(event.over.id), dropAfter);
    if (target) {
      onMove(dragged, target);
    }
  };

  if (nodes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-paper-300 px-6 py-14 text-center">
        <Layers className="mx-auto text-ink-500" size={24} />
        <p className="mt-3 font-serif text-xl text-ink-900">Структура пока пуста</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-ink-500">
          Начните с части или сразу с главы. Затем добавьте сцены — у каждой будет
          свой текст.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={(event) => setOverId(event.over ? String(event.over.id) : null)}
      onDragCancel={() => {
        setActiveId(null);
        setOverId(null);
      }}
      onDragEnd={handleDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            'Нажмите пробел, чтобы взять элемент. Стрелками выберите новое место, пробелом подтвердите, Escape отменит перемещение.',
        },
      }}
    >
      <SortableContext
        items={flat.map((entry) => entry.node.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-0.5" aria-label="Структура книги">
          {flat.map(({ node, depth }) => (
            <SortableNode
              key={node.id}
              node={node}
              depth={depth}
              selected={selectedId === node.id}
              canEdit={canEdit}
              isOver={overId === node.id}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
              onOpenEditor={onOpenEditor}
            />
          ))}
        </ul>
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeNode ? (
          <div className="rounded-md border border-paper-300 bg-paper-50 px-3 py-2 text-sm font-medium text-ink-900 shadow-lg">
            {activeNode.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
