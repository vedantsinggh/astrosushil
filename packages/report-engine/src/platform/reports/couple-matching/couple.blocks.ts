/**
 * Couple Kundli Matching — deterministic blocks. Every block shows both
 * natives; partner facts cite `partner.*` evidence.
 */
import { getCompoundRelationship, getNaturalRelationship, getTemporalRelationship, PlanetSymbol, VargaType } from '@astro/astrology-engine';
import { BlockContext, BlockRenderer } from '../../render/blocks';
import { ordinal, planetName, PLANETS } from '../../evidence/evidence-registry';
import { formatDate, tex } from '../../render/latex';
import { ChartSnapshot } from '../../snapshot/chart-snapshot';
import { classifyFunctionalNature, FUNCTIONAL_METHOD, NATURE_LABEL } from '../_finance-couple-shared/functional-nature';
import { GOCHARA_FAVOURABLE_FROM_MOON, transitEvidenceId } from '../_finance-couple-shared/gochara';
import {
  ABBR,
  antardashaTable,
  ashtakavargaTable,
  avakhadaFor,
  chartEvidence,
  ChartKind,
  chartFor,
  mahadashaTable,
  panchangAtBirth,
  planetTable,
  PLANET_TABLE_METHOD,
  savChart,
  sideBySide,
  sodhyaPindaTable,
  tableTex,
  titleCase,
} from '../_finance-couple-shared/natal-tables';
import { CoupleExt, dashaOverlap, jointTransits, KOOTA_AREA, KOOTA_KEYS, KOOTA_SLUG, nodalAxis, saturnMoonPeriods, Who } from './couple.calc';
import { OVERLAP_YEARS } from './couple.evidence';

const two = (n: number) => String(n).padStart(2, '0');
const fmtPts = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function both(ctx: BlockContext): { native: ChartSnapshot; partner: ChartSnapshot; ext: CoupleExt } {
  if (!ctx.partner) throw new Error('BLOCK_DATA_MISSING: partner snapshot');
  const ext = ctx.ext as unknown as CoupleExt;
  if (!ext?.match) throw new Error('BLOCK_DATA_MISSING: match result');
  return { native: ctx.snapshot, partner: ctx.partner, ext };
}

const nameOf = (s: ChartSnapshot) => s.subject.name.trim();
const P = (sym: string) => planetName(sym);

export const coupleSignificance: BlockRenderer = (ctx) => {
  const { native, partner } = both(ctx);
  const rows = KOOTA_KEYS.map((k, i) => [`\\TCell{\\textbf{${i + 1}}}`, `\\TCell{${['Varna', 'Vashya', 'Tara', 'Yoni', 'Graha Maitri', 'Gana', 'Bhakoot', 'Nadi'][i]}}`, `\\TCell{${[1, 2, 3, 4, 5, 6, 7, 8][i]}}`, `\\TCell{${tex(KOOTA_AREA[k])}}`]);
  return {
    tex: `{\\fontsize{10}{14.5}\\selectfont Classical Vedic matching (Ashtakoota, or Guna Milan) compares the two Moons: their signs and nakshatras. Eight factors (kootas) carry rising weights from 1 to 8 points, 36 in all; tradition regards 18 or more as an acceptable basis. Here, ${tex(nameOf(native))} has the Moon in ${tex(native.natal.planets.find((p) => P(p.name) === 'Moon')!.sign)} and ${tex(nameOf(partner))} in ${tex(partner.natal.planets.find((p) => P(p.name) === 'Moon')!.sign)}. The guna total is one lens among many: this report also sets the two complete charts side by side, because the lagna, Venus, the 7th house, the Navamsa and the dasha periods say as much about a shared life as any score.\\par}\n` +
      tableTex('c l c X', ['No.', 'Koota', 'Max', 'What it compares'], rows) +
      '\n\\begin{asCard}\\CardTitle{About Manglik}{\\fontsize{9.5}{13}\\selectfont Tradition also compares Mars\'s position (1st, 4th, 7th, 8th or 12th from the Ascendant) in both charts and prefers that both or neither have it. Astro Sushil does not believe in doshas as curses: we show the comparison for completeness and read Mars as energy and drive that a couple learns to channel together.\\par}\\end{asCard}',
    evidenceIds: ['planet.moon.d1.sign', 'partner.planet.moon.d1.sign'],
    method: 'Classical Ashtakoota weights (Varna 1, Vashya 2, Tara 3, Yoni 4, Graha Maitri 5, Gana 6, Bhakoot 7, Nadi 8).',
  };
};

export const coupleBirthDetails: BlockRenderer = (ctx) => {
  const { native, partner } = both(ctx);
  const col = (s: ChartSnapshot) => {
    const asc = s.natal.ascendant;
    const moon = s.natal.planets.find((p) => P(p.name) === 'Moon')!;
    const sun = s.natal.planets.find((p) => P(p.name) === 'Sun')!;
    const av = avakhadaFor(s);
    const pc = panchangAtBirth(s);
    return [
      `${asc.sign} ${Math.floor(asc.degree)}°`, P(asc.lord), moon.sign, P(av.rashiLord), `${moon.nakshatra}-${moon.pada}`, P(moon.nakshatraLord),
      sun.sign, `${pc.tithi.name} (${titleCase(pc.tithi.paksha)})`, pc.yoga.name, pc.karana.name,
      av.varna, av.vashya, `${av.yoni} (${av.yoniGender.toLowerCase()})`, av.gana, av.nadi, av.paya, av.namakshara, av.tatwa,
    ];
  };
  const labels = ['Ascendant', 'Ascendant lord', 'Moon sign (Rashi)', 'Rashi lord', 'Nakshatra-pada', 'Nakshatra lord', 'Sun sign (sidereal)', 'Tithi', 'Yoga', 'Karana',
    'Varna', 'Vashya', 'Yoni', 'Gana', 'Nadi', 'Paya', 'Name syllable', 'Tatwa'];
  const a = col(native);
  const b = col(partner);
  const rows = labels.map((l, i) => [`\\TCell{\\textbf{${l}}}`, `\\TCell{${tex(a[i])}}`, `\\TCell{${tex(b[i])}}`]);
  const birth = (s: ChartSnapshot) => `${formatDate(s.subject.dateOfBirth)}${s.subject.timeOfBirth ? `, ${s.subject.timeOfBirth}` : ''}, ${s.subject.placeName}`;
  rows.unshift(['\\TCell{\\textbf{Birth}}', `\\TCell{${tex(birth(native))}}`, `\\TCell{${tex(birth(partner))}}`]);
  return {
    tex: tableTex('>{\\raggedright\\arraybackslash}p{0.24\\linewidth} X X', ['Factor', tex(nameOf(native)), tex(nameOf(partner))], rows),
    evidenceIds: ['asc.d1.sign', 'asc.d1.lord', 'planet.moon.d1.sign', 'planet.moon.d1.nakshatra', 'planet.sun.d1.sign', 'match.avakhada.native',
      'partner.asc.d1.sign', 'partner.asc.d1.lord', 'partner.planet.moon.d1.sign', 'partner.planet.moon.d1.nakshatra', 'partner.planet.sun.d1.sign', 'match.avakhada.partner'],
    method: 'Avakahada Chakra from each Moon\'s sign and nakshatra; Panchang elements from the Sun-Moon elongation at birth. Weekday omitted (engine uses the UTC date).',
  };
};

function bars(ext: CoupleExt): string {
  const k = ext.match.result.ashtakoota.kootas;
  const names = ['Varna', 'Vashya', 'Tara', 'Yoni', 'Maitri', 'Gana', 'Bhakoot', 'Nadi'];
  const lines = KOOTA_KEYS.map((key, i) => {
    const y = -(i * 0.62);
    const mx = k[key].maxPoints;
    const ob = k[key].obtainedPoints;
    return `\\node[anchor=east,font=\\sffamily\\fontsize{7.5}{9}\\selectfont] at (-0.15,${y}) {${names[i]}};` +
      `\\fill[Rule] (0,${y - 0.2}) rectangle (${mx * 1.2},${y + 0.2});` +
      (ob > 0 ? `\\fill[Primary] (0,${y - 0.2}) rectangle (${ob * 1.2},${y + 0.2});` : '') +
      `\\node[anchor=west,font=\\sffamily\\fontsize{7.5}{9}\\selectfont] at (${mx * 1.2 + 0.15},${y}) {${fmtPts(ob)} / ${mx}};`;
  });
  return `\\begin{center}\\begin{tikzpicture}${lines.join('\n')}\\end{tikzpicture}\\end{center}`;
}

export const coupleKootaTable: BlockRenderer = (ctx) => {
  const { ext } = both(ctx);
  const { match } = ext;
  const k = match.result.ashtakoota.kootas;
  const pa = match.profile.native;
  const pb = match.profile.partner;
  const val: Record<string, [string, string]> = {
    varna: [titleCase(pa.varna), titleCase(pb.varna)], vashya: [titleCase(pa.vashya), titleCase(pb.vashya)],
    tara: [`${pa.nakshatraName}`, `${pb.nakshatraName}`], yoni: [titleCase(pa.yoni.animal), titleCase(pb.yoni.animal)],
    grahaMaitri: [P(pa.rashiLord), P(pb.rashiLord)], gana: [titleCase(pa.gana), titleCase(pb.gana)],
    bhakoot: [pa.rashiName, pb.rashiName], nadi: [titleCase(pa.nadi), titleCase(pb.nadi)],
  };
  const rows = KOOTA_KEYS.map((key) => [`\\TCell{\\textbf{${tex(k[key].name)}}}`, `\\TCell{${tex(val[key][0])}}`, `\\TCell{${tex(val[key][1])}}`,
    `\\TCell{${k[key].maxPoints}}`, `\\TCell{\\textbf{${fmtPts(k[key].obtainedPoints)}}}`, `\\TCell{${tex(KOOTA_AREA[key])}}`]);
  rows.push(['\\TCell{\\textbf{Total}}', '\\TCell{}', '\\TCell{}', '\\TCell{36}', `\\TCell{\\textbf{${fmtPts(match.result.ashtakoota.totalObtainedPoints)}}}`, '\\TCell{}']);
  return {
    tex: tableTex('l l l c c X', ['Koota', 'You', 'Partner', 'Max', 'Points', 'Area of life'], rows) + bars(ext),
    evidenceIds: [...KOOTA_KEYS.map((key) => `match.koota.${KOOTA_SLUG[key]}`), 'match.total', 'match.groom-chart'],
    method: `Engine MatchmakingCalculator (classical Parashari Ashtakoota). Varna and Vashya are directional; ${match.groom === 'native' ? 'your' : "your partner's"} chart is taken as the groom's chart (male partner where the pair is male/female). Bars: grey = maximum, filled = points obtained. Bhakoot points are shown before any cancellation.`,
  };
};

export const coupleVerdict: BlockRenderer = (ctx) => {
  const { ext } = both(ctx);
  const r = ext.match.result.ashtakoota;
  const k = r.kootas;
  const eff = r.totalEffectivePoints ?? r.totalObtainedPoints;
  const card = (title: string, body: string) => `\\begin{asCard}\\CardTitle{${title}}{\\fontsize{9.5}{13}\\selectfont ${body}\\par}\\end{asCard}`;
  const bhak = k.bhakoot.condition === 'AUSPICIOUS'
    ? `The two Moon signs are ${k.bhakoot.relativeDistance} apart (${tex(k.bhakoot.relationshipName ?? '')}), a harmonious distance: full 7 points.`
    : `The two Moon signs are ${k.bhakoot.relativeDistance} apart (${tex(k.bhakoot.relationshipName ?? '')}), which the table scores 0. ${k.bhakoot.isDoshaCancelled ? `A classical exception applies (${k.bhakoot.evidence.sameLord ? 'both Moon signs share one lord' : k.bhakoot.evidence.mutualFriends ? 'the two Moon-sign lords are natural friends' : 'both Moons share one nakshatra'}), so tradition restores the 7 points: effective total ${fmtPts(eff)}.` : 'None of the classical exceptions (same lord, friendly lords, same nakshatra) applies.'}`;
  const nadi = k.nadi.condition === 'DIFFERENT_NADI'
    ? `Your Nadis differ (${titleCase(k.nadi.personANadi)} and ${titleCase(k.nadi.personBNadi)}): full 8 points.`
    : `You share the ${titleCase(k.nadi.personANadi)} Nadi. ${k.nadi.isDoshaCancelled ? `A classical exception applies: ${tex(k.nadi.cancellationReason?.replace(/^Nadi Dosha (cancelled|mitigated): /, '') ?? '')}` : 'No classical exception applies; tradition reads this as a reminder to look after each other\'s health and routines.'}`;
  return {
    tex: `\\begin{asHighlight}\\CardTitle{Guna Milan result}{\\fontsize{11}{15}\\selectfont \\textbf{${fmtPts(r.totalObtainedPoints)} of 36} points${eff !== r.totalObtainedPoints ? ` (effective ${fmtPts(eff)} after the Bhakoot exception)` : ''}. The classical minimum is 18; this match is ${r.totalObtainedPoints >= 18 ? 'at or above' : 'below'} that line.\\par}\\end{asHighlight}\n` +
      card('Bhakoot (Moon-sign distance)', bhak) + '\n' + card('Nadi', nadi) + '\n' +
      card('How to hold this number', 'Guna Milan compares only the two Moons. A high score does not guarantee harmony and a low score does not forbid it; the chapters that follow read the whole of both charts.'),
    evidenceIds: ['match.total', 'match.total-effective', 'match.threshold', 'match.bhakoot.status', 'match.nadi.status'],
    method: 'Bhakoot exceptions as implemented in the engine: same Moon-sign lord, mutually friendly lords (naisargika), or same nakshatra. Nadi exceptions: same nakshatra in different signs, same sign with different nakshatras and friendly lords, or different padas.',
  };
};

export const coupleManglik: BlockRenderer = (ctx) => {
  const { native, partner, ext } = both(ctx);
  const row = (s: ChartSnapshot, w: Who) => {
    const m = ext.match.manglik[w];
    const mp = m.marsPlacement;
    return [`\\TCell{\\textbf{${tex(nameOf(s))}}}`, `\\TCell{${ordinal(mp.houseFromLagna ?? 0)}}`, `\\TCell{${ordinal(mp.houseFromMoon ?? 0)}}`, `\\TCell{${ordinal(mp.houseFromVenus ?? 0)}}`,
      `\\TCell{${m.isManglik ? 'Yes' : 'No'}}`, `\\TCell{${tex(m.cancellationFactors.join('; ') || '--')}}`];
  };
  const v = ext.match.result.manglikComparison.verdict;
  const verdict = v === 'BOTH_NON_MANGLIK' ? 'Neither chart has the classical Mars placement once balancing factors are counted, so the traditional rule is satisfied.'
    : v === 'BOTH_MANGLIK' ? 'Both charts have the classical Mars placement; tradition regards this as mutually balanced.'
      : v === 'MANGLIK_MISMATCH' ? 'Only one chart has the classical Mars placement once balancing factors are counted. Tradition would ask for both or neither; we read it simply as a difference in drive and pace that the couple can work with consciously.'
        : 'A birth time is missing, so the Ascendant-based rule cannot be applied.';
  return {
    tex: tableTex('l c c c c X', ['', 'Mars from Lagna', 'from Moon', 'from Venus', 'Placement 1/4/7/8/12', 'Balancing factors'], [row(native, 'native'), row(partner, 'partner')]) +
      `\n\\begin{asCard}\\CardTitle{Comparison}{\\fontsize{9.5}{13}\\selectfont ${verdict} Astro Sushil does not believe in doshas as afflictions: Mars describes energy, courage and directness.\\par}\\end{asCard}`,
    evidenceIds: ['match.manglik.native', 'match.manglik.partner', 'match.manglik.comparison', 'planet.mars.d1.house', 'partner.planet.mars.d1.house'],
    method: 'Engine Manglik evaluation: Mars in the 1st, 4th, 7th, 8th or 12th from the Ascendant (houses from Moon and Venus shown for information). Balancing factors: Mars in own or exaltation sign in specific houses, or Jupiter conjoining or aspecting Mars.',
  };
};

export function couplePlanets(w: Who): BlockRenderer {
  return (ctx) => {
    const { native, partner } = both(ctx);
    const s = w === 'native' ? native : partner;
    const t = planetTable(s, w === 'native' ? '' : 'partner.');
    return { tex: `{\\sffamily\\fontsize{9}{11}\\selectfont\\bfseries\\color{Accent}${tex(nameOf(s).toUpperCase())}}\\par` + t.tex, evidenceIds: t.evidenceIds, method: PLANET_TABLE_METHOD };
  };
}

export function coupleCharts(kinds: Array<[ChartKind, string]>, scale = 0.92): BlockRenderer {
  return (ctx) => {
    const { native, partner } = both(ctx);
    const parts = kinds.map(([kind, label]) =>
      sideBySide(chartFor(native, kind, scale), chartFor(partner, kind, scale), `${nameOf(native)} - ${label}`, `${nameOf(partner)} - ${label}`));
    return {
      tex: parts.join('\n\\vspace{1mm}\n'),
      evidenceIds: kinds.flatMap(([kind]) => [...chartEvidence('', kind), ...chartEvidence('partner.', kind)]),
      method: 'North Indian style; numbers are signs (1 = Aries ... 12 = Pisces); the top diamond is the 1st house. Moon and Sun charts count houses from that planet\'s sign. Divisional charts from the engine\'s VargaCalculator (Parashari rules).',
    };
  };
}

const VARGA_LABEL: Array<[VargaType, string]> = [
  ['D2', 'Hora (D2), wealth'], ['D3', 'Drekkana (D3), siblings'], ['D4', 'Chaturthamsa (D4), property'],
  ['D7', 'Saptamsa (D7), children'], ['D10', 'Dasamsa (D10), career'], ['D12', 'Dwadasamsa (D12), parents'],
  ['D16', 'Shodasamsa (D16), comforts'], ['D30', 'Trimsamsa (D30), challenges'], ['D60', 'Shashtiamsa (D60), overall'],
];

export const coupleVargasA = coupleCharts(VARGA_LABEL.slice(0, 3), 0.8);
export const coupleVargasB = coupleCharts(VARGA_LABEL.slice(3, 6), 0.8);
export const coupleVargasC = coupleCharts(VARGA_LABEL.slice(6, 9), 0.8);

const SEVEN = [PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.MARS, PlanetSymbol.MERCURY, PlanetSymbol.JUPITER, PlanetSymbol.VENUS, PlanetSymbol.SATURN];
const REL_SHORT: Record<string, string> = { GREAT_FRIEND: 'GF', FRIEND: 'F', NEUTRAL: 'N', ENEMY: 'E', GREAT_ENEMY: 'GE' };

function friendshipGrid(s: ChartSnapshot | undefined): string {
  const rows = SEVEN.map((a) => {
    const pa = s?.natal.planets.find((p) => p.name === a);
    return [`\\TCell{\\textbf{${ABBR[P(a)]}}}`, ...SEVEN.map((b) => {
      if (a === b) return '\\TCell{--}';
      const nat = getNaturalRelationship(a, b);
      if (!s) return `\\TCell{${REL_SHORT[nat]}}`;
      const pb = s.natal.planets.find((p) => p.name === b)!;
      return `\\TCell{${REL_SHORT[getCompoundRelationship(nat, getTemporalRelationship(pa!.rashiIndex, pb.rashiIndex))]}}`;
    })];
  });
  return tableTex(`l ${'c '.repeat(7)}`, ['', ...SEVEN.map((p) => ABBR[P(p)])], rows, { font: '\\fontsize{8}{10}\\selectfont' });
}

export const coupleFriendship: BlockRenderer = (ctx) => {
  const { native, partner } = both(ctx);
  return {
    tex: `{\\sffamily\\fontsize{8.5}{10}\\selectfont\\bfseries\\color{Primary}PERMANENT (NAISARGIKA) FRIENDSHIP}\\par` + friendshipGrid(undefined) +
      sideBySide(friendshipGrid(native), friendshipGrid(partner), `${nameOf(native)} - five-fold (Panchadha)`, `${nameOf(partner)} - five-fold (Panchadha)`),
    evidenceIds: SEVEN.flatMap((p) => [`planet.${P(p).toLowerCase()}.d1.sign`, `partner.planet.${P(p).toLowerCase()}.d1.sign`]),
    method: 'Row planet\'s attitude to column planet. Naisargika friendship (BPHS ch. 15) combined with temporary friendship (planets 2nd, 3rd, 4th, 10th, 11th, 12th from each other are temporary friends) gives the five-fold relation: GF great friend, F friend, N neutral, E enemy, GE great enemy.',
  };
};

export function coupleAshtakavarga(w: Who): BlockRenderer {
  return (ctx) => {
    const { native, partner } = both(ctx);
    const s = w === 'native' ? native : partner;
    const prefix = w === 'native' ? '' : 'partner.';
    const t = ashtakavargaTable(s, prefix);
    const sav = savChart(s, prefix, 0.72);
    return {
      tex: `{\\sffamily\\fontsize{9}{11}\\selectfont\\bfseries\\color{Accent}${tex(nameOf(s).toUpperCase())}}\\par` + t.tex +
        sideBySide(sav.tex, sodhyaPindaTable(s), 'Sarvashtakavarga by house', 'Shodhya pinda'),
      evidenceIds: [...new Set([...t.evidenceIds, ...sav.evidenceIds])],
      method: 'Bhinnashtakavarga bindus per planet by sign (Aries ... Pisces), with the house each sign occupies; SAV = sum of the seven (28 per house is the average). Shodhya pinda after trikona and ekadhipatya reductions (engine AshtakavargaCalculator).',
    };
  };
}

export const coupleDashaMd: BlockRenderer = (ctx) => {
  const { native, partner } = both(ctx);
  const a = mahadashaTable(native, '');
  const b = mahadashaTable(partner, 'partner.');
  const aa = antardashaTable(native, '');
  const bb = antardashaTable(partner, 'partner.');
  return {
    tex: sideBySide(a.tex, b.tex, `${nameOf(native)} - Mahadashas`, `${nameOf(partner)} - Mahadashas`) +
      sideBySide(aa.tex, bb.tex, `${nameOf(native)} - running Mahadasha`, `${nameOf(partner)} - running Mahadasha`),
    evidenceIds: [...a.evidenceIds, ...b.evidenceIds, ...aa.evidenceIds, ...bb.evidenceIds],
    method: 'Vimshottari dasha from each Moon\'s nakshatra (120-year cycle). Bold = running period.',
  };
};

export const couplePratyantar: BlockRenderer = (ctx) => {
  const { native, partner, ext } = both(ctx);
  const grid = (w: Who) => {
    const tree = ext.pratyantar[w];
    const now = Date.parse(tree.activeDasha?.targetDateIso ?? native.asOfIso);
    const md = tree.mahadashas.find((m) => Date.parse(m.startDateIso) <= now && now < Date.parse(m.endDateIso));
    const ad = md?.subPeriods?.find((x) => Date.parse(x.startDateIso) <= now && now < Date.parse(x.endDateIso));
    if (!md || !ad) throw new Error('BLOCK_DATA_MISSING: pratyantar');
    const rows = (ad.subPeriods ?? []).map((pd) => {
      const cur = Date.parse(pd.startDateIso) <= now && now < Date.parse(pd.endDateIso);
      const b = (x: string) => (cur ? `\\textbf{${x}}` : x);
      return [`\\TCell{${b(`${ABBR[P(md.lord)]}-${ABBR[P(ad.lord)]}-${ABBR[P(pd.lord)]}`)}}`, `\\TCell{${b(formatDate(pd.startDateIso))}}`, `\\TCell{${b(formatDate(pd.endDateIso))}}`];
    });
    return tableTex('X l l', ['Pratyantar', 'From', 'To'], rows);
  };
  return {
    tex: sideBySide(grid('native'), grid('partner'), `${nameOf(native)} - running Antardasha`, `${nameOf(partner)} - running Antardasha`),
    evidenceIds: ['dasha.current.md', 'partner.dasha.current.md', ...(ctx.registry.has('dasha.current.ad') ? ['dasha.current.ad'] : []), ...(ctx.registry.has('partner.dasha.current.ad') ? ['partner.dasha.current.ad'] : [])],
    method: 'Third-level Vimshottari periods (pratyantar dasha) inside each running Antardasha, from the engine\'s DashaCalculator.',
  };
};

export const coupleOverlap: BlockRenderer = (ctx) => {
  const { native, partner } = both(ctx);
  const segs = dashaOverlap(native, partner, OVERLAP_YEARS);
  const rows = segs.map((sg) => [`\\TCell{${formatDate(sg.startIso)} -- ${formatDate(sg.endIso)}}`, `\\TCell{${sg.native.md}--${sg.native.ad}}`, `\\TCell{${sg.partner.md}--${sg.partner.ad}}`]);
  return {
    tex: tableTex('l X X', ['Shared stretch', tex(nameOf(native)), tex(nameOf(partner))], rows),
    evidenceIds: [...segs.map((_, i) => `match.overlap.${two(i + 1)}`), 'match.dasha.native', 'match.dasha.partner'],
    method: `A new row starts whenever either person's Vimshottari Antardasha changes; covers ${OVERLAP_YEARS} years from the report date. This replaces percentage "astro graphs", for which no classical rule exists.`,
  };
};

export const coupleSaturn: BlockRenderer = (ctx) => {
  const { native, partner } = both(ctx);
  const grid = (s: ChartSnapshot, w: Who) => {
    const per = saturnMoonPeriods(s);
    if (!per.length) return { tex: '{\\fontsize{9}{12}\\selectfont\\itshape No such Saturn period in the next 12 years.\\par}', ids: [`match.saturn.${w}.count`] };
    const rows = per.map((p) => [`\\TCell{${tex(p.period.sign)}${p.period.enteredRetrograde ? ' (R)' : ''}}`, `\\TCell{${formatDate(p.period.startIso)} -- ${formatDate(p.period.endIso)}}`, `\\TCell{${tex(p.phase)}}`]);
    return { tex: tableTex('l l X', ['Saturn in', 'Period', 'Phase from Moon'], rows, { font: '\\fontsize{7.8}{9.8}\\selectfont' }), ids: [`match.saturn.${w}.count`, ...per.map((_, i) => `match.saturn.${w}.${two(i + 1)}`)] };
  };
  const a = grid(native, 'native');
  const b = grid(partner, 'partner');
  return {
    tex: sideBySide(a.tex, b.tex, nameOf(native), nameOf(partner)) +
      '\n\\begin{asCard}{\\fontsize{9.5}{13}\\selectfont Sade Sati is Saturn\'s passage over the 12th, 1st and 2nd signs from the Moon; Dhaiya is its stay in the 4th or 8th. Classically these are seasons of responsibility, maturity and restructuring, not misfortune. When one partner is in such a phase, the other\'s steadiness matters most.\\par}\\end{asCard}',
    evidenceIds: [...a.ids, ...b.ids],
    method: 'Saturn sign periods from the transit ingress solver (Lahiri), 12 years from the report date; (R) = retrograde re-entry. Houses counted from each natal Moon.',
  };
};

export const coupleNodes: BlockRenderer = (ctx) => {
  const { native, partner } = both(ctx);
  const row = (s: ChartSnapshot) => {
    const ax = nodalAxis(s);
    return [`\\TCell{\\textbf{${tex(nameOf(s))}}}`, `\\TCell{${ax.oneSide ? 'Yes' : 'No'}}`, `\\TCell{${tex(ax.rahuSide.join(', ') || '--')}}`, `\\TCell{${tex(ax.ketuSide.join(', ') || '--')}}`];
  };
  return {
    tex: tableTex('l c X X', ['', 'All seven on one side', 'Rahu-to-Ketu side', 'Ketu-to-Rahu side'], [row(native), row(partner)]) +
      '\n\\begin{asCard}{\\fontsize{9.5}{13}\\selectfont Some later traditions name the case where all seven planets sit on one side of the Rahu-Ketu axis "Kaal Sarp". It is not found in Brihat Parashara Hora Shastra, and Astro Sushil does not treat it as a dosha. We show the distribution as a plain geometric fact: the nodes describe where each of you seeks growth (Rahu) and what comes naturally (Ketu).\\par}\\end{asCard}',
    evidenceIds: ['match.nodes.native', 'match.nodes.partner', 'planet.rahu.d1.house', 'partner.planet.rahu.d1.house'],
    method: 'Longitude of each of the seven planets measured from mean Rahu: 0 to 180 degrees = Rahu-to-Ketu side; 180 to 360 = Ketu-to-Rahu side.',
  };
};

export const coupleJointTransits: BlockRenderer = (ctx) => {
  const { native, partner } = both(ctx);
  const ids: string[] = [];
  let ji = 0;
  const rows = jointTransits(native, partner).map((t) => {
    if (t.planet === 'JUPITER') ids.push(`match.jupiter.${two(++ji)}`);
    ids.push(transitEvidenceId('', t.planet, t.index), transitEvidenceId('partner.', t.planet, t.index));
    const f = (x: { fromMoon: number; favourable: boolean }) => `${ordinal(x.fromMoon)}${x.favourable ? ' *' : ''}`;
    return [`\\TCell{${t.planet === 'JUPITER' ? 'Jupiter' : 'Saturn'}}`, `\\TCell{${tex(t.period.sign)}${t.period.enteredRetrograde ? ' (R)' : ''}}`,
      `\\TCell{${formatDate(t.period.startIso)} -- ${formatDate(t.period.endIso)}}`, `\\TCell{${f(t.native)}}`, `\\TCell{${f(t.partner)}}`];
  });
  return {
    tex: tableTex('l l X c c', ['Planet', 'Sign', 'Period', `From ${tex(nameOf(native))}'s Moon`, `From ${tex(nameOf(partner))}'s Moon`], rows, { font: '\\fontsize{8}{10}\\selectfont' }),
    evidenceIds: [...new Set(ids)],
    method: `Jupiter and Saturn sign periods for 12 years (transit ingress solver, Lahiri). * = classically favourable gochara from that Moon (Phaladeepika ch. 26: Jupiter ${GOCHARA_FAVOURABLE_FROM_MOON.JUPITER.join('/')}; Saturn ${GOCHARA_FAVOURABLE_FROM_MOON.SATURN.join('/')}). Vedha not applied; no percentage scores.`,
  };
};

export const coupleFunctional: BlockRenderer = (ctx) => {
  const { native, partner } = both(ctx);
  const fa = classifyFunctionalNature(native.natal.ascendant.rashiIndex);
  const fb = classifyFunctionalNature(partner.natal.ascendant.rashiIndex);
  const rows = PLANETS.map((p, i) => [`\\TCell{\\textbf{${p}}}`, `\\TCell{${tex(NATURE_LABEL[fa[i].nature])}}`, `\\TCell{${tex(NATURE_LABEL[fb[i].nature])}}`]);
  return {
    tex: tableTex('l X X', ['Planet', `${tex(nameOf(native))} (${tex(native.natal.ascendant.sign)} Lagna)`, `${tex(nameOf(partner))} (${tex(partner.natal.ascendant.sign)} Lagna)`], rows),
    evidenceIds: ['match.functional.native', 'match.functional.partner', 'asc.d1.sign', 'partner.asc.d1.sign'],
    method: FUNCTIONAL_METHOD + ' Shown instead of gemstone recommendations: nothing to buy.',
  };
};

export const coupleNumerology: BlockRenderer = (ctx) => {
  const { native, partner } = both(ctx);
  const r = ctx.registry;
  const rows = [
    ['\\TCell{\\textbf{Mulank (day number)}}', `\\TCell{${r.get('numerology.mulank')!.value}}`, `\\TCell{${r.get('partner.numerology.mulank')!.value}}`],
    ['\\TCell{\\textbf{Bhagyank (destiny number)}}', `\\TCell{${r.get('numerology.bhagyank')!.value}}`, `\\TCell{${r.get('partner.numerology.bhagyank')!.value}}`],
  ];
  return {
    tex: tableTex('l X X', ['Number', tex(nameOf(native)), tex(nameOf(partner))], rows),
    evidenceIds: ['numerology.mulank', 'numerology.bhagyank', 'partner.numerology.mulank', 'partner.numerology.bhagyank'],
    method: 'Mulank = digit sum of the birth day; Bhagyank = digit sum of the full date of birth (decision D-002). Ruling planets: 1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars.',
  };
};

export const COUPLE_BLOCKS: Record<string, BlockRenderer> = {
  'couple-significance': coupleSignificance,
  'couple-birth-details': coupleBirthDetails,
  'couple-koota-table': coupleKootaTable,
  'couple-verdict': coupleVerdict,
  'couple-manglik': coupleManglik,
  'couple-planets-native': couplePlanets('native'),
  'couple-planets-partner': couplePlanets('partner'),
  'couple-charts-d1': coupleCharts([['D1', 'birth chart (D1)']]),
  'couple-charts-moon-sun': coupleCharts([['MOON', 'Moon chart'], ['SUN', 'Sun chart']]),
  'couple-charts-d9': coupleCharts([['D9', 'Navamsa (D9)']]),
  'couple-vargas-a': coupleVargasA,
  'couple-vargas-b': coupleVargasB,
  'couple-vargas-c': coupleVargasC,
  'couple-friendship': coupleFriendship,
  'couple-ashtakavarga-native': coupleAshtakavarga('native'),
  'couple-ashtakavarga-partner': coupleAshtakavarga('partner'),
  'couple-dasha-md': coupleDashaMd,
  'couple-pratyantar': couplePratyantar,
  'couple-overlap': coupleOverlap,
  'couple-saturn': coupleSaturn,
  'couple-nodes': coupleNodes,
  'couple-joint-transits': coupleJointTransits,
  'couple-functional': coupleFunctional,
  'couple-numerology': coupleNumerology,
};
