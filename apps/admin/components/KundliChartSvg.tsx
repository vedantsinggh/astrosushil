'use client';

import React, { useState, useMemo } from 'react';

export interface ChartPlanet {
  planet: string;
  name?: string;
  sign?: string;
  rashiIndex?: number;
  degree?: number;
  degreeInRashi?: number;
  house?: number;
  nakshatra?: string;
  nakshatraName?: string;
  pada?: number;
  isRetrograde?: boolean;
  retrograde?: boolean;
  dignity?: string;
  combust?: boolean;
}

export interface KundliChartData {
  planets?: ChartPlanet[] | Record<string, any>;
  houses?: Array<{ houseNumber?: number; number?: number; sign?: string; rashiIndex?: number; lord?: string; occupants?: string[] }>;
  ascendant?: { rashiIndex?: number; degreeInRashi?: number; sign?: string; degree?: number };
}

interface KundliChartSvgProps {
  chartData: KundliChartData;
  title?: string;
  size?: number | string;
  onSelectHouse?: (houseNumber: number) => void;
  selectedHouse?: number | null;
}

const RASHI_NAMES = [
  'Aries (Mesha)', 'Taurus (Vrishabha)', 'Gemini (Mithuna)', 'Cancer (Karka)',
  'Leo (Simha)', 'Virgo (Kanya)', 'Libra (Tula)', 'Scorpio (Vrishchika)',
  'Sagittarius (Dhanu)', 'Capricorn (Makara)', 'Aquarius (Kumbha)', 'Pisces (Meena)',
];

const HOUSE_VEDIC_NAMES: Record<number, string> = {
  1: 'Tanu Bhava (Lagna / Self)',
  2: 'Dhana Bhava (Wealth / Family)',
  3: 'Bhratri Bhava (Siblings / Courage)',
  4: 'Matru Bhava (Mother / Home / Happiness)',
  5: 'Putra Bhava (Children / Intellect / Karma)',
  6: 'Ari Bhava (Enemies / Health / Service)',
  7: 'Yuvati Bhava (Spouse / Partnerships)',
  8: 'Randhra Bhava (Longevity / Transformation)',
  9: 'Dharma Bhava (Fortune / Father / Higher Wisdom)',
  10: 'Karma Bhava (Career / Profession / Status)',
  11: 'Labha Bhava (Gains / Ambitions / Network)',
  12: 'Vyaya Bhava (Expenditure / Liberation / Losses)',
};

function getPlanetAbbr(planetName: string, isRetro: boolean): string {
  const p = planetName.toUpperCase().replace('(R)', '').trim();
  let abbr = '';
  switch (p) {
    case 'SUN': case 'SURYA': case 'SOORYA': abbr = 'Su'; break;
    case 'MOON': case 'CHANDRA': abbr = 'Mo'; break;
    case 'MARS': case 'MANGAL': case 'KUJA': abbr = 'Ma'; break;
    case 'MERCURY': case 'BUDHA': abbr = 'Me'; break;
    case 'JUPITER': case 'GURU': case 'BRHASPATI': abbr = 'Ju'; break;
    case 'VENUS': case 'SHUKRA': abbr = 'Ve'; break;
    case 'SATURN': case 'SHANI': abbr = 'Sa'; break;
    case 'RAHU': abbr = 'Ra'; break;
    case 'KETU': abbr = 'Ke'; break;
    case 'ASCENDANT': case 'LAGNA': case 'AS': abbr = 'As'; break;
    default: abbr = p.slice(0, 2); break;
  }
  return isRetro ? `${abbr}(R)` : abbr;
}

export function KundliChartSvg({
  chartData,
  title,
  size = 380,
  onSelectHouse,
  selectedHouse,
}: KundliChartSvgProps) {
  const [hoveredHouse, setHoveredHouse] = useState<number | null>(null);

  // Normalize planets array
  const planetsList: ChartPlanet[] = useMemo(() => {
    if (!chartData) return [];
    if (Array.isArray(chartData.planets)) {
      return chartData.planets;
    }
    if (chartData.planets && typeof chartData.planets === 'object') {
      return Object.entries(chartData.planets).map(([name, p]) => ({
        planet: name,
        ...p,
      }));
    }
    return [];
  }, [chartData]);

  // Determine Lagna Rashi Index (1..12)
  const ascendantRashiIndex = useMemo(() => {
    if (chartData?.ascendant?.rashiIndex) {
      return chartData.ascendant.rashiIndex;
    }
    const ascPlanet = planetsList.find((p) => p.planet?.toUpperCase() === 'ASCENDANT' || p.planet?.toUpperCase() === 'LAGNA' || p.planet?.toUpperCase() === 'AS');
    if (ascPlanet?.rashiIndex) return ascPlanet.rashiIndex;
    if (chartData?.houses && chartData.houses[0]?.rashiIndex) return chartData.houses[0].rashiIndex;
    return 1; // Default to Aries if not found
  }, [chartData, planetsList]);

  // Group planets by house (1..12)
  const housePlanetsMap = useMemo(() => {
    const map: Record<number, ChartPlanet[]> = {};
    for (let i = 1; i <= 12; i++) map[i] = [];

    planetsList.forEach((p) => {
      if (p.planet?.toUpperCase() === 'ASCENDANT' || p.planet?.toUpperCase() === 'LAGNA') {
        map[1].push(p);
        return;
      }
      let h = p.house;
      if (!h && p.rashiIndex) {
        h = ((p.rashiIndex - ascendantRashiIndex + 12) % 12) + 1;
      }
      if (h && h >= 1 && h <= 12) {
        map[h].push(p);
      }
    });

    return map;
  }, [planetsList, ascendantRashiIndex]);

  // House coordinates for centers and SVG polygons (viewBox 0 0 400 400)
  const houseDefs: Record<number, { center: [number, number]; rashiPos: [number, number]; points: string }> = {
    1: { center: [200, 110], rashiPos: [200, 65], points: '200,0 300,100 200,200 100,100' }, // Top Diamond
    2: { center: [100, 55], rashiPos: [130, 40], points: '0,0 200,0 100,100' },             // Upper Left Top Triangle
    3: { center: [55, 100], rashiPos: [40, 130], points: '0,0 100,100 0,200' },             // Upper Left Corner Triangle
    4: { center: [110, 200], rashiPos: [65, 200], points: '0,200 100,100 200,200 100,300' }, // Left Diamond
    5: { center: [55, 300], rashiPos: [40, 270], points: '0,200 100,300 0,400' },           // Lower Left Corner Triangle
    6: { center: [100, 345], rashiPos: [130, 360], points: '0,400 100,300 200,400' },        // Lower Left Bottom Triangle
    7: { center: [200, 290], rashiPos: [200, 335], points: '200,200 300,300 200,400 100,300' }, // Bottom Diamond
    8: { center: [300, 345], rashiPos: [270, 360], points: '200,400 300,300 400,400' },       // Lower Right Bottom Triangle
    9: { center: [345, 300], rashiPos: [360, 270], points: '400,200 300,300 400,400' },       // Lower Right Corner Triangle
    10: { center: [290, 200], rashiPos: [335, 200], points: '200,200 300,100 400,200 300,300' }, // Right Diamond
    11: { center: [345, 100], rashiPos: [360, 130], points: '400,0 400,200 300,100' },        // Upper Right Corner Triangle
    12: { center: [300, 55], rashiPos: [270, 40], points: '200,0 400,0 300,100' },           // Upper Right Top Triangle
  };

  const activeHouse = hoveredHouse || selectedHouse;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: typeof size === 'number' ? `${size}px` : size }}>
      {title && (
        <div style={{
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}>
          <span>🔯</span>
          <span>{title}</span>
        </div>
      )}

      {/* SVG Canvas */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1/1',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        borderRadius: '12px',
        border: '1px solid #334155',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}>
        <svg
          viewBox="0 0 400 400"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            <linearGradient id="lagnaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#D97706" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="hoverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="selectedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* House interactive background polygons */}
          {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const).map((h) => {
            const def = houseDefs[h];
            const isH1 = h === 1;
            const isHovered = hoveredHouse === h;
            const isSelected = selectedHouse === h;

            let fill = 'transparent';
            if (isSelected) fill = 'url(#selectedGradient)';
            else if (isHovered) fill = 'url(#hoverGradient)';
            else if (isH1) fill = 'url(#lagnaGradient)';

            return (
              <polygon
                key={`house-poly-${h}`}
                points={def.points}
                fill={fill}
                stroke="none"
                style={{ cursor: 'pointer', transition: 'fill 0.15s ease' }}
                onMouseEnter={() => setHoveredHouse(h)}
                onMouseLeave={() => setHoveredHouse(null)}
                onClick={() => onSelectHouse && onSelectHouse(h)}
              />
            );
          })}

          {/* Chart geometric boundary lines */}
          <rect x="1" y="1" width="398" height="398" fill="none" stroke="#6366F1" strokeWidth="1.5" strokeOpacity="0.8" />
          {/* Diagonals */}
          <line x1="0" y1="0" x2="400" y2="400" stroke="#475569" strokeWidth="1" strokeOpacity="0.8" />
          <line x1="400" y1="0" x2="0" y2="400" stroke="#475569" strokeWidth="1" strokeOpacity="0.8" />
          {/* Diamond */}
          <line x1="200" y1="0" x2="400" y2="200" stroke="#6366F1" strokeWidth="1.2" strokeOpacity="0.8" />
          <line x1="400" y1="200" x2="200" y2="400" stroke="#6366F1" strokeWidth="1.2" strokeOpacity="0.8" />
          <line x1="200" y1="400" x2="0" y2="200" stroke="#6366F1" strokeWidth="1.2" strokeOpacity="0.8" />
          <line x1="0" y1="200" x2="200" y2="0" stroke="#6366F1" strokeWidth="1.2" strokeOpacity="0.8" />

          {/* Gold highlight for Lagna Diamond border */}
          <polygon
            points="100,100 200,0 300,100 200,200"
            fill="none"
            stroke="#D97706"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />

          {/* House Labels (Rashi numbers & Planet abbreviations) */}
          {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const).map((h) => {
            const def = houseDefs[h];
            const rashiNum = ((ascendantRashiIndex + h - 2) % 12) + 1;
            const planetsInHouse = housePlanetsMap[h] || [];

            return (
              <g key={`house-content-${h}`} style={{ pointerEvents: 'none' }}>
                {/* Rashi Number */}
                <text
                  x={def.rashiPos[0]}
                  y={def.rashiPos[1]}
                  fill="#94A3B8"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {rashiNum}
                </text>

                {/* Planets Badges */}
                {planetsInHouse.length > 0 && (
                  <g>
                    {planetsInHouse.map((p, idx) => {
                      const isRetro = !!(p.isRetrograde || p.retrograde);
                      const isAsc = p.planet?.toUpperCase() === 'ASCENDANT' || p.planet?.toUpperCase() === 'LAGNA';
                      const abbr = isAsc ? 'As' : getPlanetAbbr(p.planet, isRetro);
                      const isDeb = p.dignity?.toUpperCase() === 'DEBILITATED';
                      const isEx = p.dignity?.toUpperCase() === 'EXALTED';

                      // Determine stacked coordinates inside house
                      const count = planetsInHouse.length;
                      let offsetY = 0;
                      if (count === 1) {
                        offsetY = 0;
                      } else if (count === 2) {
                        offsetY = idx === 0 ? -7 : 7;
                      } else if (count === 3) {
                        offsetY = (idx - 1) * 9;
                      } else {
                        offsetY = (idx - Math.floor(count / 2)) * 8;
                      }

                      let textColor = '#F8FAFC';
                      if (isAsc) textColor = '#FBBF24';
                      else if (isEx) textColor = '#34D399';
                      else if (isDeb) textColor = '#F87171';
                      else if (isRetro) textColor = '#38BDF8';

                      return (
                        <text
                          key={`${p.planet}-${idx}`}
                          x={def.center[0]}
                          y={def.center[1] + offsetY}
                          fill={textColor}
                          fontSize={count > 3 ? '9.5' : '11'}
                          fontWeight={isAsc || isEx ? '800' : '700'}
                          fontFamily="system-ui, -apple-system, sans-serif"
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {abbr}
                          {typeof p.degreeInRashi === 'number' && count <= 2 && (
                            <tspan fontSize="7.5" fill="#94A3B8" fontWeight="400"> {Math.floor(p.degreeInRashi)}°</tspan>
                          )}
                        </text>
                      );
                    })}
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* House Inspector Footer / Hover Card */}
      <div style={{
        marginTop: '0.5rem',
        padding: '0.4rem 0.75rem',
        background: '#1E293B',
        borderRadius: '6px',
        border: '1px solid #334155',
        width: '100%',
        fontSize: '0.72rem',
        color: '#CBD5E1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.25rem',
      }}>
        {activeHouse ? (
          <>
            <div>
              <span style={{ color: '#FBBF24', fontWeight: 700 }}>H{activeHouse}:</span>{' '}
              <span>{HOUSE_VEDIC_NAMES[activeHouse]}</span>
            </div>
            <div style={{ color: '#94A3B8' }}>
              Sign: {RASHI_NAMES[((ascendantRashiIndex + activeHouse - 2) % 12)]}
              {housePlanetsMap[activeHouse]?.length > 0 && (
                <span style={{ marginLeft: '0.5rem', color: '#38BDF8', fontWeight: 600 }}>
                  ({housePlanetsMap[activeHouse].map((p) => p.planet).join(', ')})
                </span>
              )}
            </div>
          </>
        ) : (
          <div style={{ color: '#64748B', textAlign: 'center', width: '100%' }}>
            Hover or click any house to inspect Vedic bhava details
          </div>
        )}
      </div>
    </div>
  );
}
