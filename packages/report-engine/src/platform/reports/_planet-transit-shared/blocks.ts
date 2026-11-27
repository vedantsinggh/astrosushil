/**
 * Deterministic LaTeX blocks shared by the planet-transit family.
 * Every block renders only from the snapshot, the evidence registry and the
 * module's `ext` (computed by the TransitIngressSolver), and reports the
 * evidence IDs it shows. All dynamic text passes through `tex()`.
 */
import { AshtakavargaContributor, PlanetSymbol } from '@astro/astrology-engine';
import { ordinal, planetName, SIGNS } from '../../evidence/evidence-registry';
import { dignityLabel, label, nakshatraLabel, pick, planetAbbr, planetLabel, ReportLanguage, signLabel } from '../../i18n/hindi';
import { BlockContext, BlockOutput, BlockRenderer, blockLang, kvTable, longTableTex, northChart, timelineTex } from '../../render/blocks';
import { formatDate, tex } from '../../render/latex';
import { PlanetReturn } from './calc/lifetime';
import { PlanetKey, PlanetTransitData, PLANET_NAME, StayView, TransitPosition } from './calc/planet-transit';
import { slugSign } from './evidence';
import { binduReadingL, dateL, houseL, ord, pickLazy, planetsL, retroL, savReadingL, SIGN_ABBR_HI, spanL, tl } from './planet-transit.hindi';

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
  if (rows.length >= 8 && width === '\\linewidth') {
    return longTableTex(
      colspec,
      headers.map((h) => `\\THd{${h}}`),
      rows.map((r) => r.map((c) => `\\TCell{${c}}`)),
      { raw: true }
    );
  }
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

/** A table heading in the report language (English headings are printed as written). */
export const hd = (lang: ReportLanguage, en: string): string => (lang === 'en' ? en : tex(tl(lang, en)));

/** Key/value table with its two headings in the report language (English is the core `kvTable`, unchanged). */
export function kvTableL(lang: ReportLanguage, rows: Array<[string, string]>): string {
  if (lang === 'en') return kvTable(rows);
  return [
    '\\begin{center}\\begin{tabularx}{0.86\\linewidth}{>{\\raggedright\\arraybackslash}p{0.38\\linewidth}X}',
    `\\TableHead\\THd{${hd(lang, 'Factor')}} & \\THd{${hd(lang, 'Your chart')}}\\\\`,
    ...rows.map(([k, v], i) => `${i % 2 ? '\\rowcolor{Surface}' : ''}\\TCell{\\textbf{${tex(k)}}} & \\TCell{${tex(v)}}\\\\`),
    '\\bottomrule\\end{tabularx}\\end{center}',
  ].join('\n');
}

/** Chart abbreviation of a planet in the report language. */
const abbrL = (lang: ReportLanguage, planet: string): string => (lang === 'hi' ? planetAbbr(lang, planet) : ABBR[planet]);

const moonOf = (ctx: BlockContext) => ctx.snapshot.natal.planets.find((p) => p.name === PlanetSymbol.MOON)!;

// ---------------------------------------------------------------- charts --

export function moonChart(ctx: BlockContext): BlockOutput {
  const { natal } = ctx.snapshot;
  const moon = moonOf(ctx);
  const lang = blockLang(ctx);
  const houses = Array.from({ length: 12 }, (_, i) => {
    const sign = ((moon.rashiIndex - 1 + i) % 12) + 1;
    const lines = natal.planets.filter((p) => p.rashiIndex === sign).map((p) => abbrL(lang, planetName(p.name)));
    if (natal.ascendant.rashiIndex === sign) lines.unshift(label(lang, 'Asc'));
    return { sign, lines };
  });
  return {
    tex: `\\begin{center}${northChart(houses)}\\end{center}`,
    evidenceIds: ['planet.moon.d1.sign', ...natal.planets.map((p) => `planet.${planetName(p.name).toLowerCase()}.d1.sign`)],
    method: tl(lang, 'Chandra Lagna chart: the natal Moon sign is placed in the top diamond as the 1st house, so every house is counted from the Moon. Transits from the Moon (Sade Sati, Kantaka, Dhaiya) are read on this chart.'),
  };
}

export function transitChart(highlight: PlanetKey[]): BlockRenderer {
  return (ctx) => {
    const { natal } = ctx.snapshot;
    const pos = ptExt(ctx).positions;
    const lang = blockLang(ctx);
    const asc = natal.ascendant.rashiIndex;
    const houses = Array.from({ length: 12 }, (_, i) => {
      const sign = ((asc - 1 + i) % 12) + 1;
      const lines = pos
        .filter((p) => p.signIndex === sign)
        .map((p) => `${abbrL(lang, p.planet)} ${Math.floor(p.degree)}°${p.retrograde && p.planet !== 'Rahu' && p.planet !== 'Ketu' ? ` ${label(lang, 'R')}` : ''}`);
      return { sign, lines };
    });
    houses[0].lines.unshift(label(lang, 'Asc'));
    const hl = highlight.map((k) => pos.find((p) => p.planet === PLANET_NAME[k])!);
    const caption = hl
      .map((p) => {
        const fromMoon = ((p.signIndex - moonOf(ctx).rashiIndex + 12) % 12) + 1;
        return pickLazy(lang,
          () => `Transiting ${p.planet} is in ${p.sign} at ${p.degree.toFixed(1)}°, the ${ordinal(p.houseFromLagna)} house from your Ascendant and the ${ordinal(fromMoon)} from your Moon.`,
          () => `गोचर का ${planetLabel('hi', p.planet)} ${signLabel('hi', p.sign)} में ${p.degree.toFixed(1)}° पर है, जो आपके लग्न से ${houseL('hi', p.houseFromLagna)} और आपके चंद्र से ${ord('hi', fromMoon)} है।`);
      })
      .join(' ');
    return {
      tex: `\\begin{center}${northChart(houses)}\\end{center}\n${para(caption, '9.6')}`,
      evidenceIds: ['asc.d1.sign', ...pos.map((p) => `transit-now.${p.planet.toLowerCase()}.sign`)],
      method: pickLazy(lang,
        () => `Positions of the nine grahas on the report date (${formatDate(ctx.snapshot.asOfIso)}, 00:00 UTC), placed in the houses of your natal Ascendant. R = retrograde (the nodes always move backwards and are not marked).`,
        () => `रिपोर्ट की तिथि (${dateL('hi', ctx.snapshot.asOfIso)}, विश्व समय 00:00) पर नौ ग्रहों की स्थिति, आपके जन्म लग्न के भावों में रखी गई। व = वक्री (राहु और केतु सदा उलटे चलते हैं, इसलिए उन पर चिह्न नहीं है)।`),
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
  const lang = blockLang(ctx);
  if (lang === 'hi') {
    const P = planetLabel(lang, N);
    return [
      [`${P}: राशि और भाव`, `${signLabel(lang, p.sign)}, ${houseL(lang, p.house)} (${p.degree.toFixed(2)}°)`],
      [`${P}: नक्षत्र`, `${nakshatraLabel(lang, p.nakshatra)}, चरण ${p.pada} (स्वामी ${planetLabel(lang, planetName(p.nakshatraLord))})`],
      [`${P}: स्थिति और गति`, `${dignityLabel(lang, String(r.get(`planet.${key}.d1.dignity`)!.value))}; ${key === 'rahu' || key === 'ketu' ? 'सदा वक्री (छाया ग्रह)' : p.retrograde ? 'वक्री' : 'मार्गी'}`],
      [`${P}: चंद्र से`, `चंद्र राशि से ${ord(lang, d.natal.houseFromMoon)}`],
      [`${P}: वर्तमान गोचर`, `${d.a.status === 'upcoming' ? 'अगला: ' : ''}${signLabel(lang, d.a.sign)} (लग्न से ${ord(lang, d.a.houseFromLagna)}, चंद्र से ${ord(lang, d.a.houseFromMoon)})`],
    ];
  }
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
    const lang = blockLang(ctx);
    const rows: Array<[string, string]> = [
      [tl(lang, 'Name'), s.name],
      [tl(lang, 'Birth details'), `${dateL(lang, s.dateOfBirth)}${s.timeOfBirth ? `, ${s.timeOfBirth}` : ''}, ${s.placeName}`],
      [tl(lang, 'Ascendant (Lagna)'), pickLazy(lang,
        () => `${r.get('asc.d1.sign')!.value} (${r.get('asc.d1.nakshatra')!.value} nakshatra)`,
        () => `${signLabel('hi', String(r.get('asc.d1.sign')!.value))} (${nakshatraLabel('hi', String(r.get('asc.d1.nakshatra')!.value))} नक्षत्र)`)],
      [tl(lang, 'Moon sign and nakshatra'), pickLazy(lang,
        () => `${moon.sign}, ${moon.nakshatra} pada ${moon.pada}; ${ordinal(moon.house)} house`,
        () => `${signLabel('hi', moon.sign)}, ${nakshatraLabel('hi', moon.nakshatra)} चरण ${moon.pada}; ${houseL('hi', moon.house)}`)],
      ...keys.flatMap((k) => placementRows(ctx, k)),
    ];
    const ids = ['asc.d1.sign', 'asc.d1.nakshatra', 'planet.moon.d1.sign', 'planet.moon.d1.nakshatra', 'planet.moon.d1.house',
      ...keys.flatMap((k) => [`planet.${k}.d1.sign`, `planet.${k}.d1.house`, `planet.${k}.d1.nakshatra`, `planet.${k}.d1.dignity`, `${k}.natal.house-from-moon`, `${k}.transit.a.sign`])];
    if (extra) {
      const x = extra(ctx);
      rows.push(...x.rows);
      ids.push(...x.ids);
    }
    return { tex: kvTableL(lang, rows), evidenceIds: ids, method: tl(lang, 'Sidereal zodiac, Lahiri ayanamsa, whole-sign houses, mean nodes (provisional conventions recorded in the report manifest).') };
  };
}

export function natalAspectsBlock(key: PlanetKey): BlockRenderer {
  return (ctx) => {
    const d = ptData(ctx, key);
    const N = d.name;
    const lang = blockLang(ctx);
    const P = planetLabel(lang, N);
    const rows = d.natal.aspects.map((a) => [
      tex(ord(lang, a.nth)), tex(signLabel(lang, a.sign)), tex(ord(lang, a.houseFromLagna)), tex(ord(lang, a.houseFromMoon)), tex(planetsL(lang, a.natalPlanets) || '—'),
    ]);
    const conj = ctx.registry.get(`planet.${key}.d1.conjunctions`)!.value as string[];
    const recv = ctx.registry.get(`planet.${key}.d1.aspected-by`)!.value as string[];
    return {
      tex: [
        tableTex('p{0.13\\linewidth}p{0.2\\linewidth}p{0.17\\linewidth}p{0.17\\linewidth}X', ['Aspect', 'Sign aspected', 'From Lagna', 'From Moon', 'Natal planets there'].map((h) => hd(lang, h)), rows),
        card(tl(lang, 'Company and glances'), `${lb(tl(lang, 'Sharing the house:'), conj.length ? planetsL(lang, conj) : pick(lang, `none, ${N} stands alone`, `कोई नहीं, ${P} अकेला है`))}\\newline ${lb(pick(lang, `Planets aspecting ${N}:`, `${P} पर दृष्टि डालने वाले ग्रह:`), recv.length ? planetsL(lang, recv) : tl(lang, 'none'))}`),
      ].join('\n'),
      evidenceIds: [`${key}.natal.aspects`, `${key}.natal.aspected-planets`, `planet.${key}.d1.conjunctions`, `planet.${key}.d1.aspected-by`],
      method: pickLazy(lang,
        () => `Graha drishti by whole sign, counted inclusively from ${N}'s sign (BPHS ch. 26): every graha aspects the 7th; Saturn also the 3rd and 10th; Jupiter the 5th and 9th; the nodes the 5th and 9th (engine convention, Phaladeepika tradition).`,
        () => `संपूर्ण राशि से ग्रह दृष्टि, ${P} की राशि को पहली गिनते हुए (बृहत् पाराशर होरा शास्त्र, अध्याय 26): हर ग्रह 7वीं राशि को देखता है; शनि 3री और 10वीं को भी; गुरु 5वीं और 9वीं को; राहु और केतु 5वीं और 9वीं को (गणना की परिपाटी, फलदीपिका परंपरा)।`),
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
    const lang = blockLang(ctx);
    const P = planetLabel(lang, N);
    const rows = d.natal.lordshipTypes.map((t) => {
      const [h, cats] = t.split(':');
      const sign = SIGNS[((ctx.snapshot.natal.ascendant.rashiIndex - 1 + Number(h) - 1) % 12)];
      return [tex(houseL(lang, Number(h))), tex(signLabel(lang, sign)), tex(cats.split('+').map((c) => (NAMES[c] ? tl(lang, NAMES[c]) : c)).join('; '))];
    });
    return {
      tex: [
        tableTex('p{0.18\\linewidth}p{0.2\\linewidth}X', ['House ruled', 'Sign', 'Classical category'].map((h) => hd(lang, h)), rows),
        card(pick(lang, `Is ${N} a yogakaraka for you?`, `क्या ${P} आपके लिए योगकारक है?`), tex(d.natal.yogakaraka
          ? pickLazy(lang,
            () => `Yes. ${N} rules both a kendra and a trikona from your Ascendant. Classical texts (BPHS ch. 34) call such a planet a yogakaraka, a planet whose periods and transits tend to work for the native's growth.`,
            () => `हाँ। ${P} आपके लग्न से एक केंद्र और एक त्रिकोण दोनों का स्वामी है। शास्त्र (बृहत् पाराशर होरा शास्त्र, अध्याय 34) ऐसे ग्रह को योगकारक कहते हैं, यानी ऐसा ग्रह जिसकी दशाएँ और गोचर प्रायः जातक की उन्नति में सहायक होते हैं।`)
          : pickLazy(lang,
            () => `No. ${N} does not rule both a kendra (4th, 7th or 10th) and a trikona (5th or 9th) from your Ascendant, so the classical yogakaraka condition is not met. Its results follow the houses it rules, listed above.`,
            () => `नहीं। ${P} आपके लग्न से किसी केंद्र (4था, 7वाँ या 10वाँ भाव) और किसी त्रिकोण (5वाँ या 9वाँ भाव) दोनों का स्वामी नहीं है, इसलिए योगकारक की शास्त्रीय शर्त पूरी नहीं होती। इसके फल ऊपर दिए गए इसके स्वामित्व वाले भावों के अनुसार होते हैं।`)), d.natal.yogakaraka ? 'asHighlight' : 'asCard'),
      ].join('\n'),
      evidenceIds: [`${key}.natal.lordship-type`, `${key}.natal.yogakaraka`, `planet.${key}.d1.lordship`],
      method: tl(lang, 'Functional nature from house lordship counted from the Ascendant (whole signs). Categories are the standard Parashari groupings; no score is computed.'),
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
  const lang = blockLang(ctx);
  const abbrs = lang === 'hi' ? SIGN_ABBR_HI.map((s) => tex(s)) : SIGN_ABBR;
  const head = ['', ...abbrs.map((s, i) => (mark.includes(i + 1) ? `${s}*` : s))];
  const houseRow = [`\\textcolor{Muted}{${hd(lang, 'House')}}`, ...SIGN_ABBR.map((_, i) => `\\textcolor{Muted}{${((i + 1 - asc + 12) % 12) + 1}}`)];
  return { head, houseRow };
}

export function bavPrastaraBlock(key: 'saturn' | 'jupiter'): BlockRenderer {
  return (ctx) => {
    const d = ptData(ctx, key);
    const sym = key.toUpperCase() as 'SATURN' | 'JUPITER';
    const bav = ctx.snapshot.ashtakavarga.bav[sym as keyof typeof ctx.snapshot.ashtakavarga.bav];
    const mark = [d.a.signIndex, d.b.signIndex];
    const { head, houseRow } = signHeader(ctx, mark);
    const lang = blockLang(ctx);
    const cell = (v: number, sign: number) => `${mark.includes(sign) ? '\\cellcolor{Tint}' : ''}${v ? '\\textbf{1}' : '\\textcolor{Muted}{·}'}`;
    const rows = [
      houseRow,
      ...CONTRIB.map(([c, name]) => [tex(planetLabel(lang, name)), ...bav.prastara[c].map((v, i) => cell(v, i + 1))]),
      [`\\textbf{${hd(lang, 'Total')}}`, ...bav.signList.map((v, i) => `${mark.includes(i + 1) ? '\\cellcolor{Tint}' : ''}\\textbf{${v}}`)],
    ];
    return {
      tex: tableTex('>{\\raggedright\\arraybackslash}p{17mm}*{12}{>{\\centering\\arraybackslash}X}', head, rows),
      evidenceIds: [...SIGNS.map((s) => `${key}.bav.sign.${slugSign(s)}`), `${key}.bav.total`],
      method: pickLazy(lang,
        () => `Bhinnashtakavarga of ${d.name} (BPHS ch. 66): each of the eight contributors (seven grahas and the Ascendant) gives one bindu (1) to the signs classically benefic from its own position. Columns are signs (Ar = Aries … Pi = Pisces); the grey row gives the house from your Ascendant. * and shading mark the two transit signs detailed in this report. Total ${bav.totalPoints} bindus (the classical total is 39 for Saturn and 56 for Jupiter).`,
        () => `${planetLabel('hi', d.name)} का भिन्नाष्टकवर्ग (बृहत् पाराशर होरा शास्त्र, अध्याय 66): आठों योगदानकर्ता (सात ग्रह और लग्न) अपनी स्थिति से शास्त्र में शुभ मानी गई राशियों को एक-एक बिंदु (1) देते हैं। स्तंभ राशियाँ हैं (मेष से मीन तक); धूसर पंक्ति आपके लग्न से भाव बताती है। * और हल्का रंग इस रिपोर्ट में विस्तार से बताई गई दो गोचर राशियों को दिखाते हैं। कुल ${bav.totalPoints} बिंदु (शास्त्रीय योग शनि के लिए 39 और गुरु के लिए 56 है)।`),
    };
  };
}

export function savMatrixBlock(markKeys: PlanetKey[]): BlockRenderer {
  return (ctx) => {
    const sav = ctx.snapshot.ashtakavarga.sav;
    const ext = ptExt(ctx);
    const mark = markKeys.flatMap((k) => (ext.pt[k] ? [ext.pt[k]!.a.signIndex, ext.pt[k]!.b.signIndex] : []));
    const { head, houseRow } = signHeader(ctx, mark);
    const lang = blockLang(ctx);
    const order: Array<[keyof typeof sav.byPlanet, string]> = [
      ['SUN' as keyof typeof sav.byPlanet, 'Sun'], ['MOON' as keyof typeof sav.byPlanet, 'Moon'], ['MARS' as keyof typeof sav.byPlanet, 'Mars'],
      ['MERCURY' as keyof typeof sav.byPlanet, 'Mercury'], ['JUPITER' as keyof typeof sav.byPlanet, 'Jupiter'], ['VENUS' as keyof typeof sav.byPlanet, 'Venus'],
      ['SATURN' as keyof typeof sav.byPlanet, 'Saturn'],
    ];
    const c = (v: number | string, sign: number, bold = false) => `${mark.includes(sign) ? '\\cellcolor{Tint}' : ''}${bold ? `\\textbf{${v}}` : v}`;
    const rows = [
      houseRow,
      ...order.map(([k, name]) => [tex(planetLabel(lang, name)), ...sav.byPlanet[k].map((v, i) => c(v, i + 1))]),
      [`\\textbf{${lang === 'en' ? 'SAV' : hd(lang, 'Total')}}`, ...sav.signList.map((v, i) => c(v, i + 1, true))],
    ];
    const asc = ctx.snapshot.natal.ascendant.rashiIndex;
    return {
      tex: tableTex('>{\\raggedright\\arraybackslash}p{17mm}*{12}{>{\\centering\\arraybackslash}X}', head, rows),
      evidenceIds: Array.from({ length: 12 }, (_, i) => `sav.house.${((i + 1 - asc + 12) % 12) + 1}`),
      method: pickLazy(lang,
        () => `Sarvashtakavarga: the sum of the seven Bhinnashtakavargas per sign (grand total ${sav.grandTotal}; 337 is the classical constant, so 28 per sign is the average). * and shading mark the transit signs detailed in this report.`,
        () => `सर्वाष्टकवर्ग: हर राशि में सातों भिन्नाष्टकवर्गों का योग (महायोग ${sav.grandTotal}; शास्त्रीय स्थिरांक 337 है, इसलिए प्रति राशि औसत 28 है)। * और हल्का रंग इस रिपोर्ट में विस्तार से बताई गई गोचर राशियों को दिखाते हैं।`),
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

export function binduGuideBlock(ctx?: BlockContext): BlockOutput {
  const lang = ctx ? blockLang(ctx) : 'en';
  return {
    tex: [
      tableTex('p{0.14\\linewidth}X', ['Bindus', 'Classical reading of a transit through that sign'].map((h) => hd(lang, h)), BINDU_GUIDE.map(([b, t]) => [tex(b), tex(tl(lang, t))])),
      card(tl(lang, 'How to read your own table in four steps'), bullets([
        tex(tl(lang, 'Find the sign the planet is transiting (the shaded column).')),
        tex(tl(lang, 'Read the planet\'s own total (Bhinnashtakavarga) for that sign: four is the classical dividing line.')),
        tex(tl(lang, 'Read the Sarvashtakavarga total for the same sign: 28 is the average; higher means the life area is broadly well supported.')),
        tex(tl(lang, 'Count the house that sign occupies from your Ascendant and from your Moon to see which areas of life the transit touches.')),
      ])),
    ].join('\n'),
    evidenceIds: [],
    method: tl(lang, 'Classical thresholds (BPHS Ashtakavarga chapters; Phaladeepika ch. 23): four bindus is the midpoint for a planet\'s own scheme, 28 is the Sarvashtakavarga average. Explanatory text, identical for every reader.'),
  };
}

export function transitBinduBlock(key: 'saturn' | 'jupiter'): BlockRenderer {
  return (ctx) => {
    const d = ptData(ctx, key);
    const lang = blockLang(ctx);
    const rows = d.overview.map((o) => [
      tex(signLabel(lang, o.sign)), tex(dateL(lang, o.firstStartIso)), tex(ord(lang, o.houseFromLagna)), tex(ord(lang, o.houseFromMoon)), `\\textbf{${o.bav}}`, `${o.sav}`,
      tex(tl(lang, (o.bav ?? 0) >= 5 ? 'supportive' : o.bav === 4 ? 'balanced' : 'patience and effort')),
    ]);
    return {
      tex: tableTex('p{0.13\\linewidth}p{0.20\\linewidth}p{0.09\\linewidth}p{0.09\\linewidth}p{0.08\\linewidth}p{0.08\\linewidth}X',
        ['Transit sign', 'From', 'Lagna', 'Moon', 'BAV', 'SAV', 'Classical reading'].map((h) => hd(lang, h)), rows),
      evidenceIds: [`${key}.transit.horizon`, ...SIGNS.map((s) => `${key}.bav.sign.${slugSign(s)}`)],
      method: pickLazy(lang,
        () => `For each ${d.name} transit sign in the next ${d.horizonYears} years: ${d.name}'s own bindus (BAV) and the sign's Sarvashtakavarga (SAV). Reading: BAV 5 or more supportive, 4 balanced, below 4 asks for patience (decision PT-006). Not a score.`,
        () => `अगले ${d.horizonYears} वर्षों की ${planetLabel('hi', d.name)} की हर गोचर राशि के लिए: ${planetLabel('hi', d.name)} के अपने बिंदु (भिन्न = भिन्नाष्टकवर्ग) और राशि का सर्वाष्टकवर्ग (सर्व)। अर्थ: भिन्नाष्टकवर्ग में 5 या अधिक बिंदु सहायक, 4 संतुलित, 4 से कम धैर्य माँगता है (निर्णय PT-006)। यह कोई अंक-तालिका नहीं है।`),
    };
  };
}

export function savNodesBlock(ctx: BlockContext): BlockOutput {
  const ra = ptData(ctx, 'rahu');
  const ke = ptData(ctx, 'ketu');
  const lang = blockLang(ctx);
  const rows = [ra.a, ra.b, ke.a, ke.b].map((s, i) => [
    tex(planetLabel(lang, i < 2 ? 'Rahu' : 'Ketu')), tex(signLabel(lang, s.sign)), tex(ord(lang, s.houseFromLagna)), tex(ord(lang, s.houseFromMoon)), `\\textbf{${s.sav}}`, tex(savReadingL(lang, s.sav)),
  ]);
  return {
    tex: tableTex('p{0.1\\linewidth}p{0.15\\linewidth}p{0.12\\linewidth}p{0.12\\linewidth}p{0.08\\linewidth}X', ['Node', 'Transit sign', 'From Lagna', 'From Moon', 'SAV', 'Compared with the average'].map((h) => hd(lang, h)), rows),
    evidenceIds: ['rahu.transit.a.sav', 'rahu.transit.b.sav', 'ketu.transit.a.sav', 'ketu.transit.b.sav'],
    method: tl(lang, 'Rahu and Ketu have no Bhinnashtakavarga of their own in the classical scheme (BPHS uses the seven grahas and the Ascendant only), so only the Sarvashtakavarga of the signs they transit is shown (decision PT-008).'),
  };
}

// ------------------------------------------------------------ transits --

export function stayBlock(key: PlanetKey, slot: 'a' | 'b'): BlockRenderer {
  return (ctx) => {
    const d = ptData(ctx, key);
    const st: StayView = d[slot];
    const N = d.name;
    const lang = blockLang(ctx);
    const P = planetLabel(lang, N);
    const sign = signLabel(lang, st.sign);
    const status = st.status === 'in-progress' ? 'In progress on the report date' : st.status === 'paused' ? 'Begun; the planet is briefly in a neighbouring sign on the report date and will return' : 'Upcoming';
    const kv: Array<[string, string]> = [
      [tl(lang, 'Transit sign'), pick(lang, `${N} in ${st.sign}`, `${sign} में ${P}`)],
      [tl(lang, 'Status'), tl(lang, status)],
      [tl(lang, 'Dates in this sign'), st.spans.map((s) => spanL(lang, s)).join('; ')],
      [tl(lang, 'House from your Ascendant'), ord(lang, st.houseFromLagna)],
      [tl(lang, 'House from your Moon'), ord(lang, st.houseFromMoon)],
      [tl(lang, 'Over natal planets'), st.conjunctNatal.length ? planetsL(lang, st.conjunctNatal) : tl(lang, 'none (the sign is empty in your birth chart)')],
    ];
    if (key === 'saturn' || key === 'jupiter') {
      kv.push([tl(lang, 'Retrograde windows'), st.retroWindows.length ? st.retroWindows.map((w) => retroL(lang, w)).join('; ') : tl(lang, 'none during this sign period')]);
      kv.push([tl(lang, `Ashtakavarga support`), pickLazy(lang,
        () => `${N}'s own bindus ${st.bav} (${binduReadingL('en', st.bav!)}); SAV ${st.sav} (${savReadingL('en', st.sav)})`,
        () => `${P} के अपने बिंदु ${st.bav} (${binduReadingL('hi', st.bav!)}); सर्वाष्टकवर्ग ${st.sav} (${savReadingL('hi', st.sav)})`)]);
    } else {
      kv.push([tl(lang, 'Sarvashtakavarga of the sign'), `${st.sav} (${savReadingL(lang, st.sav)})`]);
    }
    const asp = st.aspects.map((a) => [tex(ord(lang, a.nth)), tex(signLabel(lang, a.sign)), tex(ord(lang, a.houseFromLagna)), tex(ord(lang, a.houseFromMoon)), tex(planetsL(lang, a.natalPlanets) || '—')]);
    const ids = [`${key}.transit.${slot}.sign`, `${key}.transit.${slot}.dates`, `${key}.transit.${slot}.status`, `${key}.transit.${slot}.house-asc`,
      `${key}.transit.${slot}.house-moon`, `${key}.transit.${slot}.conjunct`, `${key}.transit.${slot}.aspects`, `${key}.transit.${slot}.aspected-natal`, `${key}.transit.${slot}.sav`];
    if (key === 'saturn' || key === 'jupiter') ids.push(`${key}.transit.${slot}.retro`, `${key}.transit.${slot}.bav`);
    return {
      tex: [
        kvTableL(lang, kv),
        `{\\sffamily\\fontsize{8.5}{10.5}\\selectfont\\bfseries\\color{Primary}${lang === 'hi' ? tex(`${sign} से गोचर के ${P} की दृष्टियाँ`) : `TRANSITING ${tex(N.toUpperCase())}'S ASPECTS FROM ${tex(st.sign.toUpperCase())}`}\\par}`,
        tableTex('p{0.13\\linewidth}p{0.2\\linewidth}p{0.17\\linewidth}p{0.17\\linewidth}X', ['Aspect', 'Sign', 'From Lagna', 'From Moon', 'Natal planets aspected'].map((h) => hd(lang, h)), asp),
      ].join('\n'),
      evidenceIds: ids,
      method: tl(lang, `Sign ingresses and retrograde stations solved with the TransitIngressSolver (sidereal, Lahiri). A sign period groups the main stay with any retrograde re-entry; each continuous span is listed. Aspects by whole sign as for the natal chart.`),
    };
  };
}

export function overviewBlock(key: PlanetKey): BlockRenderer {
  return (ctx) => {
    const d = ptData(ctx, key);
    const showBav = key === 'saturn' || key === 'jupiter';
    const lang = blockLang(ctx);
    const rows = d.overview.map((o) => {
      const cells = [
        tex(signLabel(lang, o.sign)) + (o.isReturn ? `\\textsuperscript{\\textcolor{Accent}{\\,${lang === 'hi' ? tex('ज') : 'R'}}}` : ''),
        o.spans.map((s) => tex(spanL(lang, s))).join('\\newline '),
        tex(ord(lang, o.houseFromLagna)), tex(ord(lang, o.houseFromMoon)),
      ];
      if (showBav) cells.push(`${o.bav}`);
      cells.push(`${o.sav}`);
      return cells;
    });
    const spec = showBav
      ? 'p{0.14\\linewidth}>{\\raggedright\\arraybackslash}X p{0.08\\linewidth}p{0.08\\linewidth}p{0.06\\linewidth}p{0.06\\linewidth}'
      : 'p{0.14\\linewidth}>{\\raggedright\\arraybackslash}X p{0.1\\linewidth}p{0.1\\linewidth}p{0.07\\linewidth}';
    const head = showBav ? ['Sign', 'Dates', 'Lagna', 'Moon', 'BAV', 'SAV'] : ['Sign', 'Dates', 'Lagna', 'Moon', 'SAV'];
    const tlItems = d.overview.slice(0, 5).map((o, idx) => ({
      date: o.spans.map((s) => spanL(lang, s)).join('; '),
      title: `${planetLabel(lang, d.name)} — ${signLabel(lang, o.sign)}`,
      detail: `${ord(lang, o.houseFromLagna)} / ${ord(lang, o.houseFromMoon)}`,
      active: idx === 0,
    }));
    return {
      tex: timelineTex(tlItems) + '\n' + tableTex(spec, head.map((h) => hd(lang, h)), rows),
      evidenceIds: [`${key}.transit.horizon`],
      method: pickLazy(lang,
        () => `Every ${d.name} sign period from the report date for ${d.horizonYears} years, solved with the TransitIngressSolver. Lagna/Moon = house counted from your Ascendant / Moon sign. R marks a return to the natal sign.`,
        () => `रिपोर्ट की तिथि से ${d.horizonYears} वर्षों तक ${planetLabel('hi', d.name)} का हर राशि-काल, गोचर गणना से निकाला गया। लग्न/चंद्र = आपके लग्न / चंद्र राशि से गिना गया भाव। ${showBav ? 'भिन्न और सर्व = भिन्नाष्टकवर्ग और सर्वाष्टकवर्ग के बिंदु।' : 'सर्व = सर्वाष्टकवर्ग के बिंदु।'} ज = जन्म राशि में वापसी।`),
    };
  };
}

export function returnsBlock(key: PlanetKey): BlockRenderer {
  return (ctx) => {
    const ret = ptExt(ctx).returns[key];
    if (!ret) throw new Error(`BLOCK_DATA_MISSING: returns.${key}`);
    const N = PLANET_NAME[key];
    const lang = blockLang(ctx);
    const P = planetLabel(lang, N);
    const rows = ret.map((r) => [`${r.n}`, tex(signLabel(lang, r.sign)), r.stay.spans.map((s) => tex(spanL(lang, s))).join('\\newline '), `${r.age}`]);
    return {
      tex: rows.length
        ? tableTex('p{0.07\\linewidth}p{0.15\\linewidth}>{\\raggedright\\arraybackslash}X p{0.1\\linewidth}', ['No.', 'Natal sign', 'Transit dates', 'Age'].map((h) => hd(lang, h)), rows)
        : para(pick(lang, `${N} does not complete a return to its natal sign within the calculated lifetime window.`, `गणना की गई जीवन-अवधि में ${P} अपनी जन्म राशि में वापसी पूरी नहीं करता।`)),
      evidenceIds: [`${key}.returns`],
      method: pickLazy(lang,
        () => `Each time transiting ${N} re-enters the sign it occupied at birth, from birth to age 90, solved from ingresses.`,
        () => `जन्म से 90 वर्ष की आयु तक, गोचर का ${P} जब-जब उस राशि में लौटता है जिसमें वह जन्म के समय था; राशि-प्रवेश की तिथियों से निकाला गया।`),
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

/**
 * Static educational text, identical for every reader (no chart evidence). `hi` is the Hindi
 * form of the same text; a Hindi report without it is a defect, never printed in English.
 * A Hindi verse leaves `transliteration` empty (the Roman rendering is for English readers).
 */
export function staticBlock(en: StaticContent, hi?: StaticContent): BlockRenderer {
  return (ctx) => {
    const lang = ctx ? blockLang(ctx) : 'en';
    if (lang === 'hi' && !hi) throw new Error('HINDI_STATIC_MISSING: static block has no Hindi text');
    const c = lang === 'hi' ? hi! : en;
    const parts: string[] = c.paragraphs.map((p) => para(p, '10.2'));
    if (c.verse) {
      parts.push(`\\begin{asHighlight}\\begin{center}{\\fontsize{12}{19}\\selectfont\\color{Primary}${c.verse.devanagari.map((l) => tex(l)).join('\\\\')}\\par}${c.verse.transliteration ? `\\vspace{1.5mm}{\\fontsize{9}{12.5}\\selectfont\\itshape ${tex(c.verse.transliteration)}\\par}` : ''}\\vspace{1.2mm}{\\fontsize{9.4}{13}\\selectfont ${tex(c.verse.meaning)}\\par}\\vspace{0.8mm}{\\sffamily\\fontsize{7}{9}\\selectfont\\color{Muted}${tex(c.verse.source)}\\par}\\end{center}\\end{asHighlight}`);
    }
    if (c.bullets?.length) parts.push(bullets(c.bullets.map(([l, t]) => lb(l, t))));
    if (c.note) parts.push(card(tl(lang, 'Please note'), tex(c.note), 'asCaution'));
    return { tex: parts.join('\n'), evidenceIds: [], method: tl(lang, 'Educational text written by Astro Sushil, identical for every reader.') };
  };
}

export const REMEDY_PRINCIPLES: StaticContent = {
  paragraphs: [
    'In the Astro Sushil approach a remedy is a change in how you live, not an object you acquire. The classical texts themselves place conduct, discipline, service and devotion above every material measure, and these cost nothing.',
    'Choose two or three practices that feel natural, keep them for at least forty days, and notice how your responses to the planet\'s themes change. Consistency matters far more than intensity.',
  ],
  note: 'Nothing in this section requires a purchase. We do not prescribe gemstones, paid rituals or talismans. If you have a medical, psychological, legal or financial concern, please consult a qualified professional; these practices complement, and never replace, such advice.',
};
