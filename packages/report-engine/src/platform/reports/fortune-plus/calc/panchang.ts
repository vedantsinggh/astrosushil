/**
 * Birth Panchang (FP-002) from the engine's PanchangCalculator, using the
 * snapshot's own sidereal Sun and Moon so it matches the chart exactly.
 * Vara (weekday) follows the Hindu civil day, which runs from sunrise to
 * sunrise: a birth before local sunrise belongs to the previous weekday. The
 * engine's vara uses the UTC weekday, so it is recomputed here.
 */
import { PanchangCalculator } from '@astro/astrology-engine';
import { ChartSnapshot } from '../../../snapshot/chart-snapshot';

export interface BirthPanchang {
  paksha: 'Shukla' | 'Krishna';
  tithi: string;
  tithiIndex: number;
  vara: string;
  varaLord: string;
  nakshatra: string;
  nakshatraPada: number;
  yoga: string;
  karana: string;
  sunriseLocal: string;
  sunsetLocal: string;
  bornBeforeSunrise: boolean;
}

const VARA = ['Sunday (Ravivara)', 'Monday (Somavara)', 'Tuesday (Mangalavara)', 'Wednesday (Budhavara)', 'Thursday (Guruvara)', 'Friday (Shukravara)', 'Saturday (Shanivara)'];
const VARA_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

const hhmm = (ms: number) => new Date(ms).toISOString().slice(11, 16);

export function computeBirthPanchang(snapshot: ChartSnapshot): BirthPanchang {
  const { natal, subject } = snapshot;
  const sun = natal.planets.find((p) => String(p.name).toUpperCase() === 'SUN')!;
  const moon = natal.planets.find((p) => String(p.name).toUpperCase() === 'MOON')!;
  const birthUtc = new Date(natal.calculation.normalizedTime.utcIsoString);
  const offsetMs = natal.calculation.normalizedTime.timezoneOffsetMinutes * 60000;
  const calc = new PanchangCalculator();
  const out = calc.calculatePanchang(sun.absoluteDegree, moon.absoluteDegree, birthUtc);

  // Sunrise/sunset of the local civil date of birth.
  const [y, m, d] = subject.dateOfBirth.split('-').map(Number);
  const localDate = (ms: number) => new Date(ms + offsetMs).toISOString().slice(0, 10);
  let rs = calc.calculateSunriseSunset(new Date(Date.UTC(y, m - 1, d)), subject.latitude, subject.longitude);
  if (localDate(Date.parse(rs.sunriseIso)) > subject.dateOfBirth) {
    rs = calc.calculateSunriseSunset(new Date(Date.UTC(y, m - 1, d - 1)), subject.latitude, subject.longitude);
  }
  const sunriseMs = Date.parse(rs.sunriseIso);
  const bornBeforeSunrise = birthUtc.getTime() < sunriseMs;
  const civilWeekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const vara = (civilWeekday + (bornBeforeSunrise ? 6 : 0)) % 7;
  return {
    paksha: out.tithi.paksha === 'SUKLA' ? 'Shukla' : 'Krishna',
    tithi: out.tithi.name,
    tithiIndex: out.tithi.index,
    vara: VARA[vara],
    varaLord: VARA_LORD[vara],
    nakshatra: out.nakshatra.name,
    nakshatraPada: out.nakshatra.pada,
    yoga: out.yoga.name,
    karana: out.karana.name,
    sunriseLocal: hhmm(sunriseMs + offsetMs),
    sunsetLocal: hhmm(Date.parse(rs.sunsetIso) + offsetMs),
    bornBeforeSunrise,
  };
}
