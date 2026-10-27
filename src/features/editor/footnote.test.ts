import { Collaboration } from '@tiptap/extension-collaboration';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { Footnote } from './footnote';
import { footnoteNumberAt } from './footnoteNumber';

function createEditor() {
  return new Editor({
    extensions: [StarterKit, Footnote],
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Текст' }] },
      ],
    },
  });
}

describe('Footnote', () => {
  it('numbers footnotes in reading order', () => {
    const editor = createEditor();
    editor.commands.insertContent([
      { type: 'footnote', attrs: { text: 'Первая' } },
      { type: 'text', text: ' между ' },
      { type: 'footnote', attrs: { text: 'Вторая' } },
    ]);

    const found: Array<{ text: unknown; number: number }> = [];
    editor.state.doc.descendants((node, position) => {
      if (node.type.name === 'footnote') {
        found.push({
          text: node.attrs.text,
          number: footnoteNumberAt(editor.state.doc, position),
        });
      }
      return true;
    });

    expect(found).toEqual([
      { text: 'Первая', number: 1 },
      { text: 'Вторая', number: 2 },
    ]);
    editor.destroy();
  });

  it('inserts an empty footnote', () => {
    const editor = createEditor();
    editor.commands.insertContent({
      type: 'footnote',
      attrs: { text: '' },
    });

    let count = 0;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'footnote') {
        count += 1;
      }
      return true;
    });

    expect(count).toBe(1);
    editor.destroy();
  });

  it('survives the collaboration sync', async () => {
    const ydoc = new Y.Doc();
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Footnote,
        Collaboration.configure({ document: ydoc }),
      ],
      content: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Текст' }] },
        ],
      },
    });
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    editor.commands.insertContent({
      type: 'footnote',
      attrs: { text: '' },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    let count = 0;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'footnote') {
        count += 1;
      }
      return true;
    });

    expect(count).toBe(1);
    editor.destroy();
    ydoc.destroy();
  });

  it('keeps the note text in the canonical JSON', () => {
    const editor = createEditor();
    editor.commands.insertContent({
      type: 'footnote',
      attrs: { text: 'Примечание' },
    });

    const json = editor.getJSON();
    const paragraph = json.content?.[0];
    const footnote = paragraph?.content?.find(
      (node) => node.type === 'footnote',
    ) as { attrs?: { text?: string } } | undefined;

    expect(footnote?.attrs?.text).toBe('Примечание');
    editor.destroy();
  });
});
