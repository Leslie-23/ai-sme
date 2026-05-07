import React from 'react';

export function MarkdownText({ text }: { text: string }) {
  return <div className="space-y-3">{renderBlocks(text)}</div>;
}

function renderBlocks(text: string): React.ReactNode[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let listKind: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`p-${key++}`} className="whitespace-pre-wrap">
        {renderInline(paragraph.join(' '))}
      </p>
    );
    paragraph = [];
  };

  const flushList = () => {
    if (listItems.length === 0 || !listKind) return;
    const Tag = listKind;
    blocks.push(
      <Tag
        key={`l-${key++}`}
        className={`space-y-1 pl-5 ${listKind === 'ol' ? 'list-decimal' : 'list-disc'}`}
      >
        {listItems.map((item, index) => (
          <li key={`${key}-${index}`} className="marker:text-neutral-500">
            {renderInline(item)}
          </li>
        ))}
      </Tag>
    );
    listItems = [];
    listKind = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const Tag = `h${Math.min(level + 1, 6)}` as keyof React.JSX.IntrinsicElements;
      const headingClass =
        level === 1
          ? 'text-lg font-semibold text-neutral-900'
          : level === 2
            ? 'text-base font-semibold text-neutral-900'
            : 'text-sm font-semibold text-neutral-900';
      blocks.push(
        <Tag key={`h-${key++}`} className={headingClass}>
          {renderInline(heading[2])}
        </Tag>
      );
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      if (listKind && listKind !== 'ul') flushList();
      listKind = 'ul';
      listItems.push(bullet[1]);
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      if (listKind && listKind !== 'ol') flushList();
      listKind = 'ol';
      listItems.push(ordered[1]);
      continue;
    }

    if (listKind) flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+?\*\*|`[^`]+`|\*[^*\n]+?\*)/g;
  let last = 0;
  let match: RegExpExecArray | null = null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `i-${match.index}-${nodes.length}`;
    if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={key} className="rounded bg-neutral-100 px-1 py-0.5 text-[0.95em]">
          {token.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
