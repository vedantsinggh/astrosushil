'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ConsultationNote } from '../lib/live-session-context';

export interface SearchItem {
  id: string;
  category: 'Module' | 'Planet' | 'Note' | 'Report';
  title: string;
  subtitle?: string;
  icon: string;
  action: () => void;
}

interface LiveSessionSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (sectionKey: string) => void;
  notes: ConsultationNote[];
  reports: any[];
  planets?: any[];
}

const ALL_MODULES = [
  { key: 'birth-chart', title: 'Birth Chart (Kundli)', icon: '🔯', keywords: 'kundli lagna d1 chart ascendant diamond' },
  { key: 'planets', title: 'Planets Placements', icon: '🪐', keywords: 'grahas sun moon mars mercury jupiter venus saturn rahu ketu degrees retrograde' },
  { key: 'houses', title: 'Houses & Bhavas', icon: '🏠', keywords: 'bhavas 1st 2nd 3rd 4th 5th 6th 7th 8th 9th 10th 11th 12th lords occupants cusps' },
  { key: 'vargas', title: 'Vargas (Divisional Charts)', icon: '📐', keywords: 'navamsha d9 hora d2 drekkana d3 saptamsa d7 dasamsa d10 dvadasamsa d12 trimsamsa d30' },
  { key: 'dashas', title: 'Vimshottari Dashas', icon: '🌙', keywords: 'mahadasha antardasha pratyantardasha timeline timing periods dasha' },
  { key: 'yogas', title: 'Yogas & Predictions', icon: '✨', keywords: 'raja yoga dhana yoga gajakesari budhaditya panch mahapurusha evidence rules' },
  { key: 'panchanga', title: 'Panchanga (5 Pillars)', icon: '📅', keywords: 'tithi vara nakshatra yoga karana sunrise sunset moonrise' },
  { key: 'ashtakavarga', title: 'Ashtakavarga Matrix', icon: '🔢', keywords: 'bav sav bindus points sarvashtakavarga bhinnashtakavarga shodhana transit' },
  { key: 'shadbala', title: 'Shadbala Planetary Strengths', icon: '💪', keywords: 'sthana bala dig bala kala bala cheshta bala naisargika drik rupas virupas' },
  { key: 'kp', title: 'KP System & Cusps', icon: '⭐', keywords: 'krishnamurti paddhati sub lord star lord sub-sub cusps significators' },
  { key: 'jyoti', title: 'Jyoti AI Assistant', icon: '💬', keywords: 'ai chatbot ask question interpretation guidance' },
  { key: 'notes', title: 'Consultation Notes', icon: '📝', keywords: 'notes draft observations remarks writing' },
  { key: 'reports', title: 'Client Reports', icon: '📄', keywords: 'pdf reports generate download status' },
  { key: 'timeline', title: 'Session Timeline', icon: '📋', keywords: 'timeline events activity history log' },
  { key: 'history', title: 'Past Consultations', icon: '🕐', keywords: 'history past previous sessions archive' },
];

export function LiveSessionSearchModal({
  isOpen,
  onClose,
  onNavigate,
  notes,
  reports,
  planets = [],
}: LiveSessionSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items: SearchItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: SearchItem[] = [];

    // 1. Modules
    ALL_MODULES.forEach((mod) => {
      if (!q || mod.title.toLowerCase().includes(q) || mod.keywords.includes(q)) {
        result.push({
          id: `mod-${mod.key}`,
          category: 'Module',
          title: mod.title,
          subtitle: `Astrology section`,
          icon: mod.icon,
          action: () => {
            onNavigate(mod.key);
            onClose();
          },
        });
      }
    });

    // 2. Planets
    if (planets && planets.length > 0) {
      planets.forEach((p) => {
        const pName = p.planet || p.name || '';
        const pSign = p.sign || p.rashiName || '';
        const pDeg = typeof p.degreeInRashi === 'number' ? `${p.degreeInRashi.toFixed(1)}°` : '';
        const pHouse = p.house ? `House ${p.house}` : '';

        if (!q || pName.toLowerCase().includes(q) || pSign.toLowerCase().includes(q)) {
          result.push({
            id: `planet-${pName}`,
            category: 'Planet',
            title: `${pName} ${p.isRetrograde ? '(R)' : ''}`,
            subtitle: `${pSign} ${pDeg} · ${pHouse} · Nakshatra: ${p.nakshatraName || p.nakshatra || '—'}`,
            icon: '🪐',
            action: () => {
              onNavigate('planets');
              onClose();
            },
          });
        }
      });
    }

    // 3. Notes
    if (notes && notes.length > 0) {
      notes.forEach((note) => {
        const text = note.content || '';
        const subject = note.subject || '';
        if (
          !q ||
          subject.toLowerCase().includes(q) ||
          text.toLowerCase().includes(q) ||
          (note.section && note.section.toLowerCase().includes(q))
        ) {
          result.push({
            id: `note-${note.id}`,
            category: 'Note',
            title: subject ? `Note: ${subject}` : `Note: ${text.slice(0, 40)}...`,
            subtitle: note.section ? `@ ${note.section}` : text.slice(0, 60),
            icon: '📝',
            action: () => {
              onNavigate('notes');
              onClose();
            },
          });
        }
      });
    }

    // 4. Reports
    if (reports && reports.length > 0) {
      reports.forEach((r) => {
        const rType = r.reportType?.replace(/_/g, ' ') || 'Report';
        if (!q || rType.toLowerCase().includes(q) || r.status.toLowerCase().includes(q)) {
          result.push({
            id: `report-${r.id}`,
            category: 'Report',
            title: `${rType} Report`,
            subtitle: `Status: ${r.status} · Created ${new Date(r.createdAt).toLocaleDateString()}`,
            icon: '📄',
            action: () => {
              onNavigate('reports');
              onClose();
            },
          });
        }
      });
    }

    return result;
  }, [query, planets, notes, reports, onNavigate, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 9999,
        paddingTop: '10vh',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '580px',
          width: '90%',
          background: '#0F172A',
          color: '#F8FAFC',
          border: '1px solid #334155',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1rem', borderBottom: '1px solid #1E293B', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.1rem', color: '#64748B' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search astrology modules, planets, notes, reports..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#F8FAFC',
              fontSize: '0.95rem',
            }}
          />
          <kbd style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '4px', padding: '0.15rem 0.4rem', fontSize: '0.7rem', color: '#94A3B8' }}>
            Esc
          </kbd>
        </div>

        {/* Results list */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '0.5rem' }}>
          {items.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
              No matches found for &quot;{query}&quot;
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    borderLeft: isSelected ? '3px solid #6366F1' : '3px solid transparent',
                    transition: 'background 0.1s ease',
                  }}
                >
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{item.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? '#A5B4FC' : '#F1F5F9' }}>
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', background: '#1E293B', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div style={{ padding: '0.5rem 1rem', background: '#090D16', borderTop: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748B' }}>
          <span>Navigate with ↑ ↓ · Select with Enter</span>
          <span>Filtered to active consultation context</span>
        </div>
      </div>
    </div>
  );
}
