/**
 * Classical Mudda (Tajika Vimshottari) dasha for one Varsha year.
 *
 * Rule (Tajika Neelakanthi; B. V. Raman, "Varshaphal"): add the completed
 * years to the number of the natal Moon's nakshatra (Ashwini = 1), subtract 2,
 * divide by 9. The remainder gives the first lord, counted in the order
 * Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury, Ketu, Venus (remainder 0 =
 * Venus). Periods are the Vimshottari years scaled to the actual length of the
 * year (solar return to next solar return). The first period runs only for the
 * balance that the natal Moon has still to travel in its nakshatra (the same
 * proportion as the Vimshottari balance at birth); the elapsed part of that
 * lord's period closes the year, so the nine lords exactly fill the year.
 *
 * The engine's MuddaDashaCalculator instead starts from the annual Moon's
 * nakshatra lord without a balance; see docs/report-system/decisions/annual.md (VAR-004).
 */
import { PlanetName } from '../../../evidence/evidence-registry';

export const MUDDA_ORDER: PlanetName[] = ['Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury', 'Ketu', 'Venus'];
export const VIMSHOTTARI_YEARS: Record<PlanetName, number> = {
  Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17, Ketu: 7, Venus: 20,
};

export interface MuddaPeriod {
  order: number;
  lord: PlanetName;
  startIso: string;
  endIso: string;
  days: number;
  /** 'balance' = first lord's remaining share; 'closing' = its elapsed share at the end of the year. */
  part: 'balance' | 'full' | 'closing';
}

export interface MuddaInput {
  /** Natal Moon sidereal longitude, degrees. */
  natalMoonLongitude: number;
  completedYears: number;
  yearStartIso: string;
  yearEndIso: string;
}

const NAK = 360 / 27;

export function muddaFirstLord(nakshatraNumber: number, completedYears: number): PlanetName {
  const r = (((nakshatraNumber + completedYears - 2) % 9) + 9) % 9; // 1 = Sun … 8 = Ketu, 0 = Venus
  return MUDDA_ORDER[(r + 8) % 9];
}

export function computeMudda(input: MuddaInput): MuddaPeriod[] {
  const lon = ((input.natalMoonLongitude % 360) + 360) % 360;
  const nakNo = Math.floor(lon / NAK) + 1;
  const elapsed = (lon - (nakNo - 1) * NAK) / NAK; // fraction of nakshatra already travelled at birth
  const first = muddaFirstLord(nakNo, input.completedYears);
  const startMs = Date.parse(input.yearStartIso);
  const endMs = Date.parse(input.yearEndIso);
  const total = endMs - startMs;
  const share = (p: PlanetName) => (VIMSHOTTARI_YEARS[p] / 120) * total;
  const i0 = MUDDA_ORDER.indexOf(first);
  const segs: Array<{ lord: PlanetName; ms: number; part: MuddaPeriod['part'] }> = [
    { lord: first, ms: share(first) * (1 - elapsed), part: 'balance' },
  ];
  for (let k = 1; k < 9; k++) {
    const lord = MUDDA_ORDER[(i0 + k) % 9];
    segs.push({ lord, ms: share(lord), part: 'full' });
  }
  if (elapsed > 0) segs.push({ lord: first, ms: share(first) * elapsed, part: 'closing' });
  const out: MuddaPeriod[] = [];
  let cur = startMs;
  segs.forEach((s, i) => {
    const end = i === segs.length - 1 ? endMs : Math.round(cur + s.ms);
    out.push({
      order: i + 1, lord: s.lord, startIso: new Date(cur).toISOString(), endIso: new Date(end).toISOString(),
      days: (end - cur) / 86400000, part: s.part,
    });
    cur = end;
  });
  return out;
}

export function muddaAt(periods: MuddaPeriod[], iso: string): MuddaPeriod {
  const t = Date.parse(iso);
  return periods.find((p) => Date.parse(p.startIso) <= t && t < Date.parse(p.endIso)) ?? periods[periods.length - 1];
}
