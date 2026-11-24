'use client';

import React, { useState } from 'react';

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  /** Maximum number of entries (the backend caps tag and keyword lists at 50, areas at 500). */
  max?: number;
  /** Maximum length of one entry. */
  maxLength?: number;
  disabled?: boolean;
}

/** A list of short text entries. Enter or a comma adds one; pasting a comma-separated list adds all. */
export function TagInput({ value, onChange, placeholder, max = 50, maxLength = 100, disabled }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const add = (text: string) => {
    const incoming = text
      .split(',')
      .map((part) => part.trim().slice(0, maxLength))
      .filter(Boolean);
    if (incoming.length === 0) return;
    const next = [...value];
    incoming.forEach((entry) => {
      if (next.length < max && !next.some((existing) => existing.toLowerCase() === entry.toLowerCase())) next.push(entry);
    });
    onChange(next);
    setDraft('');
  };

  return (
    <div>
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.4rem' }}>
          {value.map((tag) => (
            <span key={tag} className="badge badge-info" style={{ textTransform: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              {tag}
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  onClick={() => onChange(value.filter((t) => t !== tag))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, padding: 0 }}
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        className="input-control"
        value={draft}
        disabled={disabled || value.length >= max}
        placeholder={value.length >= max ? `Limit of ${max} reached` : placeholder}
        onChange={(e) => {
          const text = e.target.value;
          if (text.includes(',')) add(text);
          else setDraft(text);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(draft);
          } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
      />
    </div>
  );
}
