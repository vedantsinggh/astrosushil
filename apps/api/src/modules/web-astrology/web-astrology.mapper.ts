import {
  AshtakootaResult,
  AvakhadaChakraReport,
  DashaPeriod,
  ManglikComparisonResult,
  ManglikStatus,
  NormalizedChart,
  PanchangOutput,
  RASHIS,
  SadeSatiPeriodsResult,
  SaturnSignSegment,
  SunriseSunsetDetails,
} from '@astro/astrology-engine';
import { renderNorthIndianChartSvg, svgDataUrl } from './web-astrology.chart-svg';
import { utcOffsetHours } from './web-astrology.timezone';

/**
 * Re-shapes values the astrology engine already computed into the field names the website pages
 * read. NOTHING is calculated or decided here: no rule, no threshold, no score. Where the vendor
 * returned a value the engine does not compute, the field is simply absent (see
 * docs/integration/modules/web-astrology.md for the list).
 *
 * Wording: Astro Sushil does not present doshas as afflictions. The sentences built here state
 * the placement and the rule result only; the word "dosha" is never written.
 */

// ---- names --------------------------------------------------------------------------------

/** "MARS" -> "Mars", "PARAMA_MITRA" -> "Parama Mitra". Engine symbols are kept, only re-cased. */
export function displayName(value: string): string {
  return String(value)
    .toLowerCase()
    .split('_')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** English sign name from the engine's own sign table. */
export function englishSign(rashiIndex: number): string {
  return RASHIS[rashiIndex - 1].englishName;
}

/** Sanskrit sign name from the engine's own sign table. */
export function sanskritSign(rashiIndex: number): string {
  return RASHIS[rashiIndex - 1].sanskritName;
}

/** English name of a sign the engine reported by its Sanskrit name ("Makara" -> "Capricorn"); unknown text is returned unchanged. */
export function englishSignOf(name: string): string {
  const match = RASHIS.find((r) => r.sanskritName.toLowerCase() === name.toLowerCase() || r.englishName.toLowerCase() === name.toLowerCase());
  return match ? match.englishName : name;
}

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  const unit = n % 10;
  return `${n}${unit === 1 ? 'st' : unit === 2 ? 'nd' : unit === 3 ? 'rd' : 'th'}`;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Local wall-clock time "HH:mm:ss" of an instant in an IANA zone. */
export function localTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ---- free kundli ---------------------------------------------------------------------------

export interface KundliEngineFacts {
  chart: NormalizedChart;
  avakhada: AvakhadaChakraReport;
  /** Panchang elements at the birth instant, from the chart's own Sun and Moon. */
  panchang: PanchangOutput;
  /** Sunrise and sunset of the local civil date of birth. */
  sun: SunriseSunsetDetails;
  timezone: string;
  /** Civil date of birth, YYYY-MM-DD. */
  dateOfBirth: string;
}

function tithiLabel(panchang: PanchangOutput): string {
  return `${panchang.tithi.paksha === 'SUKLA' ? 'Shukla' : 'Krishna'} ${panchang.tithi.name}`;
}

/**
 * `astro_details`: the keys are the vendor's (including its spelling "Naksahtra"), because the
 * website pages read exactly these keys.
 */
export function mapAstroDetails(facts: KundliEngineFacts) {
  const { chart, avakhada, panchang } = facts;
  const moon = chart.planets.find((p) => p.name === 'MOON');
  if (!moon) throw new Error('Chart has no Moon position');
  return {
    ascendant: englishSign(chart.ascendant.rashiIndex),
    ascendant_sanskrit: sanskritSign(chart.ascendant.rashiIndex),
    ascendant_lord: displayName(chart.ascendant.lord),
    Varna: avakhada.varna,
    Vashya: avakhada.vashya,
    Yoni: avakhada.yoni,
    Gan: avakhada.gana,
    Nadi: avakhada.nadi,
    sign: englishSign(moon.rashiIndex),
    sign_sanskrit: sanskritSign(moon.rashiIndex),
    SignLord: displayName(avakhada.rashiLord),
    Naksahtra: moon.nakshatra,
    NaksahtraLord: displayName(moon.nakshatraLord),
    Charan: moon.pada,
    Yog: panchang.yoga.name,
    Karan: panchang.karana.name,
    Tithi: tithiLabel(panchang),
    yunja: avakhada.yunja,
    tatva: avakhada.tatwa,
    name_alphabet: avakhada.namakshara,
    paya: avakhada.paya,
  };
}

export function mapBasicPanchang(facts: KundliEngineFacts) {
  const [year, month, day] = facts.dateOfBirth.split('-').map(Number);
  return {
    // Weekday of the civil date of birth (a calendar fact, not an astrological rule).
    day: WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()],
    tithi: tithiLabel(facts.panchang),
    nakshatra: facts.panchang.nakshatra.name,
    yog: facts.panchang.yoga.name,
    karan: facts.panchang.karana.name,
    // Local time of the birth place. Absent where the Sun does not rise and set that day.
    sunrise: facts.sun.isFallback ? null : localTime(facts.sun.sunriseIso, facts.timezone),
    sunset: facts.sun.isFallback ? null : localTime(facts.sun.sunsetIso, facts.timezone),
  };
}

export interface WebPlanetRow {
  id: number;
  name: string;
  fullDegree: number;
  normDegree: number;
  speed: number | null;
  isRetro: boolean;
  sign: string;
  sign_sanskrit: string;
  sign_lord: string;
  nakshatra: string;
  nakshatraLord: string;
  nakshatra_pad: number;
  house: number;
  planet_awastha?: string;
}

/** The nine planets in the engine's order, followed by the Ascendant (the vendor listed it too). */
export function mapPlanets(chart: NormalizedChart): WebPlanetRow[] {
  const rows: WebPlanetRow[] = chart.planets.map((p, index) => ({
    id: index + 1,
    name: displayName(p.name),
    fullDegree: round(p.absoluteDegree, 4),
    normDegree: round(p.degree, 4),
    speed: typeof p.speedLongitude === 'number' ? round(p.speedLongitude, 6) : null,
    isRetro: p.retrograde,
    sign: englishSign(p.rashiIndex),
    sign_sanskrit: sanskritSign(p.rashiIndex),
    sign_lord: displayName(RASHIS[p.rashiIndex - 1].ruler),
    nakshatra: p.nakshatra,
    nakshatraLord: displayName(p.nakshatraLord),
    nakshatra_pad: p.pada,
    house: p.house,
    ...(p.avastha?.baladi ? { planet_awastha: displayName(p.avastha.baladi) } : {}),
  }));
  const asc = chart.ascendant;
  const ascNakshatra = chart.nakshatras.find((n) => n.index === asc.nakshatraIndex);
  rows.push({
    id: rows.length + 1,
    name: 'Ascendant',
    fullDegree: round(asc.absoluteDegree, 4),
    normDegree: round(asc.degree, 4),
    speed: null,
    isRetro: false,
    sign: englishSign(asc.rashiIndex),
    sign_sanskrit: sanskritSign(asc.rashiIndex),
    sign_lord: displayName(asc.lord),
    nakshatra: asc.nakshatra,
    nakshatraLord: ascNakshatra ? displayName(ascNakshatra.lord) : '',
    nakshatra_pad: asc.pada,
    house: 1,
  });
  return rows;
}

export function mapBirthChart(chart: NormalizedChart) {
  const svg = renderNorthIndianChartSvg({
    ascendantRashiIndex: chart.ascendant.rashiIndex,
    ascendantDegree: chart.ascendant.degree,
    planets: chart.planets.map((p) => ({ name: p.name, house: p.house, retrograde: p.retrograde, degree: p.degree })),
  });
  return { chart_url: svgDataUrl(svg), svg, chart_style: 'NORTH_INDIAN', format: 'image/svg+xml' };
}

// ---- Manglik (per person) ------------------------------------------------------------------

function referenceLine(label: string, house: number | undefined, status: string | undefined): string | null {
  if (typeof house !== 'number' || !status || status === 'INDETERMINATE') return null;
  return `counted from ${label}, Mars is in the ${ordinal(house)} house (${status === 'MANGLIK' ? 'a Manglik house' : 'not a Manglik house'})`;
}

/**
 * One person's Manglik result, exactly as MatchmakingCalculator.evaluateManglikDosha returned it,
 * in the vendor's field names. The vendor's `percentage_manglik_present` is not returned: the
 * engine computes no percentage.
 */
export function mapManglik(status: ManglikStatus) {
  const mars = status.marsPlacement;
  const sign = englishSign(mars.rashiIndex);
  let manglikStatus: string;
  let report: string;
  if (status.isIndeterminate) {
    manglikStatus = 'Cannot be determined';
    report = 'The Manglik placement is counted from the Ascendant, which needs a known time of birth.';
  } else if (status.effectiveManglik) {
    manglikStatus = 'Manglik';
    report = 'This chart has a Manglik placement: Mars occupies one of the houses counted from the Ascendant for it. It is one factor considered when two charts are matched.';
  } else if (status.isManglik && status.isCancelled) {
    manglikStatus = 'Manglik placement with an exception';
    report = 'Mars occupies one of the houses counted from the Ascendant for a Manglik placement, and the chart also has a classical exception to it, so the chart is not counted as Manglik.';
  } else {
    manglikStatus = 'Not Manglik';
    report = 'Mars does not occupy any of the houses counted from the Ascendant for a Manglik placement.';
  }
  const reason =
    typeof mars.houseFromLagna === 'number'
      ? `Mars is in ${sign}, in the ${ordinal(mars.houseFromLagna)} house from the Ascendant.`
      : `Mars is in ${sign}.`;
  const other = [referenceLine('the Moon', mars.houseFromMoon, status.statusFromMoon), referenceLine('Venus', mars.houseFromVenus, status.statusFromVenus)].filter(
    (line): line is string => line !== null
  );
  return {
    is_present: status.effectiveManglik,
    manglik_status: manglikStatus,
    manglik_reason: reason,
    manglik_report: report,
    consideration: other.length > 0 ? `${other.map((line, i) => (i === 0 ? line.charAt(0).toUpperCase() + line.slice(1) : line)).join('; ')}.` : null,
    // True only when there is a Manglik placement and the engine found a classical exception to it.
    is_mars_manglik_cancelled: status.isManglik && status.isCancelled,
    /** The engine's own result, unchanged. */
    factors: {
      mars_sign: sign,
      mars_sign_sanskrit: mars.rashiName,
      house_from_ascendant: mars.houseFromLagna ?? null,
      house_from_moon: mars.houseFromMoon ?? null,
      house_from_venus: mars.houseFromVenus ?? null,
      status_from_ascendant: status.statusFromLagna ?? null,
      status_from_moon: status.statusFromMoon ?? null,
      status_from_venus: status.statusFromVenus ?? null,
      exceptions: status.cancellationFactors,
    },
  };
}

// ---- Sade Sati -----------------------------------------------------------------------------

function saturnPosition(houseFromMoon: number): string {
  if (houseFromMoon === 1) return 'Saturn in the Moon sign (peak)';
  return `Saturn in the ${ordinal(houseFromMoon)} sign from the Moon`;
}

function phaseRow(segment: SaturnSignSegment, nowMs: number) {
  const start = Date.parse(segment.startIso);
  const end = Date.parse(segment.endIso);
  return {
    phase: `${saturnPosition(segment.houseFromMoon)}: ${englishSign(segment.rashiIndex)}`,
    start: segment.startIso.slice(0, 10),
    end: segment.endIso.slice(0, 10),
    type: nowMs < start ? 'upcoming' : nowMs >= end ? 'completed' : 'current',
  };
}

/**
 * Current Sade Sati status from the engine's SadeSatiPeriodsCalculator table: whether `now`
 * falls inside one of its cycles, and that cycle's sign-by-sign segments. When no cycle is
 * running, the next cycle inside the calculated range (if any) is listed.
 */
export function mapSadeSatiStatus(result: SadeSatiPeriodsResult, now: Date) {
  const nowMs = now.getTime();
  const active = result.cycles.find((c) => Date.parse(c.startIso) <= nowMs && nowMs < Date.parse(c.endIso));
  const next = active ? undefined : result.cycles.find((c) => Date.parse(c.startIso) > nowMs);
  const segment = active?.segments.find((s) => Date.parse(s.startIso) <= nowMs && nowMs < Date.parse(s.endIso));
  // Saturn's present sign is known from this table only while it is in a tabulated sign.
  const fourthOrEighth = result.fourthAndEighth.find((s) => Date.parse(s.startIso) <= nowMs && nowMs < Date.parse(s.endIso));
  const saturnNow = segment ?? fourthOrEighth;
  const moonSign = englishSign(result.natalMoonRashiIndex);
  const listed = active ?? next;

  let report: string;
  if (active && segment) {
    const inSadeSatiSign = [12, 1, 2].includes(segment.houseFromMoon);
    report = inSadeSatiSign
      ? `Sade Sati is running: transiting Saturn is in ${englishSign(segment.rashiIndex)}, the ${segment.houseFromMoon === 1 ? 'natal Moon sign' : `${ordinal(segment.houseFromMoon)} sign from the natal Moon sign (${moonSign})`}. This cycle runs from ${active.startIso.slice(0, 10)} to ${active.endIso.slice(0, 10)}.`
      : `Sade Sati is running: Saturn has moved briefly out of the three signs by retrograde motion and returns within this cycle, which runs from ${active.startIso.slice(0, 10)} to ${active.endIso.slice(0, 10)}.`;
  } else if (next) {
    report = `Sade Sati is not running now. The next cycle for the Moon sign ${moonSign} begins on ${next.startIso.slice(0, 10)}.`;
  } else {
    report = `Sade Sati is not running now for the Moon sign ${moonSign}.`;
  }

  return {
    is_undergoing_sadhesati: Boolean(active),
    is_sadhesati: Boolean(active),
    sadhesati_phase: active && segment ? saturnPosition(segment.houseFromMoon) : null,
    report,
    moon_sign: moonSign,
    saturn_sign: saturnNow ? englishSign(saturnNow.rashiIndex) : null,
    cycle_start: listed ? listed.startIso.slice(0, 10) : null,
    cycle_end: listed ? listed.endIso.slice(0, 10) : null,
    cycle_is: active ? 'current' : next ? 'next' : null,
    sadhesati_phases: listed ? listed.segments.map((s) => phaseRow(s, nowMs)) : [],
    definition: result.definition,
    as_of: now.toISOString().slice(0, 10),
  };
}

// ---- Vimshottari ---------------------------------------------------------------------------

function periodRow(period: DashaPeriod) {
  return { planet: displayName(period.lord), start: period.startDateIso, end: period.endDateIso };
}

/** `[{ planet, start, end }]`, the vendor's `vimshottri_major_vdasha` shape. Instants are ISO 8601 UTC. */
export function mapMajorDasha(mahadashas: DashaPeriod[]) {
  return mahadashas.map(periodRow);
}

/**
 * `{ <Mahadasha lord>: [{ planet, start, end }] }`, the vendor's `vimshottri_antar_vdasha` shape.
 * Should the calculated span contain a lord twice, the later period gets the key "<Lord> (2)" so
 * nothing is dropped.
 */
export function mapAntarDasha(mahadashas: DashaPeriod[]) {
  const out: Record<string, Array<{ planet: string; start: string; end: string }>> = {};
  for (const maha of mahadashas) {
    const base = displayName(maha.lord);
    let key = base;
    for (let n = 2; Object.prototype.hasOwnProperty.call(out, key); n++) key = `${base} (${n})`;
    out[key] = (maha.subPeriods ?? []).map(periodRow);
  }
  return out;
}

// ---- match-making --------------------------------------------------------------------------

/** Minimum Ashtakoota score: the threshold of the engine's own `isCompatible` (>= 18 of 36). */
export const ASHTAKOOTA_MINIMUM_REQUIRED = 18;

function kootaRow(description: string, male: string, female: string, total: number, received: number) {
  return {
    description,
    male_koot_attribute: male,
    female_koot_attribute: female,
    total_points: total,
    received_points: received,
  };
}

/**
 * `match_ashtakoot_points`. Person A of the engine result is the boy (male_*), person B the girl
 * (female_*). Descriptions are the engine's own texts; attributes are the engine's values,
 * re-cased ("BRAHMIN" -> "Brahmin").
 */
export function mapAshtakootPoints(ashtakoota: AshtakootaResult) {
  const k = ashtakoota.kootas;
  const total = ashtakoota.totalMaxPoints;
  const received = ashtakoota.totalObtainedPoints;
  return {
    varna: kootaRow(k.varna.description, displayName(k.varna.personAVarna), displayName(k.varna.personBVarna), k.varna.maxPoints, k.varna.obtainedPoints),
    vashya: kootaRow(k.vashya.description, displayName(k.vashya.personAVashya), displayName(k.vashya.personBVashya), k.vashya.maxPoints, k.vashya.obtainedPoints),
    tara: kootaRow(k.tara.description, k.tara.personANakshatra, k.tara.personBNakshatra, k.tara.maxPoints, k.tara.obtainedPoints),
    yoni: kootaRow(k.yoni.description, displayName(k.yoni.personAYoni), displayName(k.yoni.personBYoni), k.yoni.maxPoints, k.yoni.obtainedPoints),
    maitri: kootaRow(k.grahaMaitri.description, displayName(k.grahaMaitri.personALord), displayName(k.grahaMaitri.personBLord), k.grahaMaitri.maxPoints, k.grahaMaitri.obtainedPoints),
    gan: kootaRow(k.gana.description, displayName(k.gana.personAGana), displayName(k.gana.personBGana), k.gana.maxPoints, k.gana.obtainedPoints),
    bhakut: kootaRow(k.bhakoot.description, englishSignOf(k.bhakoot.personARashi), englishSignOf(k.bhakoot.personBRashi), k.bhakoot.maxPoints, k.bhakoot.obtainedPoints),
    nadi: kootaRow(k.nadi.description, displayName(k.nadi.personANadi), displayName(k.nadi.personBNadi), k.nadi.maxPoints, k.nadi.obtainedPoints),
    total: { total_points: total, received_points: received, minimum_required: ASHTAKOOTA_MINIMUM_REQUIRED },
    conclusion: {
      status: ashtakoota.isCompatible,
      report: `The Ashtakoota score is ${received} out of ${total} points. The classical minimum for a match is ${ASHTAKOOTA_MINIMUM_REQUIRED} points, which this score ${ashtakoota.isCompatible ? 'meets' : 'does not meet'}.`,
    },
  };
}

/** Share of the 36 points obtained. The vendor's other percentages are not computed by the engine. */
export function mapMatchPercentage(ashtakoota: AshtakootaResult) {
  return { ashtakoota_percentage: round((ashtakoota.totalObtainedPoints / ashtakoota.totalMaxPoints) * 100, 2) };
}

export function mapMatchMakingReport(ashtakoota: AshtakootaResult) {
  return { ashtakoota: { status: ashtakoota.isCompatible, received_points: ashtakoota.totalObtainedPoints } };
}

const MANGLIK_PAIR_TEXT: Record<ManglikComparisonResult['verdict'], string> = {
  BOTH_NON_MANGLIK: 'Neither chart has a Manglik placement counted from the Ascendant.',
  BOTH_MANGLIK: 'Both charts have a Manglik placement counted from the Ascendant.',
  MANGLIK_MISMATCH: 'One chart has a Manglik placement counted from the Ascendant and the other does not.',
  INDETERMINATE_BIRTH_TIME_REQUIRED: 'The Manglik comparison needs a known time of birth for both people.',
};

export function mapMatchManglikReport(comparison: ManglikComparisonResult) {
  return {
    male: mapManglik(comparison.personA),
    female: mapManglik(comparison.personB),
    conclusion: {
      // True when both charts agree (both Manglik or both not), as the engine's comparison reports it.
      match: comparison.isDoshaCancelledByMatch,
      verdict: comparison.verdict,
      report: MANGLIK_PAIR_TEXT[comparison.verdict],
    },
  };
}

export interface PersonBirthInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
}

/** `match_birth_details.<male|female>_astro_details` (the vendor's naming). */
export function mapMatchBirthDetails(input: PersonBirthInput, facts: KundliEngineFacts) {
  const panchang = mapBasicPanchang(facts);
  return {
    ...input,
    // The vendor always sent 5.5. This is the real offset of the birth place at the birth instant.
    timezone: utcOffsetHours(facts.chart.calculation.normalizedTime.timezoneOffsetMinutes),
    timezone_name: facts.timezone,
    sunrise: panchang.sunrise,
    sunset: panchang.sunset,
  };
}

/** `match_planet_details.<male|female>_planet_details`: the nine planets, without the Ascendant row. */
export function mapMatchPlanetDetails(chart: NormalizedChart) {
  return mapPlanets(chart)
    .filter((row) => row.name !== 'Ascendant')
    .map((row) => ({
      name: row.name,
      sign: row.sign,
      nakshatra: row.nakshatra,
      house: row.house,
      isRetro: row.isRetro,
      ...(row.planet_awastha ? { planet_awastha: row.planet_awastha } : {}),
    }));
}

// ---- place search --------------------------------------------------------------------------

export interface WebPlace {
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  timezone: string;
}

export function mapPlace(place: { displayName: string; latitude: number; longitude: number; timezone: string }): WebPlace {
  return {
    formattedAddress: place.displayName,
    location: { latitude: place.latitude, longitude: place.longitude },
    timezone: place.timezone,
  };
}
