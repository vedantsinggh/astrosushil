/**
 * Interpretation facts: deterministic chart facts that the interpretation rules, the LLM and
 * the validators all read (proposal §7). Registered as ordinary evidence items under the `fact.`
 * namespace, which no existing evidence pattern matches, so legacy topics keep their scope and
 * cache keys.
 *
 * Definitions (each label names the definition it uses):
 *  - dispositor: the lord of the sign a planet occupies in the D1 (whole sign; BPHS ch. 3 sign lords).
 *  - vargottama: the same sign in the D1 and the D9.
 *  - varga sign dignity (`dignity.varga.sign`): exalted / debilitated / own sign by SIGN only; it
 *    is a different scale from the D1 compound dignity (`dignity.d1.compound`).
 *  - MD–AD position: the AD lord's natal sign counted from the MD lord's natal sign, and back.
 *  - Saturn-from-Moon phase: transiting Saturn's sign counted from the natal Moon sign (12th, 1st
 *    and 2nd = the three Sade Sati phases; 4th and 8th tabulated alongside). Neutral wording (D-006).
 *  - life stage: completed years at the report date, with product bands (NOT astrology).
 *  - Sarvashtakavarga: natal bindu totals per sign (canonical definition item).
 */
import { getFunctionalNature, getRashiRuler, isDebilitated, isExalted, isOwnSign, PlanetSymbol, ShadbalaCalculator } from '@astro/astrology-engine';
import { completedYears, deriveLifeStage } from '@astro/prediction-engine';
import type { SadeSatiPeriodsResult, YogaResult } from '@astro/astrology-engine';
import { AddEvidence, ordinal, PlanetName, planetName, PLANETS, SIGNS } from '../evidence/evidence-registry';
import { businessDateIso, ChartSnapshot, formatBusinessDate } from '../snapshot/chart-snapshot';

const SRC = 'platform.interpretation.facts';

export type VargaSignDignity = 'EXALTED' | 'DEBILITATED' | 'OWN_SIGN' | 'NONE';
export type SaturnMoonPhase = 'twelfth' | 'over-moon' | 'second' | 'fourth' | 'eighth' | 'none';
export type LifeStageBand = 'early-career' | 'building' | 'mid-career' | 'late-career';

/**
 * Life-stage bands in completed years. PRODUCT DEFAULTS for framing only (not astrology); change
 * here and document in docs/report-system/decisions/interpretation.md.
 */
export const LIFE_STAGE_BANDS: ReadonlyArray<{ band: LifeStageBand; minAge: number; label: string }> = [
  { band: 'early-career', minAge: 0, label: 'early career (studies and first roles)' },
  { band: 'building', minAge: 25, label: 'building a career' },
  { band: 'mid-career', minAge: 40, label: 'mid-career' },
  { band: 'late-career', minAge: 55, label: 'late career' },
];

export function lifeStageBand(age: number): (typeof LIFE_STAGE_BANDS)[number] {
  let out = LIFE_STAGE_BANDS[0];
  for (const b of LIFE_STAGE_BANDS) if (age >= b.minAge) out = b;
  return out;
}

/** Position (1–12) of sign `target` counted inclusively from sign `from`. */
export const countSigns = (from: number, target: number): number => ((target - from + 12) % 12) + 1;

const sym = (p: PlanetName) => p.toUpperCase() as PlanetSymbol;

/** Sign-only dignity (`dignity.varga.sign`). Rahu and Ketu are not assessed: always NONE. */
export function vargaSignDignity(planet: PlanetName, rashiIndex: number): VargaSignDignity {
  if (planet === 'Rahu' || planet === 'Ketu') return 'NONE';
  if (isExalted(sym(planet), rashiIndex)) return 'EXALTED';
  if (isDebilitated(sym(planet), rashiIndex)) return 'DEBILITATED';
  if (isOwnSign(sym(planet), rashiIndex)) return 'OWN_SIGN';
  return 'NONE';
}

const DIGNITY_TEXT: Record<VargaSignDignity, string> = {
  EXALTED: 'exalted',
  DEBILITATED: 'debilitated',
  OWN_SIGN: 'in its own sign',
  NONE: 'without exaltation, debilitation or own-sign status',
};

export function saturnMoonPhase(houseFromMoon: number): SaturnMoonPhase {
  switch (houseFromMoon) {
    case 12: return 'twelfth';
    case 1: return 'over-moon';
    case 2: return 'second';
    case 4: return 'fourth';
    case 8: return 'eighth';
    default: return 'none';
  }
}

const PHASE_TEXT: Record<SaturnMoonPhase, string> = {
  twelfth: 'the first of the three Sade Sati phases (Saturn in the 12th, 1st and 2nd signs from the Moon)',
  'over-moon': 'the middle of the three Sade Sati phases (Saturn in the 12th, 1st and 2nd signs from the Moon)',
  second: 'the last of the three Sade Sati phases (Saturn in the 12th, 1st and 2nd signs from the Moon)',
  fourth: 'not a Sade Sati phase; the 4th from the Moon is traditionally tabulated alongside Sade Sati',
  eighth: 'not a Sade Sati phase; the 8th from the Moon is traditionally tabulated alongside Sade Sati',
  none: 'not a Sade Sati phase',
};

export interface NodeTransitNow {
  planet: 'Rahu' | 'Ketu';
  sign: string;
  signIndex: number;
}

export interface InterpretationFactOptions {
  /** Rahu/Ketu signs at the report date (the snapshot carries only Jupiter and Saturn). */
  nodeTransits?: NodeTransitNow[];
  /** Precomputed Sade Sati periods (register `transit.saturn-from-moon.NN`, numbered as S6 expects). */
  sadeSati?: SadeSatiPeriodsResult;
  /** Full yoga list incl. formed-but-cancelled ones (registers `yoga.<slug>` for the cancelled ones). */
  yogas?: YogaResult[];
}

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Saturn sign segments in the numbering S6 uses for `transit.saturn-from-moon.NN`: every segment of
 * every Sade Sati cycle plus the 4th/8th segments, sorted by start then sign (not filtered by asOf).
 */
export function saturnFromMoonSegments(sadeSati: SadeSatiPeriodsResult) {
  return [...sadeSati.cycles.flatMap((c) => c.segments), ...sadeSati.fourthAndEighth]
    .sort((a, b) => a.startIso.localeCompare(b.startIso) || a.rashiIndex - b.rashiIndex);
}

const nn = (i: number) => String(i + 1).padStart(2, '0');

/** Completed years from the birth date to an ISO instant; 0 when the instant precedes birth. */
export function ageAtIso(dateOfBirth: string, iso: string): number {
  return Math.max(0, completedYears(dateOfBirth.slice(0, 10), iso.slice(0, 10)));
}

export function contributeInterpretationFacts(add: AddEvidence, snapshot: ChartSnapshot, opts: InterpretationFactOptions = {}): void {
  const { natal, vargas, vimshottari } = snapshot;
  const byName = new Map(natal.planets.map((p) => [planetName(p.name), p] as const));
  const ascIdx = natal.ascendant.rashiIndex;
  const moonIdx = byName.get('Moon')!.rashiIndex;

  // --- Dispositor, vargottama, D9/D10 sign dignity --------------------------------------
  const vargaSign = (v: 'D9' | 'D10', p: PlanetName): number | undefined => {
    const chart = vargas[v];
    if (!chart) return undefined;
    const pl = Object.values(chart.placements).find((x) => x.planet !== 'Ascendant' && planetName(String(x.planet)) === p);
    return pl?.rashiIndex;
  };
  for (const p of PLANETS) {
    const pos = byName.get(p);
    if (!pos) continue;
    const k = p.toLowerCase();
    const disp = planetName(getRashiRuler(pos.rashiIndex));
    add(`planet.${k}.d1.dispositor`, 'dispositor',
      `${p}'s dispositor (lord of its D1 sign ${pos.sign}) is ${disp}${disp === p ? ' (it occupies its own sign)' : ''}`, disp, `${SRC}.dispositor`);
    const d9 = vargaSign('D9', p);
    if (d9 !== undefined) {
      const varg = d9 === pos.rashiIndex;
      add(`planet.${k}.vargottama`, 'vargottama',
        varg ? `${p} is vargottama: ${pos.sign} in both the D1 and the D9` : `${p} is not vargottama (D1 ${pos.sign}, D9 ${SIGNS[d9 - 1]})`, varg, `${SRC}.vargottama`);
    }
    for (const v of ['D9', 'D10'] as const) {
      const s = vargaSign(v, p);
      if (s === undefined) continue;
      const dig = vargaSignDignity(p, s);
      const text = p === 'Rahu' || p === 'Ketu'
        ? 'sign dignity is not assessed for the nodes'
        : `${DIGNITY_TEXT[dig]} by sign dignity (exaltation, debilitation and own sign only; not the D1 compound dignity)`;
      add(`planet.${k}.${v.toLowerCase()}.dignity`, 'varga-dignity', `In the ${v} chart ${p} is in ${SIGNS[s - 1]}: ${text}`, dig, `${SRC}.dignity.varga.sign`);
    }
  }
  // --- Functional nature (Laghu Parashari ch. 2 via the engine; provisional) ----------------
  for (const p of PLANETS) {
    if (!byName.has(p)) continue;
    const fn = getFunctionalNature(ascIdx, sym(p));
    add(`planet.${p.toLowerCase()}.d1.functional-nature`, 'functional-nature',
      `${p} is functionally ${fn.nature} for a ${natal.ascendant.sign} Ascendant (${fn.reason}; provisional – pending client review)`, fn.nature, `${SRC}.functionalNature (${fn.source})`);
  }

  // --- Per-planet D1 facts used by the yoga stage (S4/S6) ------------------------------------
  const sun = byName.get('Sun')!;
  const angular = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
  for (const p of PLANETS) {
    const pos = byName.get(p);
    if (!pos) continue;
    const k = p.toLowerCase();
    const cast = (pos.aspectsCast ?? []).map(String);
    add(`planet.${k}.d1.aspects-cast`, 'planet-aspect',
      cast.length ? `${p} casts graha drishti on the ${cast.map((h) => ordinal(Number(h))).join(', ')} house${cast.length > 1 ? 's' : ''}` : `${p} casts no graha drishti`, cast, `${SRC}.aspectsCast (engine)`);
    if (p !== 'Sun' && p !== 'Rahu' && p !== 'Ketu') {
      const dist = Number(angular(pos.absoluteDegree, sun.absoluteDegree).toFixed(2));
      add(`planet.${k}.d1.combust-distance`, 'planet-state', `${p} is ${dist}° from the Sun`, dist, `${SRC}.combustDistance`);
    }
    if (pos.avastha?.baladi) {
      add(`planet.${k}.d1.avastha`, 'planet-state', `${p} is in the ${pos.avastha.baladi.toLowerCase()} Baladi avastha (by degree in sign)`, pos.avastha.baladi, `${SRC}.avastha (engine)`);
    }
  }
  const moonPos = byName.get('Moon')!;
  const elong = (((moonPos.absoluteDegree - sun.absoluteDegree) % 360) + 360) % 360;
  const paksha = elong > 180 ? 'waning' : 'waxing';
  add('planet.moon.d1.paksha', 'planet-state',
    `The Moon is ${paksha} (${paksha === 'waxing' ? 'Shukla' : 'Krishna'} paksha; Moon–Sun elongation ${elong.toFixed(1)}°)`, paksha, `${SRC}.paksha`);

  // --- Graha drishti received by every D1 house (engine aspectsCast, whole sign) -----------
  for (let h = 1; h <= 12; h++) {
    const by = PLANETS.filter((p) => (byName.get(p)?.aspectsCast ?? []).includes(h));
    add(`house.${h}.d1.aspected-by`, 'house-aspect',
      by.length ? `The ${ordinal(h)} house receives graha drishti from ${by.join(', ')}` : `The ${ordinal(h)} house receives no planetary aspect`, by, `${SRC}.houseAspects (engine aspectsCast)`);
  }

  // --- Shadbala vs BPHS ch. 27 required rupas (engine; provisional) --------------------------
  try {
    const report = new ShadbalaCalculator().calculate(snapshot.raw);
    for (const ps of Object.values(report.planets)) {
      if (!ps) continue;
      const p = planetName(ps.planet);
      const ratio = Number((ps.totalRupas / ps.minimumRequirementRupas).toFixed(2));
      add(`planet.${p.toLowerCase()}.shadbala`, 'shadbala',
        `${p} Shadbala ${ps.totalRupas.toFixed(2)} rupas against ${ps.minimumRequirementRupas.toFixed(2)} required (ratio ${ratio}; BPHS ch. 27; provisional – pending client review)`, ratio, `${SRC}.shadbala`);
    }
  } catch {
    // Shadbala unavailable: no shadbala facts (stages then emit no Shadbala condition).
  }

  // --- Chart-level validation facts (S1) ----------------------------------------------------
  const conv = Object.entries(snapshot.conventions).sort(([a], [b]) => a.localeCompare(b)).map(([k, val]) => `${k}=${val}`);
  add('chart.conventions', 'chart-validation',
    `Calculation conventions: ${conv.join(', ')}${snapshot.conventionsProvisional ? ' (provisional – pending client review)' : ''}`, conv, `${SRC}.conventions`);
  const vargaList = Object.keys(vargas).filter((k) => vargas[k as keyof typeof vargas]);
  add('chart.vargas', 'chart-validation', `Divisional charts calculated: ${vargaList.join(', ')}`, vargaList, `${SRC}.vargas`);
  add('chart.birth-time', 'chart-validation', snapshot.subject.timeOfBirth ? 'Birth time recorded' : 'Birth time not recorded', !!snapshot.subject.timeOfBirth, `${SRC}.birthTime`);

  const d9Asc = vargas.D9?.ascendant?.rashiIndex;
  if (d9Asc) {
    const varg = d9Asc === ascIdx;
    add('fact.asc.vargottama', 'vargottama',
      varg ? `The Ascendant is vargottama: ${natal.ascendant.sign} in both the D1 and the D9` : `The Ascendant is not vargottama (D1 ${natal.ascendant.sign}, D9 ${SIGNS[d9Asc - 1]})`, varg, `${SRC}.vargottama`);
  }

  // --- Life stage and dasha ages ---------------------------------------------------------
  const dob = snapshot.subject.dateOfBirth;
  const stage = deriveLifeStage({ subject: { dateOfBirth: dob }, asOfIso: snapshot.asOfIso });
  const band = lifeStageBand(stage.ageYears);
  add('native.age', 'life-stage', `The native is ${stage.ageYears} years old (completed years) at the report date`, stage.ageYears, `${SRC}.lifeStage`);
  add('native.life-stage', 'life-stage',
    `Life stage at the report date: ${band.label} (age ${stage.ageYears}; a product framing band, not an astrological rule)`, band.band, `${SRC}.lifeStage`);
  vimshottari.mahadashas.forEach((md, i) => {
    const lord = planetName(md.lord);
    const startAge = ageAtIso(dob, md.startDateIso);
    const endAge = ageAtIso(dob, md.endDateIso);
    const before = Date.parse(md.startDateIso) < Date.parse(`${dob.slice(0, 10)}T00:00:00Z`);
    add(`dasha.md.${nn(i)}.age`, 'dasha-age',
      `${before ? `The ${lord} Mahadasha was already running at birth (age 0)` : `The ${lord} Mahadasha begins at age ${startAge}`} and ends at age ${endAge} (completed years)`,
      [String(startAge), String(endAge)], `${SRC}.dashaAge`);
    (md.subPeriods ?? []).forEach((ad, j) => {
      const adLord = planetName(ad.lord);
      const id = `dasha.ad.${nn(i)}.${nn(j)}`;
      // IST calendar dates, one human format in labels (audit F24).
      add(id, 'dasha-period', `${lord}–${adLord} Antardasha: ${formatBusinessDate(ad.startDateIso)} to ${formatBusinessDate(ad.endDateIso)}`,
        [adLord, businessDateIso(ad.startDateIso), businessDateIso(ad.endDateIso)], 'dasha.vimshottari');
      const a0 = ageAtIso(dob, ad.startDateIso);
      const a1 = ageAtIso(dob, ad.endDateIso);
      add(`${id}.age`, 'dasha-age', `The ${lord}–${adLord} Antardasha runs from age ${a0} to age ${a1} (completed years)`, [String(a0), String(a1)], `${SRC}.dashaAge`);
    });
  });

  // --- MD–AD mutual position ---------------------------------------------------------------
  const position = (mdLord: PlanetName, adLord: PlanetName) => {
    const m = byName.get(mdLord)!.rashiIndex;
    const a = byName.get(adLord)!.rashiIndex;
    return { adFromMd: countSigns(m, a), mdFromAd: countSigns(a, m) };
  };
  const posLabel = (mdLord: PlanetName, adLord: PlanetName, prefix: string) => {
    const { adFromMd, mdFromAd } = position(mdLord, adLord);
    return adLord === mdLord
      ? `${prefix}: ${mdLord}–${adLord}; the Antardasha lord is the Mahadasha lord itself (same sign, 1st from each other)`
      : `${prefix}: ${mdLord}–${adLord}; in the birth chart ${adLord} is ${ordinal(adFromMd)} from ${mdLord} and ${mdLord} is ${ordinal(mdFromAd)} from ${adLord} (counted by sign)`;
  };
  const asOf = Date.parse(snapshot.asOfIso);
  const curMd = vimshottari.mahadashas.find((m) => Date.parse(m.startDateIso) <= asOf && asOf < Date.parse(m.endDateIso));
  if (curMd) {
    const mdLord = planetName(curMd.lord);
    (curMd.subPeriods ?? []).forEach((ad, i) => {
      const adLord = planetName(ad.lord);
      const { adFromMd, mdFromAd } = position(mdLord, adLord);
      const value = [mdLord, adLord, String(adFromMd), String(mdFromAd)];
      add(`fact.dasha.ad.${nn(i)}.md-ad`, 'dasha-relation', posLabel(mdLord, adLord, `Mahadasha–Antardasha ${formatBusinessDate(ad.startDateIso)} to ${formatBusinessDate(ad.endDateIso)}`), value, `${SRC}.mdAdPosition`);
      if (Date.parse(ad.startDateIso) <= asOf && asOf < Date.parse(ad.endDateIso)) {
        add('fact.dasha.current.md-ad', 'dasha-relation', posLabel(mdLord, adLord, 'Current Mahadasha–Antardasha'), value, `${SRC}.mdAdPosition`);
      }
    });
  }

  // --- Slow-planet transit placements at the report date -----------------------------------
  const transitNow: Array<{ planet: PlanetName; sign: string; signIndex: number }> = [];
  for (const [key, periods] of Object.entries(snapshot.transits ?? {})) {
    const cur = periods.find((p) => Date.parse(p.startIso) <= asOf && asOf < Date.parse(p.endIso));
    if (cur) transitNow.push({ planet: planetName(key), sign: cur.sign, signIndex: cur.signIndex });
  }
  for (const n of opts.nodeTransits ?? []) transitNow.push({ planet: n.planet, sign: n.sign, signIndex: n.signIndex });
  transitNow.sort((a, b) => PLANETS.indexOf(a.planet) - PLANETS.indexOf(b.planet));
  for (const t of transitNow) {
    const fromAsc = countSigns(ascIdx, t.signIndex);
    const fromMoon = countSigns(moonIdx, t.signIndex);
    add(`fact.transit.${t.planet.toLowerCase()}.now`, 'transit-now',
      `At the report date transiting ${t.planet} is in ${t.sign}: the ${ordinal(fromAsc)} sign from the Ascendant and the ${ordinal(fromMoon)} from the natal Moon (this is a transit position, not the natal placement)`,
      [t.sign, String(fromAsc), String(fromMoon)], `${SRC}.transitNow (transit.TransitIngressSolver)`);
    if (t.planet === 'Saturn') {
      const phase = saturnMoonPhase(fromMoon);
      add('fact.transit.saturn.from-moon', 'saturn-from-moon',
        `Saturn-from-Moon phase at the report date: transiting Saturn in ${t.sign} is the ${ordinal(fromMoon)} sign from the natal Moon sign ${byName.get('Moon')!.sign}, ${PHASE_TEXT[phase]}. A neutral timing fact, not a prediction`,
        phase, `${SRC}.saturnFromMoon`);
    }
  }

  // --- Saturn-from-Moon segments (only with precomputed Sade Sati periods) ----------------
  if (opts.sadeSati) {
    saturnFromMoonSegments(opts.sadeSati).forEach((seg, i) => {
      add(`transit.saturn-from-moon.${nn(i)}`, 'saturn-from-moon',
        `Saturn transits ${SIGNS[seg.rashiIndex - 1]} from ${formatBusinessDate(seg.startIso)} to ${formatBusinessDate(seg.endIso)}: the ${ordinal(seg.houseFromMoon)} sign from the natal Moon (${PHASE_TEXT[saturnMoonPhase(seg.houseFromMoon)]}); a neutral timing fact`,
        [SIGNS[seg.rashiIndex - 1], businessDateIso(seg.startIso), businessDateIso(seg.endIso), String(seg.houseFromMoon)], `${SRC}.sadeSati (engine SadeSatiPeriodsCalculator)`);
    });
  }

  // --- Formed-but-cancelled yogas (e.g. Kemadruma with Kemadruma Bhanga) ------------------
  for (const y of opts.yogas ?? []) {
    if (y.isDetected || !y.assessment?.formed || !y.assessment.cancelled) continue;
    add(`yoga.${slug(y.id.replace(/^YOGA_/, ''))}`, 'yoga-cancelled',
      `${y.canonicalName} is formed and cancelled (${y.assessment.cancellations.filter((c) => c.satisfied).map((c) => c.description).join('; ') || 'classical cancellation applies'})`,
      y.canonicalName, 'yoga.evaluateYogas (formedButCancelledYogas)');
  }

  // --- Canonical Sarvashtakavarga definition -----------------------------------------------
  const total = Object.values(snapshot.ashtakavarga.sav.signs as Record<string, number>).reduce((a, b) => a + Number(b), 0);
  add('fact.definition.sav', 'definition',
    `Definition: Sarvashtakavarga (SAV) is the natal total of benefic points (bindus) in each sign, contributed by the seven planets and the Lagna (BPHS, Ashtakavarga chapters); this chart's 12 signs total ${total}, and 28 per sign is the classical average. In transit reading, a transiting planet is qualified by the SAV score of the sign it moves through. The bindus are a natal tally; they are not support given by transiting planets`,
    'natal-bindus-per-sign', `${SRC}.definition`);
}
