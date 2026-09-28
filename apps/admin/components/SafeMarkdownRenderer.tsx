'use client';

import React from 'react';

interface SafeMarkdownRendererProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Lightweight, safe Markdown renderer without external runtime dependencies.
 * Prevents XSS attacks by structuring tokens into React elements directly.
 */
export function SafeMarkdownRenderer({ content, className, style }: SafeMarkdownRendererProps) {
  if (!content) return null;

  // Clean raw content
  const cleanedContent = content.replace(/\r\n/g, '\n');
  const lines = cleanedContent.split('\n');

  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = '';
  let inList = false;
  let listItems: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushList = (key: string) => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={key} style={{ margin: '0.4rem 0 0.6rem 1.25rem', padding: 0, listStyleType: 'disc' }}>
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushTable = (key: string) => {
    if (inTable && tableRows.length > 0) {
      const header = tableRows[0];
      const rows = tableRows.slice(1);
      elements.push(
        <div key={key} style={{ overflowX: 'auto', margin: '0.6rem 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                {header.map((col, idx) => (
                  <th key={idx} style={{ padding: '0.35rem 0.6rem', border: '1px solid var(--border-color)', fontWeight: 700, textAlign: 'left' }}>
                    {formatInline(col.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-subtle)' }}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} style={{ padding: '0.35rem 0.6rem', border: '1px solid var(--border-color)' }}>
                      {formatInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  const formatInline = (text: string): React.ReactNode => {
    if (!text) return '';

    // Split for inline code, bold, italics, etc.
    const parts: React.ReactNode[] = [];
    let cur = text;
    let idx = 0;

    // Pattern for inline code, bold, italic
    const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
    let match;
    let lastIndex = 0;

    while ((match = inlineRegex.exec(cur)) !== null) {
      if (match.index > lastIndex) {
        parts.push(cur.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code key={idx++} style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1', padding: '0.1rem 0.3rem', borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.85em' }}>
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(<strong key={idx++} style={{ fontWeight: 700 }}>{formatInline(token.slice(2, -2))}</strong>);
      } else if (token.startsWith('__') && token.endsWith('__')) {
        parts.push(<strong key={idx++} style={{ fontWeight: 700 }}>{formatInline(token.slice(2, -2))}</strong>);
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(<em key={idx++} style={{ fontStyle: 'italic' }}>{formatInline(token.slice(1, -1))}</em>);
      } else if (token.startsWith('_') && token.endsWith('_')) {
        parts.push(<em key={idx++} style={{ fontStyle: 'italic' }}>{formatInline(token.slice(1, -1))}</em>);
      } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
        const linkText = token.substring(1, token.indexOf(']('));
        const linkUrl = token.substring(token.indexOf('](') + 2, token.length - 1);
        const isSafeUrl = linkUrl.startsWith('https://') || linkUrl.startsWith('http://') || linkUrl.startsWith('/') || linkUrl.startsWith('mailto:');
        if (isSafeUrl) {
          parts.push(
            <a
              key={idx++}
              href={linkUrl}
              target={linkUrl.startsWith('/') ? '_self' : '_blank'}
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
            >
              {linkText}
            </a>
          );
        } else {
          parts.push(linkText);
        }
      }
      lastIndex = inlineRegex.lastIndex;
    }

    if (lastIndex < cur.length) {
      parts.push(cur.substring(lastIndex));
    }

    return parts.length === 1 ? parts[0] : <span key={Math.random()}>{parts}</span>;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        flushList(`list-before-code-${i}`);
        flushTable(`table-before-code-${i}`);
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockLines = [];
      } else {
        inCodeBlock = false;
        elements.push(
          <div key={`code-${i}`} style={{ background: '#0F172A', color: '#F8FAFC', borderRadius: '6px', padding: '0.65rem 0.9rem', margin: '0.5rem 0', overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace' }}>
            <pre style={{ margin: 0 }}>{codeBlockLines.join('\n')}</pre>
          </div>
        );
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Markdown Table line: | a | b |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushList(`list-before-table-${i}`);
      // Skip separator line |---|---|
      if (line.includes('---')) {
        continue;
      }
      const cells = line.trim().slice(1, -1).split('|');
      if (!inTable) {
        inTable = true;
        tableRows = [cells];
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      flushTable(`table-flush-${i}`);
    }

    // Unordered List item
    const listMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
    if (listMatch) {
      inList = true;
      listItems.push(
        <li key={`li-${i}`} style={{ marginBottom: '0.2rem', lineHeight: 1.5 }}>
          {formatInline(listMatch[3])}
        </li>
      );
      continue;
    } else {
      flushList(`list-flush-${i}`);
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={`blank-${i}`} style={{ height: '0.4rem' }} />);
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.6rem 0 0.3rem', color: 'var(--text-primary)' }}>
          {formatInline(line.slice(4))}
        </h4>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0.75rem 0 0.35rem', color: 'var(--text-primary)' }}>
          {formatInline(line.slice(3))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.85rem 0 0.4rem', color: 'var(--text-primary)' }}>
          {formatInline(line.slice(2))}
        </h2>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={`quote-${i}`} style={{ borderLeft: '3px solid var(--accent-primary)', margin: '0.4rem 0', paddingLeft: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          {formatInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={`p-${i}`} style={{ margin: '0 0 0.35rem 0', lineHeight: 1.55 }}>
        {formatInline(line)}
      </p>
    );
  }

  flushList('list-end');
  flushTable('table-end');

  return (
    <div className={className} style={{ fontSize: '0.875rem', color: 'inherit', ...style }}>
      {elements}
    </div>
  );
}
