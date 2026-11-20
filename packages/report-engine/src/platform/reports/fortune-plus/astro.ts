/**
 * Fortune Plus — the astrology half ("Cosmic Pathway"): extra deterministic
 * calculations, evidence and blocks. Built on @astro/astrology-engine only.
 */
import { MatchmakingCalculator, ManglikStatus } from '@astro/astrology-engine';
import { AddEvidence, EvidenceRegistry, ordinal, planetName, PLANETS, PlanetName } from '../../evidence/evidence-registry';
import { ExtendContext } from '../../module';
import { BlockContext, BlockOutput, northChart } from '../../render/blocks';
import { formatDate, tex } from '../../render/latex';
import { BEEJ_MANTRA, PLANET_AVATAR, PLANET_DAY } from '../_numerology-shared/associations';
import { grid, kv } from '../_numerology-shared/blocks';
import { BirthPanchang, computeBirthPanchang } from './calc/panchang';
import { computeSadeSati, SadeSatiResult } from './calc/sade-sati';

export interface AstroExt {
  panchang: BirthPanchang;
  manglik: ManglikStatus;
  sadeSati: SadeSatiResult;
}

export async function computeAstroExt(ctx: ExtendContext): Promise<AstroExt> {
  const { snapshot } = ctx;
  const moon = snapshot.natal.planets.find((p) => String(p.name).toUpperCase() === 'MOON')!;
  return {
    panchang: computeBirthPanchang(snapshot),
    manglik: new MatchmakingCalculator().evaluateManglikDosha(snapshot.raw),
    sadeSati: await computeSadeSati(snapshot.natal.calculation.normalizedTime.utcIsoString, moon.rashiIndex, snapshot.asOfIso),
  };
}

export const astroOf = (ext: Record<string, unknown>): AstroExt => {
  const a = ext.astro as AstroExt | undefined;
  if (!a) throw new Error('BLOCK_DATA_MISSING: astro');
  return a;
};

const SRC_P = 'panchang.PanchangCalculator (vara by sunrise)';
const SRC_M = 'matchmaking.evaluateManglikDosha';
const SRC_S = 'transit.TransitIngressSolver (Sade Sati grouping)';
const d10 = (iso: string) => iso.slice(0, 10);
const MANGLIK_HOUSES = [1, 4, 7, 8, 12];
const PHASE_NAME = { rising: 'Rising (12th from Moon)', peak: 'Peak (over the Moon sign)', setting: 'Setting (2nd from Moon)' } as const;

export function addAstroEvidence(add: AddEvidence, a: AstroExt): void {
  const p = a.panchang;
  add('panchang.paksha', 'panchang', `Born in ${p.paksha} Paksha`, p.paksha, SRC_P);
  add('panchang.tithi', 'panchang', `Birth tithi is ${p.tithi} (${p.paksha} Paksha)`, p.tithi, SRC_P);
  add('panchang.vara', 'panchang', `Birth weekday (vara, sunrise to sunrise) is ${p.vara}`, p.vara.split(' ')[0], SRC_P);
  add('panchang.yoga', 'panchang', `Birth yoga (Sun + Moon) is ${p.yoga}`, p.yoga, SRC_P);
  add('panchang.karana', 'panchang', `Birth karana is ${p.karana}`, p.karana, SRC_P);

  const m = a.manglik.marsPlacement;
  if (m.houseFromLagna !== undefined) {
    add('manglik.mars.from-lagna', 'manglik', `Counted from the Ascendant, Mars is in house ${m.houseFromLagna}${MANGLIK_HOUSES.includes(m.houseFromLagna) ? ', one of the classical Manglik positions (1, 4, 7, 8, 12)' : ', not a classical Manglik position'}`, m.houseFromLagna, SRC_M);
  }
  if (m.houseFromMoon !== undefined) {
    add('manglik.mars.from-moon', 'manglik', `Counted from the Moon sign, Mars is ${ordinal(m.houseFromMoon)}${MANGLIK_HOUSES.includes(m.houseFromMoon) ? ', a classical Manglik position' : ', not a classical Manglik position'}`, m.houseFromMoon, SRC_M);
  }
  if (m.houseFromVenus !== undefined) {
    add('manglik.mars.from-venus', 'manglik', `Counted from Venus, Mars is ${ordinal(m.houseFromVenus)}${MANGLIK_HOUSES.includes(m.houseFromVenus) ? ', a classical Manglik position' : ', not a classical Manglik position'}`, m.houseFromVenus, SRC_M);
  }
  const refs = [
    m.houseFromLagna !== undefined && MANGLIK_HOUSES.includes(m.houseFromLagna) ? 'Ascendant' : '',
    m.houseFromMoon !== undefined && MANGLIK_HOUSES.includes(m.houseFromMoon) ? 'Moon' : '',
    m.houseFromVenus !== undefined && MANGLIK_HOUSES.includes(m.houseFromVenus) ? 'Venus' : '',
  ].filter(Boolean);
  add('manglik.reference-points', 'manglik', refs.length ? `Mars is in a Manglik position counted from: ${refs.join(', ')}` : 'Mars is in no Manglik position from the Ascendant, Moon or Venus', refs, SRC_M);
  add('manglik.moderating', 'manglik', a.manglik.cancellationFactors.length ? `Classical moderating factors present: ${a.manglik.cancellationFactors.join('; ')}` : 'No classical moderating factor applies', a.manglik.cancellationFactors, SRC_M);

  const s = a.sadeSati;
  add('sadesati.moon-sign', 'sade-sati', `Sade Sati is counted from the Moon sign ${s.moonSign}`, s.moonSign, SRC_S);
  s.cycles.forEach((c) => {
    const n = String(c.index).padStart(2, '0');
    add(`sadesati.cycle.${n}.span`, 'sade-sati', `Sade Sati cycle ${c.index}: ${d10(c.startIso)} to ${d10(c.endIso)}${c.inProgressAtBirth ? ' (already running at birth)' : ''}`, [d10(c.startIso), d10(c.endIso)], SRC_S);
  });
  const cur = s.current;
  add('sadesati.current', 'sade-sati',
    cur.active ? `On the report date Sade Sati is active: cycle ${cur.cycleIndex}, ${cur.phase} phase` : `On the report date Sade Sati is not active${cur.nextCycleIndex ? `; the next cycle is cycle ${cur.nextCycleIndex}` : ''}`,
    cur.active ? 'active' : 'not active', SRC_S);
}

export function astroEvidence(add: AddEvidence, ctx: { ext: Record<string, unknown>; registry: EvidenceRegistry }): void {
  addAstroEvidence(add, astroOf(ctx.ext));
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

const dms = (deg: number) => {
  const m = Math.floor(deg * 60 + 1e-9);
  return `${Math.floor(m / 60)}° ${String(m % 60).padStart(2, '0')}′`;
};

const ABBR: Record<string, string> = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };

export function moonChart(ctx: BlockContext): BlockOutput {
  const { natal } = ctx.snapshot;
  const moon = natal.planets.find((p) => planetName(p.name) === 'Moon')!;
  const houses = Array.from({ length: 12 }, (_, i) => ({ sign: ((moon.rashiIndex - 1 + i) % 12) + 1, lines: [] as string[] }));
  for (const p of natal.planets) houses[(p.rashiIndex - moon.rashiIndex + 12) % 12].lines.push(ABBR[planetName(p.name)]);
  houses[(natal.ascendant.rashiIndex - moon.rashiIndex + 12) % 12].lines.unshift('Asc');
  return {
    tex: `\\begin{center}${northChart(houses)}\\end{center}`,
    evidenceIds: ['planet.moon.d1.sign', ...natal.planets.map((p) => `planet.${planetName(p.name).toLowerCase()}.d1.sign`)],
    method: 'Chandra Kundali: the same planets with the Moon\'s sign as the 1st house. Numbers are signs (1 = Aries … 12 = Pisces).',
  };
}

export function planetTable(ctx: BlockContext): BlockOutput {
  const { natal } = ctx.snapshot;
  const order: PlanetName[] = [...PLANETS];
  const rows = order.map((name) => {
    const p = natal.planets.find((x) => planetName(x.name) === name)!;
    const flags = [p.retrograde ? 'R' : '', p.combust ? 'C' : ''].filter(Boolean).join(' ');
    return [name, p.sign, String(p.house), dms(p.degree), `${p.nakshatra} (${p.pada})`, p.dignity.toLowerCase().replace(/_/g, ' '), flags || '—'];
  });
  rows.unshift(['Ascendant', natal.ascendant.sign, '1', dms(natal.ascendant.degree), `${natal.ascendant.nakshatra} (${natal.ascendant.pada})`, '—', '—']);
  return {
    tex: grid('p{0.13\\linewidth}p{0.13\\linewidth}p{0.07\\linewidth}p{0.1\\linewidth}>{\\raggedright\\arraybackslash}X p{0.15\\linewidth}p{0.06\\linewidth}',
      ['Body', 'Sign', 'House', 'Degree', 'Nakshatra (pada)', 'Dignity', 'State'], rows),
    evidenceIds: ['asc.d1.sign', ...order.flatMap((n) => [`planet.${n.toLowerCase()}.d1.sign`, `planet.${n.toLowerCase()}.d1.house`, `planet.${n.toLowerCase()}.d1.nakshatra`, `planet.${n.toLowerCase()}.d1.dignity`])],
    method: 'Sidereal (Lahiri) positions, whole-sign houses, mean nodes. R = retrograde, C = combust.',
  };
}

export function panchangTable(ctx: BlockContext): BlockOutput {
  const p = astroOf(ctx.ext).panchang;
  const rows: Array<[string, string]> = [
    ['Paksha (lunar fortnight)', p.paksha],
    ['Tithi (lunar day)', `${p.tithi} (${p.tithiIndex} of 30)`],
    ['Vara (weekday)', `${p.vara}${p.bornBeforeSunrise ? ' — birth before sunrise, so the previous civil day' : ''}`],
    ['Nakshatra (Moon\'s star)', `${p.nakshatra}, pada ${p.nakshatraPada}`],
    ['Yoga', p.yoga],
    ['Karana', p.karana],
    ['Sunrise / sunset (local)', `${p.sunriseLocal} / ${p.sunsetLocal}`],
  ];
  return {
    tex: kv('en', rows, ['Element', 'At your birth']),
    evidenceIds: ['panchang.paksha', 'panchang.tithi', 'panchang.vara', 'panchang.yoga', 'panchang.karana', 'planet.moon.d1.nakshatra'],
    method: 'Tithi = Moon − Sun in 12° steps; yoga = Sun + Moon in 13°20′ steps; karana = half-tithi; the weekday runs from sunrise to sunrise at the birth place. Computed from the same sidereal positions as your chart.',
  };
}

export function manglikTable(ctx: BlockContext): BlockOutput {
  const m = astroOf(ctx.ext).manglik;
  const pos = m.marsPlacement;
  const mark = (h?: number) => (h === undefined ? '—' : `${ordinal(h)}${MANGLIK_HOUSES.includes(h) ? ' — Manglik position' : ''}`);
  const rows: string[][] = [
    ['Ascendant (Lagna)', mark(pos.houseFromLagna)],
    ['Moon sign', mark(pos.houseFromMoon)],
    ['Venus', mark(pos.houseFromVenus)],
  ];
  const mod = m.cancellationFactors.length ? m.cancellationFactors.join('; ') : 'None of the listed classical factors applies';
  return {
    tex: grid('p{0.4\\linewidth}X', ['Counted from', 'Mars is in house'], rows)
      + `\n\\begin{asCard}\\CardTitle{Classical moderating factors}{\\fontsize{9.3}{13}\\selectfont ${tex(mod)}\\par}\\end{asCard}`,
    evidenceIds: ['planet.mars.d1.house', 'manglik.mars.from-lagna', 'manglik.mars.from-moon', 'manglik.mars.from-venus', 'manglik.reference-points', 'manglik.moderating'],
    method: 'Classical rule: Mars in the 1st, 4th, 7th, 8th or 12th counted from the Ascendant, the Moon or Venus. Moderating factors (own or exalted sign in those houses, Jupiter\'s conjunction or aspect) are the engine\'s classical list. Astro Sushil does not treat this as a dosha; no grade is given.',
  };
}

export function sadeSatiTable(ctx: BlockContext): BlockOutput {
  const s = astroOf(ctx.ext).sadeSati;
  const rows: string[][] = [];
  const hl: number[] = [];
  for (const c of s.cycles) {
    for (const ph of c.phases) {
      if (s.current.cycleIndex === c.index) hl.push(rows.length);
      rows.push([
        String(c.index),
        PHASE_NAME[ph.phase],
        ph.sign,
        ph.startIso === c.startIso && c.inProgressAtBirth ? 'before birth' : formatDate(ph.startIso),
        ph.endIso === c.endIso && c.openEnded ? 'beyond horizon' : formatDate(ph.endIso),
      ]);
    }
  }
  const status = s.current.active
    ? `On your report date you are in Sade Sati cycle ${s.current.cycleIndex} (${s.current.phase} phase).`
    : `On your report date Sade Sati is not active.${s.current.nextCycleIndex ? ` The next cycle is cycle ${s.current.nextCycleIndex} in the table.` : ''}`;
  return {
    tex: `\\begin{asHighlight}{\\fontsize{9.8}{13.5}\\selectfont ${tex(status)}\\par}\\end{asHighlight}\n`
      + grid('p{0.07\\linewidth}>{\\raggedright\\arraybackslash}X p{0.15\\linewidth}p{0.17\\linewidth}p{0.17\\linewidth}', ['Cycle', 'Phase', 'Saturn in', 'From', 'To'], rows, (i) => hl.includes(i)),
    evidenceIds: ['sadesati.moon-sign', 'sadesati.current', ...s.cycles.map((c) => `sadesati.cycle.${String(c.index).padStart(2, '0')}.span`)],
    method: `Saturn's transit through the 12th, 1st and 2nd signs from your Moon sign (${s.moonSign}), from birth for ${s.horizonYears} years, solved by the transit ingress engine; a phase runs from Saturn's first entry into the sign to its final exit, including retrograde re-entries.`,
  };
}

export function yogaTable(ctx: BlockContext): BlockOutput {
  const detected = ctx.snapshot.yogas.filter((y) => y.isDetected);
  const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const rows = detected.map((y) => [y.canonicalName, String(y.category).toLowerCase().replace(/_/g, ' '), y.evidence.conditions.filter((c) => c.satisfied).map((c) => c.description).slice(0, 2).join('; ')]);
  return {
    tex: rows.length
      ? grid('p{0.24\\linewidth}p{0.14\\linewidth}>{\\raggedright\\arraybackslash}X', ['Yoga', 'Type', 'Conditions met in your chart'], rows)
      : '{\\itshape None of the yogas in the engine\'s catalogue is formed in this chart.}',
    evidenceIds: detected.map((y) => `yoga.${slug(y.id.replace(/^YOGA_/, ''))}`),
    method: 'Yogas detected by the astrology engine\'s rule catalogue on the D1 chart; each row lists the conditions that are satisfied.',
  };
}

export function dashaTable(ctx: BlockContext): BlockOutput {
  const v = ctx.snapshot.vimshottari;
  const asOf = Date.parse(ctx.snapshot.asOfIso);
  const rows = v.mahadashas.map((md) => [planetName(md.lord), formatDate(md.startDateIso), formatDate(md.endDateIso)]);
  const cur = v.mahadashas.findIndex((md) => Date.parse(md.startDateIso) <= asOf && asOf < Date.parse(md.endDateIso));
  return {
    tex: grid('>{\\raggedright\\arraybackslash}X p{0.25\\linewidth}p{0.25\\linewidth}', ['Mahadasha lord', 'From', 'To'], rows, (i) => i === cur),
    evidenceIds: ['dasha.birth-lord', ...v.mahadashas.map((_, i) => `dasha.md.${String(i + 1).padStart(2, '0')}`)],
    method: `Vimshottari dasha from the Moon's nakshatra (${v.moonNakshatraName}); the highlighted row is the period running on the report date.`,
  };
}

/** FP-006 Free practices keyed to the 1st, 5th and 9th lords (the classical trikona lords). */
const SERVICE: Record<string, string> = {
  Sun: 'offer water to the rising Sun; respect and help father figures', Moon: 'care for your mother and elders; share water or food',
  Mars: 'help siblings and colleagues; physical discipline such as a morning walk', Mercury: 'teach or tutor; keep promises in writing',
  Jupiter: 'honour teachers; share books or food on Thursdays', Venus: 'respect women; keep your space clean and beautiful',
  Saturn: 'serve the elderly and workers; be punctual', Rahu: 'help people at the margins; avoid shortcuts', Ketu: 'feed animals; quiet meditation',
};

export function remedyTable(ctx: BlockContext): BlockOutput {
  const r = ctx.registry;
  const lord = (h: number) => String(r.get(`house.${h}.d1.lord`)!.value) as PlanetName;
  const seen = new Set<string>();
  const rows: string[][] = [];
  for (const [h, role] of [[1, 'Ascendant lord'], [5, '5th lord (purva punya)'], [9, '9th lord (fortune)']] as Array<[number, string]>) {
    const pl = lord(h);
    const label = seen.has(pl) ? `${role} (same planet)` : role;
    seen.add(pl);
    rows.push([`${label}: ${pl}`, PLANET_DAY[pl].en, `${PLANET_AVATAR[pl].en}; ${BEEJ_MANTRA[pl].roman}`, SERVICE[pl]]);
  }
  return {
    tex: grid('p{0.2\\linewidth}p{0.12\\linewidth}>{\\raggedright\\arraybackslash}p{0.3\\linewidth}>{\\raggedright\\arraybackslash}X', ['Planet', 'Day', 'Deity form & mantra', 'Free practice'], rows),
    evidenceIds: ['house.1.d1.lord', 'house.5.d1.lord', 'house.9.d1.lord'],
    method: 'The lords of the 1st, 5th and 9th houses (trikona lords) are the classical planets to strengthen. Each is supported here only through devotion (BPHS avatar association, Navagraha beej mantra) and service; no gemstones or purchases.',
  };
}

export const ASTRO_BLOCKS = {
  'fortune-plus-moon-chart': moonChart,
  'fortune-plus-planets': planetTable,
  'fortune-plus-panchang': panchangTable,
  'fortune-plus-manglik': manglikTable,
  'fortune-plus-sadesati': sadeSatiTable,
  'fortune-plus-yogas': yogaTable,
  'fortune-plus-dashas': dashaTable,
  'fortune-plus-remedies': remedyTable,
};

