/**
 * Deterministic LaTeX blocks shared by the planet-transit family.
 * Every block renders only from the snapshot, the evidence registry and the
 * module's `ext` (computed by the TransitIngressSolver), and reports the
 * evidence IDs it shows. All dynamic text passes through `tex()`.
 */
import { AshtakavargaContributor, PlanetSymbol } from '@astro/astrology-engine';
import { ordinal, planetName, SIGNS } from '../../evidence/evidence-registry';
import { BlockContext, BlockOutput, BlockRenderer, kvTable, northChart } from '../../render/blocks';
import { formatDate, tex } from '../../render/latex';
import { PlanetReturn } from './calc/lifetime';
import { PlanetKey, PlanetTransitData, PLANET_NAME, StayView, TransitPosition } from './calc/planet-transit';
import { binduReading, retroText, savReading, slugSign, spanText } from './evidence';

export const ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};
export const SIGN_ABBR = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];

export interface PlanetTransitExt {
  pt: Partial<Record<PlanetKey, PlanetTransitData>>;
  positions: TransitPosition[];
  returns: Partial<Record<PlanetKey, PlanetReturn[]>>;
}

export function ptExt(ctx: BlockContext): PlanetTransitExt {
  const e = ctx.ext as unknown as PlanetTransitExt;
  if (!e?.pt || !e.positions) throw new Error('BLOCK_DATA_MISSING: planet-transit ext');
  return e;
}
export function ptData(ctx: BlockContext, key: PlanetKey): PlanetTransitData {
  const d = ptExt(ctx).pt[key];
  if (!d) throw new Error(`BLOCK_DATA_MISSING: ${key}`);
  return d;
}

// ---------------------------------------------------------------- helpers --

export const rowTex = (cells: string[], i: number): string =>
  `${i % 2 ? '\\rowcolor{Surface}' : ''}${cells.map((c) => `\\TCell{${c}}`).join(' & ')}\\\\`;

export function tableTex(colspec: string, headers: string[], rows: string[][], width = '\\linewidth'): string {
  return [
    `\\begin{center}\\begin{tabularx}{${width}}{${colspec}}`,
    `\\TableHead${headers.map((h) => `\\THd{${h}}`).join(' & ')}\\\\`,
    ...rows.map(rowTex),
    '\\bottomrule\\end{tabularx}\\end{center}',
  ].join('\n');
}

export const para = (text: string, size = '10'): string => `{\\fontsize{${size}}{${Number(size) * 1.45}}\\selectfont ${tex(text)}\\par}`;
export const card = (title: string, body: string, env: 'asCard' | 'asHighlight' | 'asCaution' = 'asCard'): string =>
  `\\begin{${env}}\\CardTitle{${tex(title)}}{\\fontsize{9.4}{13.4}\\selectfont ${body}\\par}\\end{${env}}`;
export const bullets = (items: string[]): string =>
  `\\begin{gemlist}\n${items.map((b) => `  \\item ${b}`).join('\n')}\n\\end{gemlist}`;
/** Bold lead + text bullet, both escaped. */
export const lb = (lead: string, text: string): string => `\\textbf{${tex(lead)}} ${tex(text)}`;

const moonOf = (ctx: BlockContext) => ctx.snapshot.natal.planets.find((p) => p.name === PlanetSymbol.MOON)!;

// ---------------------------------------------------------------- charts --

export function moonChart(ctx: BlockContext): BlockOutput {
  const { natal } = ctx.snapshot;
  const moon = moonOf(ctx);
  const houses = Array.from({ length: 12 }, (_, i) => {
    const sign = ((moon.rashiIndex - 1 + i) % 12) + 1;
    const lines = natal.planets.filter((p) => p.rashiIndex === sign).map((p) => ABBR[planetName(p.name)]);
    if (natal.ascendant.rashiIndex === sign) lines.unshift('Asc');
    return { sign, lines };
  });
  return {
    tex: `\\begin{center}${northChart(houses)}\\end{center}`,
    evidenceIds: ['planet.moon.d1.sign', ...natal.planets.map((p) => `planet.${planetName(p.name).toLowerCase()}.d1.sign`)],
    method: 'Chandra Lagna chart: the natal Moon sign is placed in the top diamond as the 1st house, so every house is counted from the Moon. Transits from the Moon (Sade Sati, Kantaka, Dhaiya) are read on this chart.',
  };
}

export function transitChart(highlight: PlanetKey[]): BlockRenderer {
  return (ctx) => {
    const { natal } = ctx.snapshot;
    const pos = ptExt(ctx).positions;
    const asc = natal.ascendant.rashiIndex;
    const houses = Array.from({ length: 12 }, (_, i) => {
      const sign = ((asc - 1 + i) % 12) + 1;
      const lines = pos
        .filter((p) => p.signIndex === sign)
        .map((p) => `${ABBR[p.planet]} ${Math.floor(p.degree)}°${p.retrograde && p.planet !== 'Rahu' && p.planet !== 'Ketu' ? ' R' : ''}`);
      return { sign, lines };
    });
    houses[0].lines.unshift('Asc');
    const hl = highlight.map((k) => pos.find((p) => p.planet === PLANET_NAME[k])!);
    const caption = hl
      .map((p) => `Transiting ${p.planet} is in ${p.sign} at ${p.degree.toFixed(1)}°, the ${ordinal(p.houseFromLagna)} house from your Ascendant and the ${ordinal(((p.signIndex - moonOf(ctx).rashiIndex + 12) % 12) + 1)} from your Moon.`)
      .join(' ');
    return {
      tex: `\\begin{center}${northChart(houses)}\\end{center}\n${para(caption, '9.6')}`,
      evidenceIds: ['asc.d1.sign', ...pos.map((p) => `transit-now.${p.planet.toLowerCase()}.sign`)],
      method: `Positions of the nine grahas on the report date (${formatDate(ctx.snapshot.asOfIso)}, 00:00 UTC), placed in the houses of your natal Ascendant. R = retrograde (the nodes always move backwards and are not marked).`,
    };
  };
}

// ------------------------------------------------------------- summaries --

export function placementRows(ctx: BlockContext, key: PlanetKey): Array<[string, string]> {
  const r = ctx.registry;
  const N = PLANET_NAME[key];
  const p = ctx.snapshot.natal.planets.find((x) => planetName(x.name) === N)!;
  const d = ptData(ctx, key);
  const dignity = String(r.get(`planet.${key}.d1.dignity`)!.value).toLowerCase().replace(/_/g, ' ');
  return [
    [`${N}: sign and house`, `${p.sign}, ${ordinal(p.house)} house (${p.degree.toFixed(2)}°)`],
    [`${N}: nakshatra`, `${p.nakshatra}, pada ${p.pada} (lord ${planetName(p.nakshatraLord)})`],
    [`${N}: dignity and motion`, `${dignity}; ${key === 'rahu' || key === 'ketu' ? 'always retrograde (node)' : p.retrograde ? 'retrograde' : 'direct'}`],
    [`${N}: from the Moon`, `${ordinal(d.natal.houseFromMoon)} from the Moon sign`],
    [`${N}: transit now`, `${d.a.status === 'upcoming' ? 'next: ' : ''}${d.a.sign} (${ordinal(d.a.houseFromLagna)} from Ascendant, ${ordinal(d.a.houseFromMoon)} from Moon)`],
  ];
}

export function summaryBlock(keys: PlanetKey[], extra?: (ctx: BlockContext) => { rows: Array<[string, string]>; ids: string[] }): BlockRenderer {
  return (ctx) => {
    const r = ctx.registry;
    const s = ctx.snapshot.subject;
    const moon = moonOf(ctx);
    const rows: Array<[string, string]> = [
      ['Name', s.name],
      ['Birth details', `${formatDate(s.dateOfBirth)}${s.timeOfBirth ? `, ${s.timeOfBirth}` : ''}, ${s.placeName}`],
      ['Ascendant (Lagna)', `${r.get('asc.d1.sign')!.value} (${r.get('asc.d1.nakshatra')!.value} nakshatra)`],
      ['Moon sign and nakshatra', `${moon.sign}, ${moon.nakshatra} pada ${moon.pada}; ${ordinal(moon.house)} house`],
      ...keys.flatMap((k) => placementRows(ctx, k)),
    ];
    const ids = ['asc.d1.sign', 'asc.d1.nakshatra', 'planet.moon.d1.sign', 'planet.moon.d1.nakshatra', 'planet.moon.d1.house',
      ...keys.flatMap((k) => [`planet.${k}.d1.sign`, `planet.${k}.d1.house`, `planet.${k}.d1.nakshatra`, `planet.${k}.d1.dignity`, `${k}.natal.house-from-moon`, `${k}.transit.a.sign`])];
    if (extra) {
      const x = extra(ctx);
      rows.push(...x.rows);
      ids.push(...x.ids);
    }
    return { tex: kvTable(rows), evidenceIds: ids, method: 'Sidereal zodiac, Lahiri ayanamsa, whole-sign houses, mean nodes (provisional conventions recorded in the report manifest).' };
  };
}

export function natalAspectsBlock(key: PlanetKey): BlockRenderer {
  return (ctx) => {
    const d = ptData(ctx, key);
    const N = d.name;
    const rows = d.natal.aspects.map((a) => [
      tex(ordinal(a.nth)), tex(a.sign), tex(ordinal(a.houseFromLagna)), tex(ordinal(a.houseFromMoon)), tex(a.natalPlanets.join(', ') || '—'),
    ]);
    const conj = ctx.registry.get(`planet.${key}.d1.conjunctions`)!.value as string[];
    const recv = ctx.registry.get(`planet.${key}.d1.aspected-by`)!.value as string[];
    return {
      tex: [
        tableTex('p{0.13\\linewidth}p{0.2\\linewidth}p{0.17\\linewidth}p{0.17\\linewidth}X', ['Aspect', 'Sign aspected', 'From Lagna', 'From Moon', 'Natal planets there'], rows),
        card('Company and glances', `${lb('Sharing the house:', conj.length ? conj.join(', ') : `none, ${N} stands alone`)}\\newline ${lb(`Planets aspecting ${N}:`, recv.length ? recv.join(', ') : 'none')}`),
      ].join('\n'),
      evidenceIds: [`${key}.natal.aspects`, `${key}.natal.aspected-planets`, `planet.${key}.d1.conjunctions`, `planet.${key}.d1.aspected-by`],
      method: `Graha drishti by whole sign, counted inclusively from ${N}'s sign (BPHS ch. 26): every graha aspects the 7th; Saturn also the 3rd and 10th; Jupiter the 5th and 9th; the nodes the 5th and 9th (engine convention, Phaladeepika tradition).`,
    };
  };
}

export function lordshipBlock(key: PlanetKey): BlockRenderer {
  return (ctx) => {
    const d = ptData(ctx, key);
    const N = d.name;
    const NAMES: Record<string, string> = {
      kendra: 'kendra (angle: action, stability)', trikona: 'trikona (trine: fortune, dharma)', dusthana: 'dusthana (6/8/12: effort, transformation, release)',
      upachaya: 'upachaya (3/6/10/11: grows stronger with time)', dhana: 'dhana (2/11: resources and gains)',
    };
    const rows = d.natal.lordshipTypes.map((t) => {
      const [h, cats] = t.split(':');
      const sign = SIGNS[((ctx.snapshot.natal.ascendant.rashiIndex - 1 + Number(h) - 1) % 12)];
      return [tex(`${ordinal(Number(h))} house`), tex(sign), tex(cats.split('+').map((c) => NAMES[c] ?? c).join('; '))];
    });
    return {
      tex: [
        tableTex('p{0.18\\linewidth}p{0.2\\linewidth}X', ['House ruled', 'Sign', 'Classical category'], rows),
        card(`Is ${N} a yogakaraka for you?`, tex(d.natal.yogakaraka
          ? `Yes. ${N} rules both a kendra and a trikona from your Ascendant. Classical texts (BPHS ch. 34) call such a planet a yogakaraka, a planet whose periods and transits tend to work for the native's growth.`
          : `No. ${N} does not rule both a kendra (4th, 7th or 10th) and a trikona (5th or 9th) from your Ascendant, so the classical yogakaraka condition is not met. Its results follow the houses it rules, listed above.`), d.natal.yogakaraka ? 'asHighlight' : 'asCard'),
      ].join('\n'),
      evidenceIds: [`${key}.natal.lordship-type`, `${key}.natal.yogakaraka`, `planet.${key}.d1.lordship`],
      method: 'Functional nature from house lordship counted from the Ascendant (whole signs). Categories are the standard Parashari groupings; no score is computed.',
    };
  };
}

// ---------------------------------------------------------- ashtakavarga --

const CONTRIB: Array<[AshtakavargaContributor, string]> = [
  [AshtakavargaContributor.SUN, 'Sun'], [AshtakavargaContributor.MOON, 'Moon'], [AshtakavargaContributor.MARS, 'Mars'],
  [AshtakavargaContributor.MERCURY, 'Mercury'], [AshtakavargaContributor.JUPITER, 'Jupiter'], [AshtakavargaContributor.VENUS, 'Venus'],
  [AshtakavargaContributor.SATURN, 'Saturn'], [AshtakavargaContributor.LAGNA, 'Ascendant'],
];

function signHeader(ctx: BlockContext, mark: number[]): { head: string[]; houseRow: string[] } {
  const asc = ctx.snapshot.natal.ascendant.rashiIndex;
  const head = ['', ...SIGN_ABBR.map((s, i) => (mark.includes(i + 1) ? `${s}*` : s))];
  const houseRow = ['\\textcolor{Muted}{House}', ...SIGN_ABBR.map((_, i) => `\\textcolor{Muted}{${((i + 1 - asc + 12) % 12) + 1}}`)];
  return { head, houseRow };
}

export function bavPrastaraBlock(key: 'saturn' | 'jupiter'): BlockRenderer {
  return (ctx) => {
    const d = ptData(ctx, key);
    const sym = key.toUpperCase() as 'SATURN' | 'JUPITER';
    const bav = ctx.snapshot.ashtakavarga.bav[sym as keyof typeof ctx.snapshot.ashtakavarga.bav];
    const mark = [d.a.signIndex, d.b.signIndex];
    const { head, houseRow } = signHeader(ctx, mark);
    const cell = (v: number, sign: number) => `${mark.includes(sign) ? '\\cellcolor{Tint}' : ''}${v ? '\\textbf{1}' : '\\textcolor{Muted}{·}'}`;
    const rows = [
      houseRow,
      ...CONTRIB.map(([c, label]) => [tex(label), ...bav.prastara[c].map((v, i) => cell(v, i + 1))]),
      ['\\textbf{Total}', ...bav.signList.map((v, i) => `${mark.includes(i + 1) ? '\\cellcolor{Tint}' : ''}\\textbf{${v}}`)],
    ];
    return {
      tex: tableTex('>{\\raggedright\\arraybackslash}p{17mm}*{12}{>{\\centering\\arraybackslash}X}', head, rows),
      evidenceIds: [...SIGNS.map((s) => `${key}.bav.sign.${slugSign(s)}`), `${key}.bav.total`],
      method: `Bhinnashtakavarga of ${d.name} (BPHS ch. 66): each of the eight contributors (seven grahas and the Ascendant) gives one bindu (1) to the signs classically benefic from its own position. Columns are signs (Ar = Aries … Pi = Pisces); the grey row gives the house from your Ascendant. * and shading mark the two transit signs detailed in this report. Total ${bav.totalPoints} bindus (the classical total is 39 for Saturn and 56 for Jupiter).`,
    };
  };
}

export function savMatrixBlock(markKeys: PlanetKey[]): BlockRenderer {
  return (ctx) => {
    const sav = ctx.snapshot.ashtakavarga.sav;
    const ext = ptExt(ctx);
    const mark = markKeys.flatMap((k) => (ext.pt[k] ? [ext.pt[k]!.a.signIndex, ext.pt[k]!.b.signIndex] : []));
    const { head, houseRow } = signHeader(ctx, mark);
    const order: Array<[keyof typeof sav.byPlanet, string]> = [
      ['SUN' as keyof typeof sav.byPlanet, 'Sun'], ['MOON' as keyof typeof sav.byPlanet, 'Moon'], ['MARS' as keyof typeof sav.byPlanet, 'Mars'],
      ['MERCURY' as keyof typeof sav.byPlanet, 'Mercury'], ['JUPITER' as keyof typeof sav.byPlanet, 'Jupiter'], ['VENUS' as keyof typeof sav.byPlanet, 'Venus'],
      ['SATURN' as keyof typeof sav.byPlanet, 'Saturn'],
    ];
    const c = (v: number | string, sign: number, bold = false) => `${mark.includes(sign) ? '\\cellcolor{Tint}' : ''}${bold ? `\\textbf{${v}}` : v}`;
    const rows = [
      houseRow,
      ...order.map(([k, label]) => [tex(label), ...sav.byPlanet[k].map((v, i) => c(v, i + 1))]),
      ['\\textbf{SAV}', ...sav.signList.map((v, i) => c(v, i + 1, true))],
    ];
    const asc = ctx.snapshot.natal.ascendant.rashiIndex;
    return {
      tex: tableTex('>{\\raggedright\\arraybackslash}p{17mm}*{12}{>{\\centering\\arraybackslash}X}', head, rows),
      evidenceIds: Array.from({ length: 12 }, (_, i) => `sav.house.${((i + 1 - asc + 12) % 12) + 1}`),
      method: `Sarvashtakavarga: the sum of the seven Bhinnashtakavargas per sign (grand total ${sav.grandTotal}; 337 is the classical constant, so 28 per sign is the average). * and shading mark the transit signs detailed in this report.`,
    };
  };
}

const BINDU_GUIDE: Array<[string, string]> = [
  ['0–1', 'Very little support from the planet\'s own scheme in this sign. Classical texts advise keeping commitments light, finishing old work and leaning on routine and rest.'],
  ['2–3', 'Below the classical threshold of four. The transit tends to ask for patience, careful planning and steady effort before results show.'],
  ['4', 'The classical midpoint. Results are mixed and depend strongly on the houses involved and on the planet\'s other contacts.'],
  ['5–6', 'Above the threshold. The transit tends to support the matters of the house it passes through; efforts begun now usually find traction.'],
  ['7–8', 'Strong support. Classical texts treat such a sign as one of the best places in the chart for this planet\'s transit.'],
];

export function binduGuideBlock(): BlockOutput {
  return {
    tex: [
      tableTex('p{0.14\\linewidth}X', ['Bindus', 'Classical reading of a transit through that sign'], BINDU_GUIDE.map(([b, t]) => [tex(b), tex(t)])),
      card('How to read your own table in four steps', bullets([
        tex('Find the sign the planet is transiting (the shaded column).'),
        tex('Read the planet\'s own total (Bhinnashtakavarga) for that sign: four is the classical dividing line.'),
        tex('Read the Sarvashtakavarga total for the same sign: 28 is the average; higher means the life area is broadly well supported.'),
        tex('Count the house that sign occupies from your Ascendant and from your Moon to see which areas of life the transit touches.'),
      ])),
    ].join('\n'),
    evidenceIds: [],
    method: 'Classical thresholds (BPHS Ashtakavarga chapters; Phaladeepika ch. 23): four bindus is the midpoint for a planet\'s own scheme, 28 is the Sarvashtakavarga average. Explanatory text, identical for every reader.',
  };
}

export function transitBinduBlock(key: 'saturn' | 'jupiter'): BlockRenderer {
  return (ctx) => {
    const d = ptData(ctx, key);
    const rows = d.overview.map((o) => [
      tex(o.sign), tex(formatDate(o.firstStartIso)), tex(ordinal(o.houseFromLagna)), tex(ordinal(o.houseFromMoon)), `\\textbf{${o.bav}}`, `${o.sav}`,
      tex((o.bav ?? 0) >= 5 ? 'supportive' : o.bav === 4 ? 'balanced' : 'patience and effort'),
    ]);
    return {
      tex: tableTex('p{0.13\\linewidth}p{0.15\\linewidth}p{0.1\\linewidth}p{0.1\\linewidth}p{0.08\\linewidth}p{0.08\\linewidth}X',
        ['Transit sign', 'From', 'Lagna', 'Moon', 'BAV', 'SAV', 'Classical reading'], rows),
      evidenceIds: [`${key}.transit.horizon`, ...SIGNS.map((s) => `${key}.bav.sign.${slugSign(s)}`)],
      method: `For each ${d.name} transit sign in the next ${d.horizonYears} years: ${d.name}'s own bindus (BAV) and the sign's Sarvashtakavarga (SAV). Reading: BAV 5 or more supportive, 4 balanced, below 4 asks for patience (decision PT-006). Not a score.`,
    };
  };
}

export function savNodesBlock(ctx: BlockContext): BlockOutput {
  const ra = ptData(ctx, 'rahu');
  const ke = ptData(ctx, 'ketu');
  const rows = [ra.a, ra.b, ke.a, ke.b].map((s, i) => [
    tex(i < 2 ? 'Rahu' : 'Ketu'), tex(s.sign), tex(ordinal(s.houseFromLagna)), tex(ordinal(s.houseFromMoon)), `\\textbf{${s.sav}}`, tex(savReading(s.sav)),
  ]);
  return {
    tex: tableTex('p{0.1\\linewidth}p{0.15\\linewidth}p{0.12\\linewidth}p{0.12\\linewidth}p{0.08\\linewidth}X', ['Node', 'Transit sign', 'From Lagna', 'From Moon', 'SAV', 'Compared with the average'], rows),
    evidenceIds: ['rahu.transit.a.sav', 'rahu.transit.b.sav', 'ketu.transit.a.sav', 'ketu.transit.b.sav'],
    method: 'Rahu and Ketu have no Bhinnashtakavarga of their own in the classical scheme (BPHS uses the seven grahas and the Ascendant only), so only the Sarvashtakavarga of the signs they transit is shown (decision PT-008).',
  };
}

// ------------------------------------------------------------ transits --

export function stayBlock(key: PlanetKey, slot: 'a' | 'b'): BlockRenderer {
  return (ctx) => {
    const d = ptData(ctx, key);
    const st: StayView = d[slot];
    const N = d.name;
    const status = st.status === 'in-progress' ? 'In progress on the report date' : st.status === 'paused' ? 'Begun; the planet is briefly in a neighbouring sign on the report date and will return' : 'Upcoming';
    const kv: Array<[string, string]> = [
      ['Transit sign', `${N} in ${st.sign}`],
      ['Status', status],
      ['Dates in this sign', st.spans.map(spanText).join('; ')],
      ['House from your Ascendant', ordinal(st.houseFromLagna)],
      ['House from your Moon', ordinal(st.houseFromMoon)],
      ['Over natal planets', st.conjunctNatal.length ? st.conjunctNatal.join(', ') : 'none (the sign is empty in your birth chart)'],
    ];
    if (key === 'saturn' || key === 'jupiter') {
      kv.push(['Retrograde windows', st.retroWindows.length ? st.retroWindows.map(retroText).join('; ') : 'none during this sign period']);
      kv.push([`Ashtakavarga support`, `${N}'s own bindus ${st.bav} (${binduReading(st.bav!)}); SAV ${st.sav} (${savReading(st.sav)})`]);
    } else {
      kv.push(['Sarvashtakavarga of the sign', `${st.sav} (${savReading(st.sav)})`]);
    }
    const asp = st.aspects.map((a) => [tex(ordinal(a.nth)), tex(a.sign), tex(ordinal(a.houseFromLagna)), tex(ordinal(a.houseFromMoon)), tex(a.natalPlanets.join(', ') || '—')]);
    const ids = [`${key}.transit.${slot}.sign`, `${key}.transit.${slot}.dates`, `${key}.transit.${slot}.status`, `${key}.transit.${slot}.house-asc`,
      `${key}.transit.${slot}.house-moon`, `${key}.transit.${slot}.conjunct`, `${key}.transit.${slot}.aspects`, `${key}.transit.${slot}.aspected-natal`, `${key}.transit.${slot}.sav`];
    if (key === 'saturn' || key === 'jupiter') ids.push(`${key}.transit.${slot}.retro`, `${key}.transit.${slot}.bav`);
    return {
      tex: [
        kvTable(kv),
        `{\\sffamily\\fontsize{8.5}{10.5}\\selectfont\\bfseries\\color{Primary}TRANSITING ${tex(N.toUpperCase())}'S ASPECTS FROM ${tex(st.sign.toUpperCase())}\\par}`,
        tableTex('p{0.13\\linewidth}p{0.2\\linewidth}p{0.17\\linewidth}p{0.17\\linewidth}X', ['Aspect', 'Sign', 'From Lagna', 'From Moon', 'Natal planets aspected'], asp),
      ].join('\n'),
      evidenceIds: ids,
      method: `Sign ingresses and retrograde stations solved with the TransitIngressSolver (sidereal, Lahiri). A sign period groups the main stay with any retrograde re-entry; each continuous span is listed. Aspects by whole sign as for the natal chart.`,
    };
  };
}

export function overviewBlock(key: PlanetKey): BlockRenderer {
  return (ctx) => {
    const d = ptData(ctx, key);
    const showBav = key === 'saturn' || key === 'jupiter';
    const rows = d.overview.map((o) => {
      const cells = [
        tex(o.sign) + (o.isReturn ? '\\textsuperscript{\\textcolor{Accent}{\\,R}}' : ''),
        o.spans.map((s) => tex(spanText(s))).join('\\newline '),
        tex(ordinal(o.houseFromLagna)), tex(ordinal(o.houseFromMoon)),
      ];
      if (showBav) cells.push(`${o.bav}`);
      cells.push(`${o.sav}`);
      return cells;
    });
    const spec = showBav
      ? 'p{0.14\\linewidth}>{\\raggedright\\arraybackslash}X p{0.08\\linewidth}p{0.08\\linewidth}p{0.06\\linewidth}p{0.06\\linewidth}'
      : 'p{0.14\\linewidth}>{\\raggedright\\arraybackslash}X p{0.1\\linewidth}p{0.1\\linewidth}p{0.07\\linewidth}';
    const head = showBav ? ['Sign', 'Dates', 'Lagna', 'Moon', 'BAV', 'SAV'] : ['Sign', 'Dates', 'Lagna', 'Moon', 'SAV'];
    return {
      tex: tableTex(spec, head, rows),
      evidenceIds: [`${key}.transit.horizon`],
      method: `Every ${d.name} sign period from the report date for ${d.horizonYears} years, solved with the TransitIngressSolver. Lagna/Moon = house counted from your Ascendant / Moon sign. R marks a return to the natal sign.`,
    };
  };
}

export function returnsBlock(key: PlanetKey): BlockRenderer {
  return (ctx) => {
    const ret = ptExt(ctx).returns[key];
    if (!ret) throw new Error(`BLOCK_DATA_MISSING: returns.${key}`);
    const N = PLANET_NAME[key];
    const rows = ret.map((r) => [`${r.n}`, tex(r.sign), r.stay.spans.map((s) => tex(spanText(s))).join('\\newline '), `${r.age}`]);
    return {
      tex: rows.length
        ? tableTex('p{0.07\\linewidth}p{0.15\\linewidth}>{\\raggedright\\arraybackslash}X p{0.1\\linewidth}', ['No.', 'Natal sign', 'Transit dates', 'Age'], rows)
        : para(`${N} does not complete a return to its natal sign within the calculated lifetime window.`),
      evidenceIds: [`${key}.returns`],
      method: `Each time transiting ${N} re-enters the sign it occupied at birth, from birth to age 90, solved from ingresses.`,
    };
  };
}

// ------------------------------------------------------- static content --

export interface StaticContent {
  paragraphs: string[];
  /** Devanagari verse, its transliteration and an original English rendering. */
  verse?: { devanagari: string[]; transliteration: string; meaning: string; source: string };
  bullets?: Array<[string, string]>;
  note?: string;
}

/** Static educational text, identical for every reader (no chart evidence). */
export function staticBlock(c: StaticContent): BlockRenderer {
  return () => {
    const parts: string[] = c.paragraphs.map((p) => para(p, '10.2'));
    if (c.verse) {
      parts.push(`\\begin{asHighlight}\\begin{center}{\\fontsize{12}{19}\\selectfont\\color{Primary}${c.verse.devanagari.map((l) => tex(l)).join('\\\\')}\\par}\\vspace{1.5mm}{\\fontsize{9}{12.5}\\selectfont\\itshape ${tex(c.verse.transliteration)}\\par}\\vspace{1.2mm}{\\fontsize{9.4}{13}\\selectfont ${tex(c.verse.meaning)}\\par}\\vspace{0.8mm}{\\sffamily\\fontsize{7}{9}\\selectfont\\color{Muted}${tex(c.verse.source)}\\par}\\end{center}\\end{asHighlight}`);
    }
    if (c.bullets?.length) parts.push(bullets(c.bullets.map(([l, t]) => lb(l, t))));
    if (c.note) parts.push(card('Please note', tex(c.note), 'asCaution'));
    return { tex: parts.join('\n'), evidenceIds: [], method: 'Educational text written by Astro Sushil, identical for every reader.' };
  };
}

export const REMEDY_PRINCIPLES: StaticContent = {
  paragraphs: [
    'In the Astro Sushil approach a remedy is a change in how you live, not an object you acquire. The classical texts themselves place conduct, discipline, service and devotion above every material measure, and these cost nothing.',
    'Choose two or three practices that feel natural, keep them for at least forty days, and notice how your responses to the planet\'s themes change. Consistency matters far more than intensity.',
  ],
  note: 'Nothing in this section requires a purchase. We do not prescribe gemstones, paid rituals or talismans. If you have a medical, psychological, legal or financial concern, please consult a qualified professional; these practices complement, and never replace, such advice.',
};
