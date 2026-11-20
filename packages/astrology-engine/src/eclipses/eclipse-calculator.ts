import * as Astronomy from 'astronomy-engine';
import { PanchangCalculator } from '../panchang/panchang-calculator';
import { getRashiIndex } from '../zodiac/rashi';
import { getNakshatraByLongitude } from '../nakshatra/nakshatra';
import { EclipseEvent, EclipseKindName } from './eclipse.types';

/**
 * Solar and lunar eclipse search.
 *
 * Eclipse geometry comes from astronomy-engine (MIT), which implements the shadow-cone
 * method of the Explanatory Supplement / Meeus. Sidereal positions at the peak use the
 * same Sun/Moon routine as the panchanga (engine default Lahiri ayanamsa), so nothing new
 * is assumed about ayanamsa.
 */
export class EclipseCalculator {
  private readonly panchang: PanchangCalculator;

  constructor(panchang?: PanchangCalculator) {
    this.panchang = panchang || new PanchangCalculator();
  }

  /** All solar and lunar eclipses whose peak lies in [start, end), sorted by time. */
  public findEclipses(start: Date, end: Date): EclipseEvent[] {
    if (!(end.getTime() > start.getTime())) return [];
    const events: EclipseEvent[] = [];

    let lunar = Astronomy.SearchLunarEclipse(start);
    while (lunar.peak.date.getTime() < end.getTime()) {
      events.push(this.fromLunar(lunar));
      lunar = Astronomy.NextLunarEclipse(lunar.peak);
    }

    let solar = Astronomy.SearchGlobalSolarEclipse(start);
    while (solar.peak.date.getTime() < end.getTime()) {
      events.push(this.fromSolar(solar));
      solar = Astronomy.NextGlobalSolarEclipse(solar.peak);
    }

    return events.sort((a, b) => Date.parse(a.peakIso) - Date.parse(b.peakIso));
  }

  private kind(k: Astronomy.EclipseKind): EclipseKindName {
    return String(k).toUpperCase() as EclipseKindName;
  }

  private positions(date: Date, body: 'SOLAR' | 'LUNAR') {
    const { sunSidereal, moonSidereal } = this.panchang.getSunMoonPositions(date);
    const lum = body === 'SOLAR' ? sunSidereal : moonSidereal;
    return {
      sunSiderealLongitude: sunSidereal,
      moonSiderealLongitude: moonSidereal,
      rashiIndex: getRashiIndex(lum),
      nakshatraIndex: getNakshatraByLongitude(lum).index,
    };
  }

  private fromLunar(e: Astronomy.LunarEclipseInfo): EclipseEvent {
    return {
      body: 'LUNAR',
      kind: this.kind(e.kind),
      peakIso: e.peak.date.toISOString(),
      obscuration: e.obscuration,
      semiDurationPenumbralMinutes: e.sd_penum,
      semiDurationPartialMinutes: e.sd_partial,
      semiDurationTotalMinutes: e.sd_total,
      ...this.positions(e.peak.date, 'LUNAR'),
    };
  }

  private fromSolar(e: Astronomy.GlobalSolarEclipseInfo): EclipseEvent {
    const out: EclipseEvent = {
      body: 'SOLAR',
      kind: this.kind(e.kind),
      peakIso: e.peak.date.toISOString(),
      ...this.positions(e.peak.date, 'SOLAR'),
    };
    if (e.obscuration !== undefined) out.obscuration = e.obscuration;
    if (e.latitude !== undefined) out.peakLatitude = e.latitude;
    if (e.longitude !== undefined) out.peakLongitude = e.longitude;
    return out;
  }
}
