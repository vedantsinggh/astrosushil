/**
 * North Indian birth chart (D1) as a standalone SVG string, for the website's
 * `birth_chart.chart_url` (the vendor returned a link to an image).
 *
 * The geometry and the content are those of the admin panel's chart component
 * (apps/admin/components/KundliChartSvg.tsx): viewBox 0 0 400 400, house 1 in the top diamond and
 * the houses running anticlockwise, the sign number of each house, and in each house the
 * abbreviations of its occupants ("As" for the Ascendant in house 1, "(R)" for a retrograde planet,
 * whole degrees when a house holds one or two bodies). That component is a React client component
 * and cannot be imported by the API, so the same table is kept here; a unit test compares the two.
 *
 * Nothing is calculated here: houses, signs, retrograde state and degrees are taken from the chart
 * the engine produced.
 */

export interface ChartSvgBody {
  /** Engine planet symbol ("SUN" … "KETU"). */
  name: string;
  /** Whole-sign house 1..12 from the engine. */
  house: number;
  retrograde: boolean;
  /** Degrees within the sign. */
  degree: number;
}

export interface ChartSvgInput {
  /** Sign of the Ascendant, 1 = Mesha … 12 = Meena. */
  ascendantRashiIndex: number;
  /** Degrees of the Ascendant within its sign. */
  ascendantDegree: number;
  planets: ChartSvgBody[];
}

export interface HouseGeometry {
  center: [number, number];
  rashiPos: [number, number];
  points: string;
}

/** Same values as `houseDefs` in apps/admin/components/KundliChartSvg.tsx. */
export const NORTH_INDIAN_HOUSES: Record<number, HouseGeometry> = {
  1: { center: [200, 110], rashiPos: [200, 65], points: '200,0 300,100 200,200 100,100' },
  2: { center: [100, 55], rashiPos: [130, 40], points: '0,0 200,0 100,100' },
  3: { center: [55, 100], rashiPos: [40, 130], points: '0,0 100,100 0,200' },
  4: { center: [110, 200], rashiPos: [65, 200], points: '0,200 100,100 200,200 100,300' },
  5: { center: [55, 300], rashiPos: [40, 270], points: '0,200 100,300 0,400' },
  6: { center: [100, 345], rashiPos: [130, 360], points: '0,400 100,300 200,400' },
  7: { center: [200, 290], rashiPos: [200, 335], points: '200,200 300,300 200,400 100,300' },
  8: { center: [300, 345], rashiPos: [270, 360], points: '200,400 300,300 400,400' },
  9: { center: [345, 300], rashiPos: [360, 270], points: '400,200 300,300 400,400' },
  10: { center: [290, 200], rashiPos: [335, 200], points: '200,200 300,100 400,200 300,300' },
  11: { center: [345, 100], rashiPos: [360, 130], points: '400,0 400,200 300,100' },
  12: { center: [300, 55], rashiPos: [270, 40], points: '200,0 400,0 300,100' },
};

const ABBREVIATIONS: Record<string, string> = {
  SUN: 'Su',
  MOON: 'Mo',
  MARS: 'Ma',
  MERCURY: 'Me',
  JUPITER: 'Ju',
  VENUS: 'Ve',
  SATURN: 'Sa',
  RAHU: 'Ra',
  KETU: 'Ke',
};

/** Abbreviation shown in the chart, as in the admin component. */
export function planetAbbreviation(name: string, retrograde: boolean): string {
  const symbol = name.toUpperCase();
  const abbr = ABBREVIATIONS[symbol] ?? symbol.slice(0, 2);
  return retrograde ? `${abbr}(R)` : abbr;
}

/** Sign number written in a house: the Ascendant's sign in house 1, then in zodiac order. */
export function rashiNumberOfHouse(ascendantRashiIndex: number, house: number): number {
  return ((ascendantRashiIndex + house - 2) % 12) + 1;
}

interface Occupant {
  label: string;
  degree: number;
  ascendant: boolean;
}

/** Occupants of each house in chart order: the Ascendant first in house 1, then the planets as given. */
export function occupantsByHouse(input: ChartSvgInput): Record<number, Occupant[]> {
  const map: Record<number, Occupant[]> = {};
  for (let house = 1; house <= 12; house++) map[house] = [];
  map[1].push({ label: 'As', degree: input.ascendantDegree, ascendant: true });
  for (const planet of input.planets) {
    if (!Number.isInteger(planet.house) || planet.house < 1 || planet.house > 12) continue;
    map[planet.house].push({
      label: planetAbbreviation(planet.name, planet.retrograde),
      degree: planet.degree,
      ascendant: false,
    });
  }
  return map;
}

function offsetY(count: number, index: number): number {
  if (count === 1) return 0;
  if (count === 2) return index === 0 ? -7 : 7;
  if (count === 3) return (index - 1) * 9;
  return (index - Math.floor(count / 2)) * 8;
}

const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

export function renderNorthIndianChartSvg(input: ChartSvgInput): string {
  if (!Number.isInteger(input.ascendantRashiIndex) || input.ascendantRashiIndex < 1 || input.ascendantRashiIndex > 12) {
    throw new Error('Ascendant sign index must be 1..12');
  }
  const occupants = occupantsByHouse(input);
  const parts: string[] = [];
  parts.push(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" role="img" aria-label="North Indian birth chart">'
  );
  parts.push('<rect x="0" y="0" width="400" height="400" fill="#ffffff"/>');
  parts.push(`<polygon points="${NORTH_INDIAN_HOUSES[1].points}" fill="#f5f0ff"/>`);
  parts.push('<rect x="1" y="1" width="398" height="398" fill="none" stroke="#424874" stroke-width="1.5"/>');
  parts.push('<line x1="0" y1="0" x2="400" y2="400" stroke="#8a84b8" stroke-width="1"/>');
  parts.push('<line x1="400" y1="0" x2="0" y2="400" stroke="#8a84b8" stroke-width="1"/>');
  parts.push('<polygon points="200,0 400,200 200,400 0,200" fill="none" stroke="#424874" stroke-width="1.2"/>');

  for (let house = 1; house <= 12; house++) {
    const def = NORTH_INDIAN_HOUSES[house];
    parts.push(
      `<text x="${def.rashiPos[0]}" y="${def.rashiPos[1]}" fill="#8a84b8" font-size="10" font-weight="700" font-family="${FONT}" text-anchor="middle" dominant-baseline="central">${rashiNumberOfHouse(input.ascendantRashiIndex, house)}</text>`
    );
    const inHouse = occupants[house];
    inHouse.forEach((occupant, index) => {
      const y = def.center[1] + offsetY(inHouse.length, index);
      const size = inHouse.length > 3 ? '9.5' : '11';
      const fill = occupant.ascendant ? '#b7791f' : '#100d42';
      const degree =
        inHouse.length <= 2 && Number.isFinite(occupant.degree)
          ? `<tspan font-size="7.5" fill="#8a84b8" font-weight="400"> ${Math.floor(occupant.degree)}°</tspan>`
          : '';
      parts.push(
        `<text x="${def.center[0]}" y="${y}" fill="${fill}" font-size="${size}" font-weight="700" font-family="${FONT}" text-anchor="middle" dominant-baseline="central">${occupant.label}${degree}</text>`
      );
    });
  }
  parts.push('</svg>');
  return parts.join('');
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}
