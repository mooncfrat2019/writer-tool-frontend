import { mergeAttributes, Node, ReactNodeViewRenderer } from '@tiptap/react';
import { FootnoteView } from './FootnoteView';

/**
 * Inline footnote reference. The note text is stored in the node attrs so it
 * survives collaboration, version history and export without changing the
 * canonical document shape.
 */
export const Footnote = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-footnote-text') ?? '',
        renderHTML: (attributes) => ({
          'data-footnote-text': attributes.text,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'sup[data-footnote]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'sup',
      mergeAttributes(HTMLAttributes, { 'data-footnote': '' }),
      '[сноска]',
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FootnoteView);
  },
});
