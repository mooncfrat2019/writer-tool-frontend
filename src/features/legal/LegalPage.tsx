import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { usePageMeta } from '@/shared/lib/usePageMeta';
import { LegalLayout } from './LegalLayout';
import type { LegalBlock, LegalDocument } from './types';

function InlineText({ text }: { text: string }) {
  const tokens = text.split(/(`[^`]+`|https?:\/\/[^\s)]+)/g);
  const nodes: ReactNode[] = [];
  tokens.forEach((token, index) => {
    if (!token) {
      return;
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code key={index} className="rounded bg-paper-100 px-1 py-0.5 text-[0.9em] text-ink-700">
          {token.slice(1, -1)}
        </code>,
      );
      return;
    }
    if (token.startsWith('http')) {
      const trailing = token.match(/[.,;:]+$/)?.[0] ?? '';
      const href = trailing ? token.slice(0, -trailing.length) : token;
      nodes.push(
        <span key={index}>
          <a
            className="text-accent-700 underline-offset-4 hover:underline"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            {href}
          </a>
          {trailing}
        </span>,
      );
      return;
    }
    nodes.push(token);
  });
  return <>{nodes}</>;
}

function Block({ block }: { block: LegalBlock }) {
  if (block.type === 'h2') {
    return (
      <>
        {block.aliases?.map((alias) => (
          <span key={alias} id={alias} className="block h-0 scroll-mt-24" aria-hidden="true" />
        ))}
        <h2 id={block.id} className="mt-10 scroll-mt-24 font-serif text-2xl text-ink-900">
          {block.text}
        </h2>
      </>
    );
  }
  if (block.type === 'h3') {
    return <h3 className="mt-6 text-base font-semibold text-ink-900">{block.text}</h3>;
  }
  if (block.type === 'ul') {
    return (
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-700">
        {block.items.map((item, index) => (
          <li key={index}>
            <InlineText text={item} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p className="mt-3 text-sm leading-relaxed text-ink-700">
      <InlineText text={block.text} />
    </p>
  );
}

export function LegalPage({
  document,
  noIndex = false,
}: {
  document: LegalDocument;
  noIndex?: boolean;
}) {
  usePageMeta(
    `${document.title} — Writer Tool`,
    `${document.title}: редакция от ${document.updatedAt}. Writer Tool — мастерская текста.`,
    noIndex,
  );

  return (
    <LegalLayout>
      <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent-700">
          Документы
        </p>
        <h1 className="mt-3 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
          {document.title}
        </h1>
        {document.subtitle ? (
          <p className="mt-2 text-base leading-relaxed text-ink-600">{document.subtitle}</p>
        ) : null}
        <p className="mt-4 text-xs uppercase tracking-[0.12em] text-ink-500">
          Редакция от {document.updatedAt}
        </p>

        <article className="mt-8 border-t border-paper-200 pt-2">
          {document.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </article>

        <div className="mt-12 flex flex-wrap gap-4 text-sm">
          <Link
            className="font-medium text-accent-700 underline-offset-4 hover:underline"
            to="/login"
          >
            Войти в мастерскую
          </Link>
          <Link
            className="font-medium text-accent-700 underline-offset-4 hover:underline"
            to="/legal/offer"
          >
            Публичная оферта
          </Link>
          <Link
            className="font-medium text-accent-700 underline-offset-4 hover:underline"
            to="/legal/terms"
          >
            Пользовательское соглашение
          </Link>
        </div>
      </main>
    </LegalLayout>
  );
}
