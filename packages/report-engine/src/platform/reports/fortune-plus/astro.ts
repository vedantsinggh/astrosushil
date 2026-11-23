/**
 * Fortune Plus — the astrology half ("Cosmic Pathway"): extra deterministic
 * calculations, evidence and blocks. Built on @astro/astrology-engine only.
 */
import { MatchmakingCalculator, ManglikStatus } from '@astro/astrology-engine';
import { AddEvidence, EvidenceRegistry, ordinal, planetName, PLANETS, PlanetName, SIGNS } from '../../evidence/evidence-registry';
import { dignityLabel, label, nakshatraLabel, planetAbbr, planetLabel, ReportLanguage, signLabel } from '../../i18n/hindi';
import { ExtendContext } from '../../module';
import { BlockContext, blockLang, BlockOutput, northChart } from '../../render/blocks';
import { formatDate, tex } from '../../render/latex';
import { BEEJ_MANTRA, dateLabel, L, PLANET_AVATAR, PLANET_DAY } from '../_numerology-shared/associations';
import { grid, kv } from '../_numerology-shared/blocks';
import {
  hindiOf, KARANA_HI, MANGLIK_FACTOR_HI, PAKSHA_HI, PANCHANG_YOGA_HI, SERVICE_HI, TITHI_HI, YOGA_CATEGORY_HI, yogaNameHi,
} from './fortune-plus.hindi';
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
// Blocks. Each labels itself in the language of the edition being generated
// (`blockLang`); numbers, dates and evidence IDs are the same in both.
// ---------------------------------------------------------------------------

const dms = (deg: number) => {
  const m = Math.floor(deg * 60 + 1e-9);
  return `${Math.floor(m / 60)}° ${String(m % 60).padStart(2, '0')}′`;
};

const ABBR: Record<string, string> = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };

/** A date as the edition prints it: "08 Jun 2004" / "8 जून 2004". */
const dateIn = (lang: ReportLanguage, iso: string) => (lang === 'hi' ? dateLabel(lang, iso) : formatDate(iso));

export function moonChart(ctx: BlockContext): BlockOutput {
  const { natal } = ctx.snapshot;
  const lang = blockLang(ctx);
  const moon = natal.planets.find((p) => planetName(p.name) === 'Moon')!;
  const houses = Array.from({ length: 12 }, (_, i) => ({ sign: ((moon.rashiIndex - 1 + i) % 12) + 1, lines: [] as string[] }));
  for (const p of natal.planets) {
    houses[(p.rashiIndex - moon.rashiIndex + 12) % 12].lines.push(lang === 'hi' ? planetAbbr(lang, planetName(p.name)) : ABBR[planetName(p.name)]);
  }
  houses[(natal.ascendant.rashiIndex - moon.rashiIndex + 12) % 12].lines.unshift(label(lang, 'Asc'));
  return {
    tex: `\\begin{center}${northChart(houses)}\\end{center}`,
    evidenceIds: ['planet.moon.d1.sign', ...natal.planets.map((p) => `planet.${planetName(p.name).toLowerCase()}.d1.sign`)],
    method: L(lang,
      'Chandra Kundali: the same planets with the Moon\'s sign as the 1st house. Numbers are signs (1 = Aries … 12 = Pisces).',
      'चंद्र कुंडली: वही ग्रह, चंद्र की राशि को पहला भाव मानकर। अंक राशियाँ हैं (1 = मेष … 12 = मीन); ल = लग्न।'),
  };
}

export function planetTable(ctx: BlockContext): BlockOutput {
  const { natal } = ctx.snapshot;
  const lang = blockLang(ctx);
  const hi = lang === 'hi';
  const order: PlanetName[] = [...PLANETS];
  const rows = order.map((name) => {
    const p = natal.planets.find((x) => planetName(x.name) === name)!;
    const flags = [p.retrograde ? label(lang, 'R') : '', p.combust ? label(lang, 'C') : ''].filter(Boolean).join(' ');
    return [
      planetLabel(lang, name), signLabel(lang, p.sign), String(p.house), dms(p.degree), `${nakshatraLabel(lang, p.nakshatra)} (${p.pada})`,
      hi ? dignityLabel(lang, String(p.dignity)) : p.dignity.toLowerCase().replace(/_/g, ' '), flags || '—',
    ];
  });
  rows.unshift([label(lang, 'Ascendant'), signLabel(lang, natal.ascendant.sign), '1', dms(natal.ascendant.degree), `${nakshatraLabel(lang, natal.ascendant.nakshatra)} (${natal.ascendant.pada})`, '—', '—']);
  return {
    tex: grid('p{0.13\\linewidth}p{0.13\\linewidth}p{0.07\\linewidth}p{0.1\\linewidth}>{\\raggedright\\arraybackslash}X p{0.15\\linewidth}p{0.06\\linewidth}',
      hi ? ['ग्रह', 'राशि', 'भाव', 'अंश', 'नक्षत्र (चरण)', 'स्थिति', 'व / अ'] : ['Body', 'Sign', 'House', 'Degree', 'Nakshatra (pada)', 'Dignity', 'State'], rows),
    evidenceIds: ['asc.d1.sign', ...order.flatMap((n) => [`planet.${n.toLowerCase()}.d1.sign`, `planet.${n.toLowerCase()}.d1.house`, `planet.${n.toLowerCase()}.d1.nakshatra`, `planet.${n.toLowerCase()}.d1.dignity`])],
    method: L(lang,
      'Sidereal (Lahiri) positions, whole-sign houses, mean nodes. R = retrograde, C = combust.',
      'निरयण (लाहिड़ी) स्थितियाँ, संपूर्ण-राशि भाव, मध्यम पात। व = वक्री, अ = अस्त।'),
  };
}

export function panchangTable(ctx: BlockContext): BlockOutput {
  const p = astroOf(ctx.ext).panchang;
  const lang = blockLang(ctx);
  const rows: Array<[string, string]> = lang === 'hi'
    ? [
      ['पक्ष', `${hindiOf(PAKSHA_HI, 'PAKSHA', p.paksha)} पक्ष`],
      ['तिथि', `${hindiOf(TITHI_HI, 'TITHI', p.tithi)} (30 में से ${p.tithiIndex})`],
      ['वार', `${PLANET_DAY[p.varaLord as PlanetName].hi}${p.bornBeforeSunrise ? ' — जन्म सूर्योदय से पहले हुआ, इसलिए पिछला दिन माना गया' : ''}`],
      ['नक्षत्र (चंद्र का नक्षत्र)', `${nakshatraLabel(lang, p.nakshatra)}, चरण ${p.nakshatraPada}`],
      ['योग', hindiOf(PANCHANG_YOGA_HI, 'PANCHANG_YOGA', p.yoga)],
      ['करण', hindiOf(KARANA_HI, 'KARANA', p.karana)],
      ['सूर्योदय / सूर्यास्त (स्थानीय समय)', `${p.sunriseLocal} / ${p.sunsetLocal}`],
    ]
    : [
      ['Paksha (lunar fortnight)', p.paksha],
      ['Tithi (lunar day)', `${p.tithi} (${p.tithiIndex} of 30)`],
      ['Vara (weekday)', `${p.vara}${p.bornBeforeSunrise ? ' — birth before sunrise, so the previous civil day' : ''}`],
      ['Nakshatra (Moon\'s star)', `${p.nakshatra}, pada ${p.nakshatraPada}`],
      ['Yoga', p.yoga],
      ['Karana', p.karana],
      ['Sunrise / sunset (local)', `${p.sunriseLocal} / ${p.sunsetLocal}`],
    ];
  return {
    tex: kv(lang, rows, lang === 'hi' ? ['पंचांग का अंग', 'आपके जन्म के समय'] : ['Element', 'At your birth']),
    evidenceIds: ['panchang.paksha', 'panchang.tithi', 'panchang.vara', 'panchang.yoga', 'panchang.karana', 'planet.moon.d1.nakshatra'],
    method: L(lang,
      'Tithi = Moon − Sun in 12° steps; yoga = Sun + Moon in 13°20′ steps; karana = half-tithi; the weekday runs from sunrise to sunrise at the birth place. Computed from the same sidereal positions as your chart.',
      'तिथि = चंद्र − सूर्य, हर 12° पर एक; योग = सूर्य + चंद्र, हर 13°20′ पर एक; करण = आधी तिथि; वार जन्म स्थान के एक सूर्योदय से अगले सूर्योदय तक चलता है। गणना उन्हीं निरयण स्थितियों से की गई है जिनसे आपकी कुंडली बनी है।'),
  };
}

export function manglikTable(ctx: BlockContext): BlockOutput {
  const m = astroOf(ctx.ext).manglik;
  const lang = blockLang(ctx);
  const hi = lang === 'hi';
  const pos = m.marsPlacement;
  const mark = (h?: number) => (h === undefined ? '—'
    : hi ? `भाव ${h}${MANGLIK_HOUSES.includes(h) ? ' — मांगलिक स्थान' : ''}`
    : `${ordinal(h)}${MANGLIK_HOUSES.includes(h) ? ' — Manglik position' : ''}`);
  const rows: string[][] = [
    [L(lang, 'Ascendant (Lagna)', 'लग्न'), mark(pos.houseFromLagna)],
    [L(lang, 'Moon sign', 'चंद्र राशि'), mark(pos.houseFromMoon)],
    [L(lang, 'Venus', 'शुक्र'), mark(pos.houseFromVenus)],
  ];
  const mod = m.cancellationFactors.length
    ? m.cancellationFactors.map((f) => (hi ? hindiOf(MANGLIK_FACTOR_HI, 'MANGLIK_FACTOR', f) : f)).join('; ')
    : L(lang, 'None of the listed classical factors applies', 'सूचीबद्ध शास्त्रीय कारकों में से कोई लागू नहीं होता');
  return {
    tex: grid('p{0.4\\linewidth}X', hi ? ['जहाँ से गिना गया', 'मंगल किस भाव में है'] : ['Counted from', 'Mars is in house'], rows)
      + `\n\\begin{asCard}\\CardTitle{${tex(L(lang, 'Classical moderating factors', 'संतुलन देने वाले शास्त्रीय कारक'))}}{\\fontsize{9.3}{13}\\selectfont ${tex(mod)}\\par}\\end{asCard}`,
    evidenceIds: ['planet.mars.d1.house', 'manglik.mars.from-lagna', 'manglik.mars.from-moon', 'manglik.mars.from-venus', 'manglik.reference-points', 'manglik.moderating'],
    method: L(lang,
      'Classical rule: Mars in the 1st, 4th, 7th, 8th or 12th counted from the Ascendant, the Moon or Venus. Moderating factors (own or exalted sign in those houses, Jupiter\'s conjunction or aspect) are the engine\'s classical list. Astro Sushil does not treat this as a dosha; no grade is given.',
      'शास्त्रीय नियम: लग्न, चंद्र या शुक्र से गिनने पर मंगल पहले, चौथे, सातवें, आठवें या बारहवें भाव में हो। संतुलन देने वाले कारक (इन भावों में स्वराशि या उच्च राशि का मंगल, गुरु की युति या दृष्टि) हमारी गणना-प्रणाली की शास्त्रीय सूची से हैं। Astro Sushil इसे दोष नहीं मानता; कोई श्रेणी नहीं दी जाती।'),
  };
}

const PHASE_NAME_HI = { rising: 'चढ़ता चरण (चंद्र से बारहवीं राशि)', peak: 'मध्य चरण (चंद्र राशि पर)', setting: 'उतरता चरण (चंद्र से दूसरी राशि)' } as const;
const PHASE_SHORT_HI = { rising: 'चढ़ता चरण', peak: 'मध्य चरण', setting: 'उतरता चरण' } as const;

export function sadeSatiTable(ctx: BlockContext): BlockOutput {
  const s = astroOf(ctx.ext).sadeSati;
  const lang = blockLang(ctx);
  const hi = lang === 'hi';
  const rows: string[][] = [];
  const hl: number[] = [];
  for (const c of s.cycles) {
    for (const ph of c.phases) {
      if (s.current.cycleIndex === c.index) hl.push(rows.length);
      rows.push([
        String(c.index),
        hi ? PHASE_NAME_HI[ph.phase] : PHASE_NAME[ph.phase],
        signLabel(lang, ph.sign),
        ph.startIso === c.startIso && c.inProgressAtBirth ? L(lang, 'before birth', 'जन्म से पहले') : dateIn(lang, ph.startIso),
        ph.endIso === c.endIso && c.openEnded ? L(lang, 'beyond horizon', 'गणना-अवधि के बाद') : dateIn(lang, ph.endIso),
      ]);
    }
  }
  const status = hi
    ? (s.current.active
      ? `रिपोर्ट की तिथि पर आप साढ़े साती के चक्र ${s.current.cycleIndex} (${s.current.phase ? PHASE_SHORT_HI[s.current.phase] : ''}) में हैं।`
      : `रिपोर्ट की तिथि पर साढ़े साती सक्रिय नहीं है।${s.current.nextCycleIndex ? ` अगला चक्र तालिका का चक्र ${s.current.nextCycleIndex} है।` : ''}`)
    : (s.current.active
      ? `On your report date you are in Sade Sati cycle ${s.current.cycleIndex} (${s.current.phase} phase).`
      : `On your report date Sade Sati is not active.${s.current.nextCycleIndex ? ` The next cycle is cycle ${s.current.nextCycleIndex} in the table.` : ''}`);
  return {
    tex: `\\begin{asHighlight}{\\fontsize{9.8}{13.5}\\selectfont ${tex(status)}\\par}\\end{asHighlight}\n`
      + grid('p{0.07\\linewidth}>{\\raggedright\\arraybackslash}X p{0.15\\linewidth}p{0.17\\linewidth}p{0.17\\linewidth}',
        hi ? ['चक्र', 'चरण', 'शनि की राशि', 'से', 'तक'] : ['Cycle', 'Phase', 'Saturn in', 'From', 'To'], rows, (i) => hl.includes(i)),
    evidenceIds: ['sadesati.moon-sign', 'sadesati.current', ...s.cycles.map((c) => `sadesati.cycle.${String(c.index).padStart(2, '0')}.span`)],
    method: L(lang,
      `Saturn's transit through the 12th, 1st and 2nd signs from your Moon sign (${s.moonSign}), from birth for ${s.horizonYears} years, solved by the transit ingress engine; a phase runs from Saturn's first entry into the sign to its final exit, including retrograde re-entries.`,
      `आपकी चंद्र राशि (${signLabel(lang, s.moonSign)}) से बारहवीं, पहली और दूसरी राशि में शनि का गोचर, जन्म से ${s.horizonYears} वर्षों तक, गोचर के राशि-प्रवेश की गणना से निकाला गया है; हर चरण शनि के उस राशि में पहले प्रवेश से अंतिम निकास तक चलता है, वक्री होकर लौटने की अवधि सहित।`),
  };
}

export function yogaTable(ctx: BlockContext): BlockOutput {
  const detected = ctx.snapshot.yogas.filter((y) => y.isDetected);
  const lang = blockLang(ctx);
  const hi = lang === 'hi';
  const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // The engine words each satisfied condition in English only, so the Hindi edition lists the
  // planets that form the yoga (with house and sign) from the same engine result instead.
  const rows = detected.map((y) => (hi
    ? [
      yogaNameHi(y.canonicalName), hindiOf(YOGA_CATEGORY_HI, 'YOGA_CATEGORY', String(y.category)),
      y.evidence.involvedPlanets.map((pl) => `${planetLabel(lang, planetName(String(pl.planet)))} (भाव ${pl.house}, ${signLabel(lang, SIGNS[pl.rashiIndex - 1])})`).join('; ') || '—',
    ]
    : [y.canonicalName, String(y.category).toLowerCase().replace(/_/g, ' '), y.evidence.conditions.filter((c) => c.satisfied).map((c) => c.description).slice(0, 2).join('; ')]));
  return {
    tex: rows.length
      ? grid('p{0.24\\linewidth}p{0.14\\linewidth}>{\\raggedright\\arraybackslash}X', hi ? ['योग', 'प्रकार', 'योग बनाने वाले ग्रह'] : ['Yoga', 'Type', 'Conditions met in your chart'], rows)
      : hi ? `{\\itshape ${tex('हमारी गणना-प्रणाली की सूची का कोई योग इस कुंडली में नहीं बना है।')}}`
      : '{\\itshape None of the yogas in the engine\'s catalogue is formed in this chart.}',
    evidenceIds: detected.map((y) => `yoga.${slug(y.id.replace(/^YOGA_/, ''))}`),
    method: L(lang,
      'Yogas detected by the astrology engine\'s rule catalogue on the D1 chart; each row lists the conditions that are satisfied.',
      'हमारी गणना-प्रणाली की नियम-सूची से लग्न कुंडली (D1) में पहचाने गए योग; हर पंक्ति में योग बनाने वाले ग्रह अपने भाव और राशि के साथ दिए गए हैं।'),
  };
}

export function dashaTable(ctx: BlockContext): BlockOutput {
  const v = ctx.snapshot.vimshottari;
  const lang = blockLang(ctx);
  const asOf = Date.parse(ctx.snapshot.asOfIso);
  const rows = v.mahadashas.map((md) => [planetLabel(lang, planetName(md.lord)), dateIn(lang, md.startDateIso), dateIn(lang, md.endDateIso)]);
  const cur = v.mahadashas.findIndex((md) => Date.parse(md.startDateIso) <= asOf && asOf < Date.parse(md.endDateIso));
  return {
    tex: grid('>{\\raggedright\\arraybackslash}X p{0.25\\linewidth}p{0.25\\linewidth}', lang === 'hi' ? ['महादशा का स्वामी', 'से', 'तक'] : ['Mahadasha lord', 'From', 'To'], rows, (i) => i === cur),
    evidenceIds: ['dasha.birth-lord', ...v.mahadashas.map((_, i) => `dasha.md.${String(i + 1).padStart(2, '0')}`)],
    method: L(lang,
      `Vimshottari dasha from the Moon's nakshatra (${v.moonNakshatraName}); the highlighted row is the period running on the report date.`,
      `चंद्र के नक्षत्र (${nakshatraLabel(lang, v.moonNakshatraName)}) से विंशोत्तरी दशा; रंगीन पंक्ति वह महादशा है जो रिपोर्ट की तिथि पर चल रही है।`),
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
  const lang = blockLang(ctx);
  const hi = lang === 'hi';
  const lord = (h: number) => String(r.get(`house.${h}.d1.lord`)!.value) as PlanetName;
  const seen = new Set<string>();
  const rows: string[][] = [];
  const roles: Array<[number, string, string]> = [[1, 'Ascendant lord', 'लग्नेश'], [5, '5th lord (purva punya)', 'पंचमेश (पूर्व पुण्य)'], [9, '9th lord (fortune)', 'नवमेश (भाग्य)']];
  for (const [h, roleEn, roleHi] of roles) {
    const pl = lord(h);
    const role = L(lang, roleEn, roleHi);
    const title = seen.has(pl) ? `${role} ${L(lang, '(same planet)', '(वही ग्रह)')}` : role;
    seen.add(pl);
    rows.push(hi
      ? [`${title}: ${planetLabel(lang, pl)}`, PLANET_DAY[pl].hi, `${PLANET_AVATAR[pl].hi}; ${BEEJ_MANTRA[pl].dev}`, hindiOf(SERVICE_HI, 'SERVICE', pl)]
      : [`${title}: ${pl}`, PLANET_DAY[pl].en, `${PLANET_AVATAR[pl].en}; ${BEEJ_MANTRA[pl].roman}`, SERVICE[pl]]);
  }
  return {
    tex: grid('p{0.2\\linewidth}p{0.12\\linewidth}>{\\raggedright\\arraybackslash}p{0.3\\linewidth}>{\\raggedright\\arraybackslash}X',
      hi ? ['ग्रह', 'वार', 'देव स्वरूप और मंत्र', 'निःशुल्क अभ्यास'] : ['Planet', 'Day', 'Deity form & mantra', 'Free practice'], rows),
    evidenceIds: ['house.1.d1.lord', 'house.5.d1.lord', 'house.9.d1.lord'],
    method: L(lang,
      'The lords of the 1st, 5th and 9th houses (trikona lords) are the classical planets to strengthen. Each is supported here only through devotion (BPHS avatar association, Navagraha beej mantra) and service; no gemstones or purchases.',
      'पहले, पाँचवें और नौवें भाव के स्वामी (त्रिकोण के स्वामी) वे ग्रह हैं जिन्हें बल देना शास्त्रों में उत्तम माना गया है। यहाँ हर ग्रह को केवल भक्ति (बृहत् पाराशर होरा शास्त्र का अवतार संबंध, नवग्रह बीज मंत्र) और सेवा से सहारा दिया गया है; कोई रत्न या खरीदारी नहीं।'),
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
