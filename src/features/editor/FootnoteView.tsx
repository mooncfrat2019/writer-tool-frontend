import {
  NodeViewWrapper,
  useEditorState,
  type NodeViewProps,
} from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { footnoteNumberAt } from './footnoteNumber';

export function FootnoteView({
  editor,
  node,
  getPos,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const text = typeof node.attrs.text === 'string' ? node.attrs.text : '';
  const [open, setOpen] = useState(() => text.trim() === '');
  const [draft, setDraft] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const number = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      footnoteNumberAt(current.state.doc, getPos()),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    // Focusing synchronously while the insertion transaction is still being
    // projected into Yjs makes the collaboration binding drop the new node.
    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const save = () => {
    const value = draft.trim();
    if (!value) {
      return;
    }
    updateAttributes({ text: value });
    setDraft(value);
    setOpen(false);
  };

  const remove = () => {
    const position = getPos();
    if (position === undefined) {
      return;
    }
    editor
      .chain()
      .focus()
      .deleteRange({ from: position, to: position + node.nodeSize })
      .run();
  };

  return (
    <NodeViewWrapper
      as="sup"
      className={cn('footnote-marker', selected && 'footnote-marker--selected')}
      data-footnote=""
    >
      <button
        type="button"
        className="footnote-marker__button"
        aria-label={`Сноска ${number || '?'}: ${text || 'пустая'}`}
        title={text || 'Сноска'}
        onClick={() => {
          setDraft(text);
          setOpen((value) => !value);
        }}
        onMouseDown={(event) => event.preventDefault()}
      >
        {number || '?'}
      </button>
      {open ? (
        <span
          className="footnote-popover"
          contentEditable={false}
          onMouseDown={(event) => event.stopPropagation()}
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (
              !event.currentTarget.contains(next as globalThis.Node | null) &&
              draft.trim() === ''
            ) {
              remove();
            }
          }}
        >
          <span className="footnote-popover__title">
            Сноска{number ? ` ${number}` : ''}
          </span>
          <textarea
            ref={textareaRef}
            className="footnote-popover__input"
            value={draft}
            rows={3}
            placeholder="Текст сноски"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setOpen(false);
              }
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                save();
              }
            }}
          />
          <span className="footnote-popover__actions">
            <button type="button" onClick={save} disabled={!draft.trim()}>
              Сохранить
            </button>
            <button type="button" onClick={remove}>
              Удалить
            </button>
          </span>
        </span>
      ) : null}
    </NodeViewWrapper>
  );
}
