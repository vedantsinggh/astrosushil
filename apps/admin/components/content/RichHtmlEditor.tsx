'use client';

import React, { useMemo, useRef, useState } from 'react';
import { smallButton } from './ui';

/**
 * HTML editor used for blog content and the legal policy pages.
 *
 * The admin has no rich-text editor dependency, so this is a plain HTML textarea with a few
 * tag-inserting buttons and a preview. The backend sanitises the HTML on save (allow-list in
 * apps/api/src/modules/content/content.sanitizer.ts); the preview shows the DRAFT, which may hold
 * anything a user pasted, so it is rendered inside an iframe with an empty `sandbox` attribute
 * (no scripts, no forms, no same-origin access, no navigation of the admin) and a
 * Content-Security-Policy that only allows images and inline styles. It is never injected into
 * the admin page itself.
 */

const PREVIEW_CSP = "default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'";

const PREVIEW_STYLE = `
  body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 15px; line-height: 1.6;
         color: #0F172A; margin: 16px; word-wrap: break-word; }
  h1, h2, h3, h4 { line-height: 1.3; margin: 1.2em 0 0.5em; }
  p { margin: 0 0 1em; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; max-width: 100%; }
  td, th { border: 1px solid #E2E8F0; padding: 6px 10px; }
  blockquote { border-left: 3px solid #CBD5E1; margin: 1em 0; padding: 0.25em 1em; color: #475569; }
  pre, code { background: #F1F5F9; border-radius: 4px; padding: 2px 4px; }
  a { color: #4F46E5; pointer-events: none; }
`;

function previewDocument(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}"><style>${PREVIEW_STYLE}</style></head><body>${html}</body></html>`;
}

/** A sandboxed, script-less rendering of an HTML string. Also used by the read-only views. */
export function HtmlPreview({ html, height = 420, title = 'Preview' }: { html: string; height?: number; title?: string }) {
  const srcDoc = useMemo(() => previewDocument(html), [html]);
  return (
    <iframe
      title={title}
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={srcDoc}
      style={{
        width: '100%',
        height: `${height}px`,
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        background: '#FFF',
      }}
    />
  );
}

interface Snippet {
  label: string;
  title: string;
  before: string;
  after: string;
  placeholder: string;
}

const SNIPPETS: Snippet[] = [
  { label: 'H2', title: 'Heading', before: '<h2>', after: '</h2>\n', placeholder: 'Heading' },
  { label: 'H3', title: 'Sub-heading', before: '<h3>', after: '</h3>\n', placeholder: 'Sub-heading' },
  { label: 'P', title: 'Paragraph', before: '<p>', after: '</p>\n', placeholder: 'Paragraph text' },
  { label: 'B', title: 'Bold', before: '<strong>', after: '</strong>', placeholder: 'bold text' },
  { label: 'I', title: 'Italic', before: '<em>', after: '</em>', placeholder: 'italic text' },
  { label: '• List', title: 'Bulleted list', before: '<ul>\n  <li>', after: '</li>\n</ul>\n', placeholder: 'List item' },
  { label: '1. List', title: 'Numbered list', before: '<ol>\n  <li>', after: '</li>\n</ol>\n', placeholder: 'List item' },
  { label: 'Quote', title: 'Quotation', before: '<blockquote>', after: '</blockquote>\n', placeholder: 'Quotation' },
  { label: 'Link', title: 'Link', before: '<a href="https://">', after: '</a>', placeholder: 'link text' },
  { label: 'Image', title: 'Image by URL', before: '<img src="', after: '" alt="" />\n', placeholder: 'https://image-url' },
];

export interface RichHtmlEditorProps {
  value: string;
  onChange: (html: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
}

export function RichHtmlEditor({ value, onChange, rows = 18, placeholder, disabled, invalid }: RichHtmlEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insert = (snippet: Snippet) => {
    const textarea = textareaRef.current;
    const start = textarea ? textarea.selectionStart : value.length;
    const end = textarea ? textarea.selectionEnd : value.length;
    const selected = value.slice(start, end) || snippet.placeholder;
    const next = `${value.slice(0, start)}${snippet.before}${selected}${snippet.after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      if (!textarea) return;
      textarea.focus();
      const cursorStart = start + snippet.before.length;
      textarea.setSelectionRange(cursorStart, cursorStart + selected.length);
    });
  };

  const tab = (id: 'edit' | 'preview' | 'split', label: string) => (
    <button
      type="button"
      onClick={() => setMode(id)}
      className={`btn ${mode === id ? 'btn-primary' : 'btn-secondary'}`}
      style={smallButton}
    >
      {label}
    </button>
  );

  const height = Math.max(200, rows * 21);
  const showEditor = mode !== 'preview';
  const showPreview = mode !== 'edit';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {showEditor &&
            SNIPPETS.map((snippet) => (
              <button
                key={snippet.label}
                type="button"
                title={snippet.title}
                className="btn btn-secondary"
                style={smallButton}
                disabled={disabled}
                onClick={() => insert(snippet)}
              >
                {snippet.label}
              </button>
            ))}
        </div>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {tab('edit', 'HTML')}
          {tab('split', 'Side by side')}
          {tab('preview', 'Preview')}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: mode === 'split' ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
        {showEditor && (
          <textarea
            ref={textareaRef}
            className="input-control"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            spellCheck
            style={{
              height: `${height}px`,
              resize: 'vertical',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '0.8rem',
              lineHeight: 1.55,
              borderColor: invalid ? 'var(--badge-danger-text)' : undefined,
            }}
          />
        )}
        {showPreview && <HtmlPreview html={value} height={height} />}
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
        Written as HTML. On save the server keeps headings, paragraphs, lists, emphasis, quotes, code, links, images and tables, and
        removes everything else (scripts, styles, iframes, forms). Links always open in a new tab.
      </p>
    </div>
  );
}
