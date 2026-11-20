/**
 * Evidence registry.
 *
 * Flattens a ChartSnapshot into stable, typed evidence items. Every chart fact
 * that a report may cite exists here exactly once, with provenance. The
 * registry is derived from the snapshot alone, so it can always be rebuilt and
 * compared — nothing in it comes from a request payload or an LLM.
 */
import { EvidenceItem, EvidenceValue } from '../contracts';
import { ChartSnapshot, sha256, stableStringify } from '../snapshot/chart-snapshot';
import type { InterpretationIndex } from '../interpretation/register';
import { computeNumerology } from './numerology';

export const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'] as const;
export type PlanetName = (typeof PLANETS)[number];

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

const KARAKA_NAMES: Record<string, string> = {
  AK: 'Atmakaraka', AMK: 'Amatyakaraka', BK: 'Bhratrikaraka', MK: 'Matrikaraka',
  PK: 'Putrakaraka', GK: 'Gnatikaraka', DK: 'Darakaraka', PIK: 'Pitrikaraka',
};

export function planetName(symbol: string): PlanetName {
  const s = String(symbol).toLowerCase();
  const found = PLANETS.find((p) => p.toLowerCase() === s);
  if (!found) throw new Error(`Unknown planet symbol: ${symbol}`);
  return found;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Plain statement of a satisfied yoga condition: the engine's observed relation when it already
 * states the fact (e.g. "Yogakaraka: MARS owns both kendra 10 and trikona 5", "Lord of H7 (SATURN)
 * and Lord of H5 (MARS) conjunct in Gemini"), otherwise the rule text in the indicative followed by
 * the observed value. Never the bare rule template ("must be …").
 */
export function yogaConditionText(c: { description: string; observed: string | number | boolean }): string {
  const observed = String(c.observed);
  if (typeof c.observed === 'string' && (observed === c.description || observed.slice(0, 12) === c.description.slice(0, 12))) return observed;
  const indicative = c.description.replace(/\bmust be\b/g, 'is').replace(/\bmust have\b/g, 'has').replace(/\bmust\b/g, '').replace(/\s{2,}/g, ' ');
  return `${indicative}: ${observed}`;
}

/** Adds one evidence item; used by report-module evidence contributors. */
export type AddEvidence = (id: string, kind: string, label: string, value: EvidenceValue, source: string) => void;

export interface EvidenceRegistryOptions {
  /** Second native (e.g. Couple Matching). Its core facts are registered under `partner.`. */
  partner?: ChartSnapshot;
  /** Report-specific evidence (from a ReportModule). */
  contributors?: Array<(add: AddEvidence, registry: EvidenceRegistry) => void>;
}

export class EvidenceRegistry {
  private readonly items = new Map<string, EvidenceItem>();
  /** Identity of the evidence set: the snapshot, or snapshot+partner for two-person reports. */
  public readonly snapshotId: string;

  constructor(public readonly snapshot: ChartSnapshot, options: EvidenceRegistryOptions = {}) {
    this.snapshotId = options.partner
      ? sha256(`${snapshot.snapshotId}|partner|${options.partner.snapshotId}`).slice(0, 32)
      : snapshot.snapshotId;
    this.buildCore(snapshot, '');
    if (options.partner) this.buildCore(options.partner, 'partner.');
    const add: AddEvidence = (id, kind, label, value, source) => this.add(id, kind, label, value, source);
    for (const c of options.contributors ?? []) c(add, this);
  }

  get size(): number {
    return this.items.size;
  }

  private interpretationIndex?: InterpretationIndex;

  /** Results of the interpretation pipeline, when the module declares a pack (see interpretation/register.ts). */
  get interpretation(): InterpretationIndex | undefined {
    return this.interpretationIndex;
  }

  /** Called once by the interpretation contributor after its `interp.*` items are added. */
  attachInterpretation(index: InterpretationIndex): void {
    if (this.interpretationIndex) throw new Error('INTERPRETATION_ALREADY_ATTACHED: one interpretation set per registry');
    this.interpretationIndex = index;
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  get(id: string): EvidenceItem | undefined {
    return this.items.get(id);
  }

  all(): EvidenceItem[] {
    return [...this.items.values()];
  }

  /** Resolve exact IDs and glob patterns (`*` matches any run of characters). */
  resolve(patterns: string[]): EvidenceItem[] {
    const out = new Map<string, EvidenceItem>();
    for (const p of patterns) {
      if (p.includes('*')) {
        const re = EvidenceRegistry.globToRegex(p);
        for (const [id, item] of this.items) if (re.test(id)) out.set(id, item);
      } else {
        const item = this.items.get(p);
        if (item) out.set(p, item);
      }
    }
    return [...out.values()];
  }

  static globToRegex(pattern: string): RegExp {
    return new RegExp('^' + pattern.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
  }

  /** Does `id` match any of the given patterns? */
  static matches(id: string, patterns: string[]): boolean {
    return patterns.some((p) => (p.includes('*') ? EvidenceRegistry.globToRegex(p).test(id) : id === p));
  }

  /** Fingerprint over the values of the given evidence items (order-independent). */
  fingerprint(items: EvidenceItem[]): string {
    const canonical = items
      .map((i) => [i.id, i.value] as const)
      .sort((a, b) => a[0].localeCompare(b[0]));
    return sha256(stableStringify({ snapshot: this.snapshotId, canonical })).slice(0, 24);
  }

  private add(id: string, kind: string, label: string, value: EvidenceValue, source: string): void {
    if (this.items.has(id)) throw new Error(`Duplicate evidence id ${id}`);
    this.items.set(id, {
      id,
      snapshotId: this.snapshotId,
      kind,
      label,
      value,
      source,
      engineVersion: this.snapshot.engineVersion,
    });
  }

  private buildCore(snap: ChartSnapshot, prefix: string): void {
    const { natal, vargas, vimshottari, ashtakavarga, yogas, subject } = snap;
    const add = (id: string, kind: string, label: string, value: EvidenceValue, source: string) =>
      this.add(prefix + id, kind, prefix ? `Partner: ${label}` : label, value, source);
    const asc = natal.ascendant;

    // --- Ascendant -------------------------------------------------------
    add('asc.d1.sign', 'ascendant', `Ascendant (Lagna) is ${asc.sign}`, asc.sign, 'chart.normalizeAstroChart');
    add('asc.d1.degree', 'ascendant', `Ascendant at ${asc.degree.toFixed(2)}° ${asc.sign}`, Number(asc.degree.toFixed(2)), 'chart.normalizeAstroChart');
    add('asc.d1.nakshatra', 'ascendant', `Ascendant in ${asc.nakshatra} nakshatra, pada ${asc.pada}`, asc.nakshatra, 'chart.normalizeAstroChart');
    add('asc.d1.lord', 'ascendant', `Ascendant lord is ${planetName(asc.lord)}`, planetName(asc.lord), 'chart.normalizeAstroChart');

    // --- Planets (D1) ----------------------------------------------------
    for (const p of natal.planets) {
      const name = planetName(p.name);
      const k = name.toLowerCase();
      const base = `planet.${k}.d1`;
      add(`${base}.sign`, 'planet-sign', `${name} is in ${p.sign}`, p.sign, 'chart.normalizeAstroChart');
      add(`${base}.house`, 'planet-house', `${name} is in the ${ordinal(p.house)} house`, p.house, 'chart.normalizeAstroChart');
      add(`${base}.degree`, 'planet-degree', `${name} at ${p.degree.toFixed(2)}° ${p.sign}`, Number(p.degree.toFixed(2)), 'chart.normalizeAstroChart');
      add(`${base}.nakshatra`, 'planet-nakshatra', `${name} is in ${p.nakshatra} nakshatra (pada ${p.pada}), ruled by ${planetName(p.nakshatraLord)}`, p.nakshatra, 'chart.normalizeAstroChart');
      add(`${base}.dignity`, 'planet-dignity', `${name} dignity: ${p.dignity.toLowerCase().replace(/_/g, ' ')}`, p.dignity, 'planets.calculatePlanetaryDignity');
      add(`${base}.retrograde`, 'planet-state', `${name} is ${p.retrograde ? 'retrograde' : 'direct'}`, p.retrograde, 'ephemeris');
      if (name !== 'Sun' && name !== 'Rahu' && name !== 'Ketu') {
        add(`${base}.combust`, 'planet-state', `${name} is ${p.combust ? 'combust (close to the Sun)' : 'not combust'}`, p.combust, 'planets.calculateCombustion');
      }
      add(`${base}.lordship`, 'planet-lordship',
        p.lordship.length ? `${name} rules the ${p.lordship.map(ordinal).join(' and ')} house${p.lordship.length > 1 ? 's' : ''}` : `${name} rules no house (shadow planet)`,
        p.lordship.map(String), 'chart.normalizeAstroChart');
      const aspectsBy = (p.aspectsReceived ?? []).map((s) => planetName(s));
      add(`${base}.aspected-by`, 'planet-aspect',
        aspectsBy.length ? `${name} receives graha drishti from ${aspectsBy.join(', ')}` : `${name} receives no planetary aspect`,
        aspectsBy, 'planets.aspects');
      const conj = natal.planets.filter((o) => o.name !== p.name && o.house === p.house).map((o) => planetName(o.name));
      add(`${base}.conjunctions`, 'planet-conjunction',
        conj.length ? `${name} shares its house with ${conj.join(', ')}` : `${name} has no conjunction (alone in its house)`,
        conj, 'chart.normalizeAstroChart');
      if (p.charaKaraka) {
        const code = p.charaKaraka.toUpperCase();
        const kName = KARAKA_NAMES[code] ?? code;
        add(`karaka.${slug(code)}`, 'chara-karaka', `${name} is the ${kName} (Jaimini chara karaka)`, name, 'jaimini.charaKaraka');
      }
    }

    // --- Houses (D1) -----------------------------------------------------
    for (const h of natal.houses) {
      const base = `house.${h.number}.d1`;
      const lord = planetName(h.lord);
      const lordPlanet = natal.planets.find((p) => planetName(p.name) === lord);
      add(`${base}.sign`, 'house-sign', `The ${ordinal(h.number)} house is ${h.sign}`, h.sign, 'houses.wholeSign');
      add(`${base}.lord`, 'house-lord', `The ${ordinal(h.number)} house lord is ${lord}`, lord, 'houses.wholeSign');
      if (lordPlanet) {
        add(`${base}.lord-house`, 'house-lord-placement',
          `The ${ordinal(h.number)} lord ${lord} is placed in the ${ordinal(lordPlanet.house)} house (${lordPlanet.sign})`,
          lordPlanet.house, 'houses.wholeSign');
      }
      const occ = h.occupants.map((o) => planetName(o));
      add(`${base}.occupants`, 'house-occupants',
        occ.length ? `The ${ordinal(h.number)} house contains ${occ.join(', ')}` : `The ${ordinal(h.number)} house is unoccupied`,
        occ, 'chart.normalizeAstroChart');
      const sav = ashtakavarga.sav.signs[h.rashiIndex as keyof typeof ashtakavarga.sav.signs] as unknown as number;
      if (typeof sav === 'number') {
        add(`sav.house.${h.number}`, 'ashtakavarga', `Sarvashtakavarga: ${sav} bindus in the ${ordinal(h.number)} house (${h.sign})`, sav, 'ashtakavarga.sav');
      }
    }

    // --- Divisional charts ---------------------------------------------
    for (const [vt, chart] of Object.entries(vargas)) {
      if (!chart || vt === 'D1') continue;
      const v = vt.toLowerCase();
      if (chart.ascendant) {
        const s = SIGNS[chart.ascendant.rashiIndex - 1];
        add(`asc.${v}.sign`, 'varga-ascendant', `${vt} ascendant is ${s}`, s, `varga.${vt}`);
      }
      for (const pl of Object.values(chart.placements)) {
        if (pl.planet === 'Ascendant') continue;
        const name = planetName(String(pl.planet));
        const s = SIGNS[pl.rashiIndex - 1];
        add(`planet.${name.toLowerCase()}.${v}.sign`, 'varga-sign', `${name} is in ${s} in the ${vt} chart`, s, `varga.${vt}`);
        if (pl.house) {
          add(`planet.${name.toLowerCase()}.${v}.house`, 'varga-house', `${name} is in the ${ordinal(pl.house)} house of the ${vt} chart`, pl.house, `varga.${vt}`);
        }
      }
    }

    // --- Vimshottari dasha ---------------------------------------------
    const date = (iso: string) => iso.slice(0, 10);
    add('dasha.birth-lord', 'dasha', `Birth Mahadasha lord is ${planetName(vimshottari.birthLord)} (Moon in ${vimshottari.moonNakshatraName})`, planetName(vimshottari.birthLord), 'dasha.vimshottari');
    vimshottari.mahadashas.forEach((md, i) => {
      const n = String(i + 1).padStart(2, '0');
      add(`dasha.md.${n}`, 'dasha-period',
        `${planetName(md.lord)} Mahadasha: ${date(md.startDateIso)} to ${date(md.endDateIso)}`,
        [planetName(md.lord), date(md.startDateIso), date(md.endDateIso)], 'dasha.vimshottari');
    });
    const active = vimshottari.activeDasha;
    if (active) {
      add('dasha.current.md', 'dasha-current',
        `Current Mahadasha (as of ${date(snap.asOfIso)}): ${planetName(active.mahadasha.lord)} until ${date(active.mahadasha.endDateIso)}`,
        planetName(active.mahadasha.lord), 'dasha.vimshottari');
      if (active.antardasha) {
        add('dasha.current.ad', 'dasha-current',
          `Current Antardasha: ${planetName(active.antardasha.lord)} (${date(active.antardasha.startDateIso)} to ${date(active.antardasha.endDateIso)})`,
          planetName(active.antardasha.lord), 'dasha.vimshottari');
      }
    }

    // --- Transit sign periods (from asOf) ---------------------------------
    const moon = natal.planets.find((p) => planetName(p.name) === 'Moon')!;
    const houseFrom = (fromRashi: number, signIndex: number) => ((signIndex - fromRashi + 12) % 12) + 1;
    for (const [planet, periods] of Object.entries(snap.transits ?? {})) {
      const pn = planetName(planet);
      periods.forEach((per, i) => {
        const n = String(i + 1).padStart(2, '0');
        const fromAsc = houseFrom(asc.rashiIndex, per.signIndex);
        const fromMoon = houseFrom(moon.rashiIndex, per.signIndex);
        add(`transit.${pn.toLowerCase()}.${n}`, 'transit-period',
          `${pn} transits ${per.sign} from ${date(per.startIso)} to ${date(per.endIso)}${per.enteredRetrograde ? ' (re-entry while retrograde)' : ''}: the ${ordinal(fromAsc)} house from the Ascendant and the ${ordinal(fromMoon)} from the Moon`,
          [per.sign, date(per.startIso), date(per.endIso), String(fromAsc), String(fromMoon)], 'transit.TransitIngressSolver');
      });
    }

    // --- Yogas -----------------------------------------------------------
    for (const y of yogas) {
      if (!y.isDetected) continue;
      const satisfied = y.evidence.conditions.filter((c) => c.satisfied).map(yogaConditionText);
      add(`yoga.${slug(y.id.replace(/^YOGA_/, ''))}`, 'yoga',
        `${y.canonicalName} is present (${satisfied.slice(0, 3).join('; ') || y.convention})`,
        y.canonicalName, 'yoga.evaluateYogas');
    }

    // --- Numerology (date-of-birth only) ----------------------------------
    const num = computeNumerology(subject.dateOfBirth);
    add('numerology.mulank', 'numerology', `Mulank (driver/psychic number) is ${num.mulank}`, num.mulank, 'platform.numerology');
    add('numerology.bhagyank', 'numerology', `Bhagyank (destiny/life-path number) is ${num.bhagyank}`, num.bhagyank, 'platform.numerology');
  }
}
