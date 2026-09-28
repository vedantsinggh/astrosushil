'use client';

import React from 'react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Astrology Navigation',
      shortcuts: [
        { keys: ['Alt', '1'], label: 'Birth Chart (Kundli)' },
        { keys: ['Alt', '2'], label: 'Planets Table' },
        { keys: ['Alt', '3'], label: 'Houses & Bhavas' },
        { keys: ['Alt', '4'], label: 'Vargas (Divisional Charts)' },
        { keys: ['Alt', '5'], label: 'Vimshottari Dashas' },
        { keys: ['Alt', '6'], label: 'Yogas & Predictions' },
        { keys: ['Alt', '7'], label: 'Panchanga' },
        { keys: ['Alt', '8'], label: 'Ashtakavarga' },
        { keys: ['Alt', '9'], label: 'Shadbala Strengths' },
        { keys: ['Alt', '0'], label: 'KP System' },
      ],
    },
    {
      title: 'Consultation Actions',
      shortcuts: [
        { keys: ['Alt', 'N'], label: 'Open Notes Panel' },
        { keys: ['Alt', 'J'], label: 'Open Jyoti AI Assistant' },
        { keys: ['Alt', 'R'], label: 'Open Reports Panel' },
        { keys: ['Alt', 'T'], label: 'Open Timeline' },
        { keys: ['Alt', 'H'], label: 'Open Session History' },
      ],
    },
    {
      title: 'Workspace & Dialogs',
      shortcuts: [
        { keys: ['Ctrl / ⌘', 'K'], label: 'Open Live Session Quick Search' },
        { keys: ['Alt', 'S'], label: 'Toggle Navigation Sidebar' },
        { keys: ['Alt', 'C'], label: 'Toggle Client Context Panel' },
        { keys: ['?'], label: 'Show/Hide Keyboard Shortcuts' },
        { keys: ['Esc'], label: 'Close Active Modal / Palette' },
      ],
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '680px',
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '1.75rem',
          background: '#0F172A',
          color: '#F8FAFC',
          border: '1px solid #334155',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC' }}>
              ⌨️ Consultation Keyboard Shortcuts
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
              Designed for rapid, non-disruptive navigation during live consultations.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6366F1', marginBottom: '0.5rem' }}>
                {group.title}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {group.shortcuts.map((s) => (
                  <div
                    key={s.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.35rem 0.5rem',
                      background: '#1E293B',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span style={{ color: '#CBD5E1' }}>{s.label}</span>
                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          style={{
                            background: '#0F172A',
                            border: '1px solid #475569',
                            borderRadius: '4px',
                            padding: '0.15rem 0.45rem',
                            fontSize: '0.72rem',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#FBBF24',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button onClick={onClose} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
            Got it (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
