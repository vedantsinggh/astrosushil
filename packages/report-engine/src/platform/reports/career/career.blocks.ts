/**
 * Career report — deterministic LaTeX blocks (provenance `deterministic`).
 * All values come from the snapshot, the evidence registry or the career
 * `extend` output; all dynamic text passes through `tex()`.
 */
import { BlockContext, blockLang, BlockRenderer, evidenceValue, kvTable } from '../../render/blocks';
import { dateLabel, ordinalLabel, planetList } from '../../render/blocks.hindi';
import { ordinal, planetName, SIGNS } from '../../evidence/evidence-registry';
import { dignityLabel, label, nakshatraLabel, pick, planetLabel, ReportLanguage, signLabel } from '../../i18n/hindi';
import { tex } from '../../render/latex';
import { formatBusinessDate } from '../../snapshot/chart-snapshot';
import { CAREER_HOUSES, careerExt, durationText, SAV_BENCHMARK } from './calc/career-calc';
import {
  careerLinkHi, careerTerm, durationHi, govLinkHi, HOUSE_THEME_HI, KARAKA_NAMES_HI, KARAKA_ROLE_HI, KARMAJIVA_FROM_HI,
  SIGN_DIGNITY_HI, SIGN_QUALITY_HI, yogaConditionHi, yogaFamilyHi, yogaNameHi,
} from './career.hindi';

const KARAKA_NAMES: Record<string, string> = {
  AK: 'Atmakaraka', AMK: 'Amatyakaraka', BK: 'Bhratrikaraka', MK: 'Matrikaraka',
  PK: 'Putrakaraka', GK: 'Gnatikaraka', DK: 'Darakaraka', PIK: 'Pitrikaraka',
};
const KARAKA_ROLE: Record<string, string> = {
  AK: 'the soul\'s purpose', AMK: 'career and counsel', BK: 'siblings, courage', MK: 'mother, comfort',
  PK: 'children, intellect', GK: 'rivals, obstacles', DK: 'partner',
};

const row = (cells: string[], i: number) => `${i % 2 ? '\\rowcolor{Surface}' : ''}${cells.map((c) => `\\TCell{${c}}`).join(' & ')}\\\\`;
const HOUSE_THEME: Record<number, string> = {
  1: 'Self, drive, reputation', 2: 'Earnings, resources, speech', 3: 'Initiative, skills', 4: 'Education, base',
  5: 'Intellect, creativity', 6: 'Service, jobs, competition', 7: 'Partnership, trade, clients', 8: 'Change, research',
  9: 'Mentors, fortune', 10: 'Profession, status', 11: 'Gains, networks, goals', 12: 'Withdrawal, foreign lands',
};

// --- Language helpers: English is printed exactly as before; Hindi reads the glossary. ---

/** Compound dignity of the birth chart as the tables print it ("great friend" / "अधिमित्र राशि"). */
const dignityText = (lang: ReportLanguage, raw: unknown) => (lang === 'hi' ? dignityLabel(lang, String(raw)) : String(raw).toLowerCase().replace(/_/g, ' '));
/** A period "20 Nov 2026 -- 02 Jun 2027" in the block's language. */
const periodText = (lang: ReportLanguage, startIso: string, endIso: string) => `${dateLabel(lang, formatBusinessDate(startIso))} -- ${dateLabel(lang, formatBusinessDate(endIso))}`;
const houseTheme = (lang: ReportLanguage, h: number) => (lang === 'hi' ? careerTerm(HOUSE_THEME_HI, h) : HOUSE_THEME[h]);
const careerLinks = (lang: ReportLanguage, links: string[]) => (lang === 'hi' ? links.map(careerLinkHi) : links).join('; ') || '—';
const labels = (lang: ReportLanguage, head: string[]) => head.map((h) => (h ? label(lang, h) : h));
/** Key/value rows with the keys looked up in the glossary. */
const kv = (lang: ReportLanguage, rows: Array<[string, string]>) => kvTable(rows.map(([k, v]) => [label(lang, k), v]), lang);

/** Full-width table helper: `spec` is a tabularx column spec. */
function table(spec: string, head: string[], rows: string[][], size = ''): string {
  return [
    `\\begin{center}${size}\\begin{tabularx}{\\linewidth}{${spec}}`,
    `\\TableHead${head.map((h) => `\\THd{${tex(h)}}`).join(' & ')}\\\\`,
    ...rows.map((r, i) => row(r, i)),
    '\\bottomrule\\end{tabularx}\\end{center}',
  ].join('\n');
}

function intro(text: string): string {
  return `{\\fontsize{9.8}{14}\\selectfont ${tex(text)}\\par}\\vspace{1mm}`;
}

// ---------------------------------------------------------------------------

export const careerAstralDetails: BlockRenderer = (ctx) => {
  const r = ctx.registry;
  const lang = blockLang(ctx);
  const v = (id: string) => String(evidenceValue(r, id));
  const sign = (id: string) => signLabel(lang, v(id));
  const planet = (id: string) => planetLabel(lang, v(id));
  const nak = (id: string) => nakshatraLabel(lang, v(id));
  const house = (id: string, form: 'direct' | 'oblique' = 'direct') => ordinalLabel(lang, Number(v(id)), form);
  const rows: Array<[string, string]> = [
    ['Ascendant (Lagna)', pick(lang, `${sign('asc.d1.sign')} (${nak('asc.d1.nakshatra')} nakshatra), lord ${planet('asc.d1.lord')}`, `${sign('asc.d1.sign')} (${nak('asc.d1.nakshatra')} नक्षत्र), स्वामी ${planet('asc.d1.lord')}`)],
    ['Moon sign and nakshatra', `${sign('planet.moon.d1.sign')}, ${nak('planet.moon.d1.nakshatra')}`],
    ['10th house (profession)', pick(lang, `${sign('house.10.d1.sign')}, lord ${planet('house.10.d1.lord')} in the ${house('house.10.d1.lord-house')} house`, `${sign('house.10.d1.sign')}, स्वामी ${planet('house.10.d1.lord')} ${house('house.10.d1.lord-house', 'oblique')} भाव में`)],
    ['D10 (Dashamsha) ascendant', sign('asc.d10.sign')],
    ['Atmakaraka / Amatyakaraka', `${planet('karaka.ak')} / ${planet('karaka.amk')}`],
    ['Saturn (karma karaka)', pick(lang, `${sign('planet.saturn.d1.sign')}, ${house('planet.saturn.d1.house')} house`, `${sign('planet.saturn.d1.sign')}, ${house('planet.saturn.d1.house')} भाव`)],
    ['Birth Mahadasha', planet('dasha.birth-lord')],
    ['Current Mahadasha / Antardasha', `${planet('dasha.current.md')} / ${planet('dasha.current.ad')}`],
  ];
  return {
    tex: kv(lang, rows),
    evidenceIds: ['asc.d1.sign', 'asc.d1.nakshatra', 'asc.d1.lord', 'planet.moon.d1.sign', 'planet.moon.d1.nakshatra', 'house.10.d1.sign',
      'house.10.d1.lord', 'house.10.d1.lord-house', 'asc.d10.sign', 'karaka.ak', 'karaka.amk', 'planet.saturn.d1.sign', 'planet.saturn.d1.house',
      'dasha.birth-lord', 'dasha.current.md', 'dasha.current.ad'],
  };
};

export const careerHousesTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const lang = blockLang(ctx);
  const { natal } = ctx.snapshot;
  const ids: string[] = [];
  const rows = CAREER_HOUSES.map((h) => {
    const house = natal.houses.find((x) => x.number === h)!;
    const lord = planetName(house.lord);
    const lp = natal.planets.find((p) => planetName(p.name) === lord)!;
    const occ = house.occupants.map((o) => planetName(o));
    ids.push(`house.${h}.d1.sign`, `house.${h}.d1.lord`, `house.${h}.d1.lord-house`, `house.${h}.d1.occupants`, `career.house.${h}.aspected-by`, `sav.house.${h}`);
    return [
      `\\textbf{${ordinalLabel(lang, h)}}\\newline{\\color{Muted}\\scriptsize ${tex(houseTheme(lang, h))}}`,
      tex(signLabel(lang, house.sign)),
      tex(`${planetLabel(lang, lord)} (${ordinalLabel(lang, lp.house)}, ${signLabel(lang, lp.sign)})`),
      tex(planetList(lang, occ) || '—'),
      tex(c.aspects[h].map((a) => `${planetLabel(lang, a.planet)} (${ordinalLabel(lang, a.aspect, 'feminine')})`).join(', ') || '—'),
      String(c.sav[h]),
    ];
  });
  return {
    tex: table('>{\\raggedright\\arraybackslash}p{0.2\\linewidth}>{\\raggedright\\arraybackslash}p{0.11\\linewidth}>{\\raggedright\\arraybackslash}p{0.2\\linewidth}>{\\raggedright\\arraybackslash}p{0.13\\linewidth}>{\\raggedright\\arraybackslash}X>{\\centering\\arraybackslash}p{0.05\\linewidth}',
      [...labels(lang, ['House', 'Sign', 'Lord (placed in)', 'Occupants', 'Aspected by']), pick(lang, 'SAV', 'बिंदु')], rows),
    evidenceIds: ids,
    method: label(lang, 'Whole-sign houses. Aspects are classical graha drishti (all planets 7th; Mars 4th/8th; Jupiter 5th/9th; Saturn 3rd/10th; Rahu/Ketu 5th/9th), shown with the aspect counted from the planet. SAV = Sarvashtakavarga bindus of the house sign.'),
  };
};

export const careerYogaTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const lang = blockLang(ctx);
  if (!c.yogas.length) {
    const none = label(lang, 'The calculation engine did not detect any of the classical raja, dhana, mahapurusha, solar or related career combinations in your chart. Career strength is then read from the houses, their lords, the D10 and the dashas, which the following sections cover in detail.');
    return {
      tex: `\\begin{asCard}{\\fontsize{9.5}{13.5}\\selectfont ${none}\\par}\\end{asCard}`,
      evidenceIds: ['career.yogas.relevant'],
      method: label(lang, 'Only yogas detected by the engine\'s rule set are listed; none are inferred.'),
    };
  }
  // Every detected yoga is listed (career-relevant families first) so that any yoga the narrative
  // names has a row here (audit F17). Conditions are the engine's observed relations (audit F7).
  const all = c.allYogas ?? c.yogas;
  // Hindi prints the same yogas and the same three conditions through their Hindi forms (career.hindi.ts).
  const rows = all.map((y) => [
    `\\textbf{${tex(lang === 'hi' ? yogaNameHi(y.name) : y.name)}}`,
    tex(lang === 'hi' ? yogaFamilyHi(y.category, y.relevant) : y.category.toLowerCase().replace(/_/g, ' ') + (y.relevant ? '' : ' (context)')),
    tex((lang === 'hi' ? y.conditions.slice(0, 3).map(yogaConditionHi) : y.conditions.slice(0, 3)).join('; ') || '—'),
  ]);
  return {
    tex: table('>{\\raggedright\\arraybackslash}p{0.27\\linewidth}>{\\raggedright\\arraybackslash}p{0.14\\linewidth}>{\\raggedright\\arraybackslash}X', labels(lang, ['Yoga', 'Family', 'How it is formed in your chart']), rows),
    evidenceIds: ['career.yogas.relevant', ...all.map((y) => y.evidenceId).filter((id) => ctx.registry.has(id))],
    method: label(lang, 'Yogas detected by the engine\'s classical rule set (BPHS, Phaladeepika conventions). Families classically tied to status, work and earnings come first; other detected yogas are marked "context". No yoga is added by hand, and a listed yoga indicates a potential, not a result.'),
  };
};

export const careerSunSaturnTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const r = ctx.registry;
  const lang = blockLang(ctx);
  const rows = [c.sun, c.saturn].map((f) => {
    const k = f.planet.toLowerCase();
    const d10Sign = ctx.snapshot.vargas.D10 ? signLabel(lang, c.d10.planets[f.planet].sign) : '';
    return [`\\textbf{${tex(planetLabel(lang, f.planet))}}`, tex(signLabel(lang, f.sign)), ordinalLabel(lang, f.house), ordinalLabel(lang, f.fromMoon), ordinalLabel(lang, f.fromTenth),
      tex(dignityText(lang, evidenceValue(r, `planet.${k}.d1.dignity`))),
      tex(`${d10Sign} (${pick(lang, 'D10 house', 'D10 भाव')} ${c.d10.planets[f.planet].house})`)];
  });
  return {
    tex: table('>{\\raggedright\\arraybackslash}p{0.1\\linewidth}>{\\raggedright\\arraybackslash}p{0.12\\linewidth}>{\\centering\\arraybackslash}p{0.1\\linewidth}>{\\centering\\arraybackslash}p{0.1\\linewidth}>{\\centering\\arraybackslash}p{0.1\\linewidth}>{\\raggedright\\arraybackslash}p{0.13\\linewidth}X',
      labels(lang, ['Planet', 'Sign', 'From Lagna', 'From Moon', 'From 10th', 'Dignity', 'In the D10']), rows),
    evidenceIds: ['planet.sun.d1.sign', 'planet.sun.d1.house', 'planet.sun.d1.dignity', 'planet.saturn.d1.sign', 'planet.saturn.d1.house', 'planet.saturn.d1.dignity',
      'career.sun.from-moon', 'career.sun.from-tenth', 'career.saturn.from-moon', 'career.saturn.from-tenth', 'planet.sun.d10.sign', 'planet.saturn.d10.sign', 'career.d10.sun.dignity', 'career.d10.saturn.dignity'],
    method: label(lang, 'Positions counted inclusively in whole signs from the Ascendant, from the Moon\'s sign and from the 10th house (bhavat bhavam: the 10th itself counts as 1st).'),
  };
};

export const careerKarakaTable: BlockRenderer = (ctx) => {
  const planets = ctx.snapshot.natal.planets.filter((p) => p.charaKaraka).sort((a, b) => b.degree - a.degree);
  const lang = blockLang(ctx);
  const karakaName = (code: string) => (lang === 'hi' ? careerTerm(KARAKA_NAMES_HI, code) : KARAKA_NAMES[code] ?? code);
  const karakaRole = (code: string) => (lang === 'hi' ? KARAKA_ROLE_HI[code] ?? '' : KARAKA_ROLE[code] ?? '');
  const ids: string[] = [];
  const rows = planets.map((p) => {
    const code = String(p.charaKaraka).toUpperCase();
    const name = planetName(p.name);
    ids.push(`karaka.${code.toLowerCase()}`, `planet.${name.toLowerCase()}.d1.degree`);
    const strong = code === 'AK' || code === 'AMK';
    const b = (s: string) => (strong ? `\\textbf{${s}}` : s);
    return [b(tex(karakaName(code))), b(tex(planetLabel(lang, name))), tex(`${p.degree.toFixed(2)}° ${signLabel(lang, p.sign)}`),
      tex(pick(lang, `${ordinal(p.house)} house`, `${ordinalLabel(lang, p.house)} भाव`)), tex(karakaRole(code))];
  });
  return {
    tex: table('>{\\raggedright\\arraybackslash}p{0.2\\linewidth}>{\\raggedright\\arraybackslash}p{0.12\\linewidth}>{\\raggedright\\arraybackslash}p{0.18\\linewidth}>{\\raggedright\\arraybackslash}p{0.12\\linewidth}X',
      labels(lang, ['Chara karaka', 'Planet', 'Degree in sign', 'Placed in', 'Signifies']), rows),
    evidenceIds: ids,
    method: label(lang, 'Jaimini seven-karaka scheme (Rahu excluded): planets ranked by degree within their sign, highest first. The Amatyakaraka (second highest) is the classical significator of career and counsel.'),
  };
};

export const careerD10Table: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const lang = blockLang(ctx);
  const ids: string[] = ['asc.d10.sign'];
  const dig = (p: string) => c.d10.planets[p as keyof typeof c.d10.planets].dignity;
  const short = (d: string) => (d === 'exalted' || d === 'debilitated' || d === 'own sign' ? (lang === 'hi' ? careerTerm(SIGN_DIGNITY_HI, d) : d) : '');
  const rows = c.d10.houses.map((h) => {
    ids.push(`career.d10.house.${h.house}.sign`, `career.d10.house.${h.house}.lord`, `career.d10.house.${h.house}.lord-house`, `career.d10.house.${h.house}.occupants`);
    for (const p of [h.lord, ...h.occupants]) {
      const id = `planet.${p.toLowerCase()}.d10.dignity`;
      if (ctx.registry.has(id) && !ids.includes(id)) ids.push(id);
    }
    const key = [1, 6, 7, 10, 11].includes(h.house);
    const b = (s: string) => (key ? `\\textbf{${s}}` : s);
    const occ = h.occupants.map((o) => (short(dig(o)) ? `${planetLabel(lang, o)} (${short(dig(o))})` : planetLabel(lang, o)));
    return [b(ordinalLabel(lang, h.house)), tex(signLabel(lang, h.sign)), tex(planetLabel(lang, h.lord)),
      tex(`${pick(lang, 'house', 'भाव')} ${h.lordHouse} (${signLabel(lang, h.lordSign)})`), tex(short(dig(h.lord)) || '—'), tex(occ.join(', ') || '—')];
  });
  return {
    tex: intro(label(lang, 'Every house of the Dashamsha (D10), the divisional chart of profession. Bold rows are the houses this report reads most closely for work.')) +
      table('>{\\raggedright\\arraybackslash}p{0.09\\linewidth}>{\\raggedright\\arraybackslash}p{0.14\\linewidth}>{\\raggedright\\arraybackslash}p{0.11\\linewidth}>{\\raggedright\\arraybackslash}p{0.2\\linewidth}>{\\raggedright\\arraybackslash}p{0.14\\linewidth}X',
        labels(lang, ['D10 house', 'Sign', 'Lord', 'Lord sits in', 'Lord\'s D10 dignity', 'Occupants']), rows),
    evidenceIds: ids,
    method: label(lang, 'D10 computed by the divisional-chart engine (Parashari Dashamsha); houses counted in whole signs from the D10 ascendant. D10 dignity is sign dignity only (exalted, debilitated or own sign; a dash means none of these) and is a different scale from the birth-chart compound dignity.'),
  };
};

export const careerBnnTable: BlockRenderer = (ctx) => {
  const b = careerExt(ctx.ext).bnn;
  const lang = blockLang(ctx);
  const list = (planets: string[]) => planetList(lang, planets) || pick(lang, 'none', 'कोई नहीं');
  /** "5th sign from Saturn (Leo)": the sign `n` signs from Saturn, counted inclusively. */
  const fromSaturn = (n: number, offset: number) => {
    const sign = signLabel(lang, SIGNS[(b.saturnSignIndex + offset) % 12]);
    return pick(lang, `${ordinal(n)} sign from Saturn (${sign})`, `शनि से ${ordinalLabel(lang, n, 'feminine')} राशि (${sign})`);
  };
  const rows: Array<[string, string]> = [
    [label(lang, 'Saturn (karma karaka)'), `${signLabel(lang, b.saturnSign)}${b.retrograde ? pick(lang, ', retrograde', ', वक्री') : ''}`],
    [label(lang, 'Same sign as Saturn (conjunction)'), list(b.conjunct)],
    [fromSaturn(5, 3), list(b.trine5)],
    [fromSaturn(9, 7), list(b.trine9)],
    [fromSaturn(2, 0), list(b.second)],
    [fromSaturn(12, 10), list(b.twelfth)],
    [label(lang, 'Saturn\'s 3rd / 7th / 10th aspects'), b.aspects.map((a) => `${signLabel(lang, a.sign)}${a.planets.length ? ` (${planetList(lang, a.planets)})` : ''}`).join(' / ')],
  ];
  return {
    tex: kvTable(rows, lang),
    evidenceIds: ['career.bnn.saturn.sign', 'career.bnn.conjunct', 'career.bnn.trine', 'career.bnn.second', 'career.bnn.twelfth', 'career.bnn.aspects', 'planet.saturn.d1.retrograde'],
    method: label(lang, 'Classical Bhrigu Nandi Nadi reading: Saturn as karma karaka, with the planets it is linked to by sign — the same sign, its trines (5th, 9th) and the signs immediately ahead (2nd) and behind (12th). Signs only; no degree-based chain is used.'),
  };
};

export const careerLordsTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const lang = blockLang(ctx);
  const { natal } = ctx.snapshot;
  const ids: string[] = [];
  const rows = [1, 6, 10, 11].map((h) => {
    const house = natal.houses.find((x) => x.number === h)!;
    const lord = planetName(house.lord);
    const lp = natal.planets.find((p) => planetName(p.name) === lord)!;
    const dh = c.d10.houses[h - 1];
    ids.push(`house.${h}.d1.lord`, `house.${h}.d1.lord-house`, `career.d10.house.${h}.lord`, `career.d10.house.${h}.lord-house`);
    return [`\\textbf{${ordinalLabel(lang, h)}}`,
      tex(pick(lang, `${lord}: ${ordinal(lp.house)} house, ${lp.sign}`, `${planetLabel(lang, lord)}: ${ordinalLabel(lang, lp.house)} भाव, ${signLabel(lang, lp.sign)}`)),
      tex(pick(lang, `${dh.lord}: D10 house ${dh.lordHouse}, ${dh.lordSign}`, `${planetLabel(lang, dh.lord)}: D10 भाव ${dh.lordHouse}, ${signLabel(lang, dh.lordSign)}`))];
  });
  return {
    tex: table('>{\\raggedright\\arraybackslash}p{0.1\\linewidth}XX', labels(lang, ['House', 'Lord in the birth chart (D1)', 'Lord in the career chart (D10)']), rows),
    evidenceIds: ids,
    method: label(lang, 'Lords of the self (1st), service (6th), profession (10th) and gains (11th), in the D1 and in the D10 (whole-sign houses from each chart\'s ascendant).'),
  };
};

export const careerGovTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const r = ctx.registry;
  const govYogas = c.yogas.filter((y) => /BUDHA_ADITYA|GAJAKESARI|VESI|VOSI|UBHAYACHARI|RAJA|DHARMA_KARMADHIPATI|AMALA/.test(y.id));
  const lang = blockLang(ctx);
  const sign = (id: string) => signLabel(lang, String(evidenceValue(r, id)));
  const house = (id: string, form: 'direct' | 'oblique' = 'direct') => ordinalLabel(lang, Number(evidenceValue(r, id)), form);
  const placed = (p: string) => pick(lang,
    `${sign(`planet.${p}.d1.sign`)}, ${house(`planet.${p}.d1.house`)} house; ${dignityText(lang, evidenceValue(r, `planet.${p}.d1.dignity`))}`,
    `${sign(`planet.${p}.d1.sign`)}, ${house(`planet.${p}.d1.house`)} भाव; ${dignityText(lang, evidenceValue(r, `planet.${p}.d1.dignity`))}`);
  const houseLord = (h: number) => pick(lang,
    `${sign(`house.${h}.d1.sign`)}, lord ${evidenceValue(r, `house.${h}.d1.lord`)} in the ${house(`house.${h}.d1.lord-house`)}`,
    `${sign(`house.${h}.d1.sign`)}, स्वामी ${planetLabel(lang, String(evidenceValue(r, `house.${h}.d1.lord`)))} ${house(`house.${h}.d1.lord-house`, 'oblique')} भाव में`);
  const links = (items: string[]) => (lang === 'hi' ? items.map(govLinkHi) : items).join('; ');
  const rows: Array<[string, string]> = [
    ['Sun (authority, state)', placed('sun')],
    ['Saturn (service, administration)', placed('saturn')],
    ['Sun–Saturn link', links(c.sunSaturn.links) || label(lang, 'no conjunction or aspect')],
    ['Sun and the 10th house', links(c.sunTenth) || label(lang, 'no direct link')],
    ['6th house (service)', houseLord(6)],
    ['10th house (office)', houseLord(10)],
    ['Related yogas detected', govYogas.map((y) => (lang === 'hi' ? yogaNameHi(y.name) : y.name)).join(', ') || label(lang, 'none detected')],
  ];
  return {
    tex: kv(lang, rows),
    evidenceIds: ['planet.sun.d1.sign', 'planet.sun.d1.house', 'planet.sun.d1.dignity', 'planet.saturn.d1.sign', 'planet.saturn.d1.house', 'planet.saturn.d1.dignity',
      'career.gov.sun-saturn', 'career.gov.sun-tenth', 'house.6.d1.sign', 'house.6.d1.lord', 'house.6.d1.lord-house', 'house.10.d1.sign', 'house.10.d1.lord', 'house.10.d1.lord-house', 'career.yogas.relevant'],
    method: label(lang, 'Classical significators of public service: the Sun (raja karaka, government) and Saturn (service, administration), the 6th (service) and 10th (office). Facts only; no score is computed.'),
  };
};

export const careerAshtakavargaTable: BlockRenderer = (ctx) => {
  const av = ctx.snapshot.ashtakavarga;
  const lang = blockLang(ctx);
  const ascIdx = ctx.snapshot.natal.ascendant.rashiIndex;
  const signs = Array.from({ length: 12 }, (_, i) => i + 1);
  // Hindi sign names are short enough to print whole; English keeps its three-letter forms.
  const head = [label(lang, 'Planet'), ...signs.map((s) => (lang === 'hi' ? signLabel(lang, SIGNS[s - 1]) : SIGNS[s - 1].slice(0, 3)))];
  const planetRows = (['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'] as const).map((k) => {
    const t = av.bav[k as keyof typeof av.bav];
    return [tex(planetLabel(lang, planetName(k))), ...signs.map((s) => String(t.signs[s]))];
  });
  const savRow = [`\\textbf{${pick(lang, 'SAV', 'कुल')}}`, ...signs.map((s) => `\\textbf{${av.sav.signs[s as keyof typeof av.sav.signs]}}`)];
  const houseRow = [`{\\color{Muted}${label(lang, 'House')}}`, ...signs.map((s) => `{\\color{Muted}${((s - ascIdx + 12) % 12) + 1}}`)];
  const spec = '>{\\raggedright\\arraybackslash}p{0.1\\linewidth}' + '>{\\centering\\arraybackslash}X'.repeat(12);
  return {
    tex: intro(label(lang, 'Bhinnashtakavarga (BAV) bindus of each planet in each sign, with the Sarvashtakavarga (SAV) total. The last row shows which house of your chart each sign is.')) +
      table(spec, head, [...planetRows, savRow, houseRow], '\\setlength{\\tabcolsep}{3pt}'),
    evidenceIds: Array.from({ length: 12 }, (_, i) => `sav.house.${i + 1}`),
    method: label(lang, 'Parashari Ashtakavarga (BPHS) computed by the engine; signs in zodiac order (Aries to Pisces).'),
  };
};

export const careerJobVsBusiness: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const lang = blockLang(ctx);
  const s = c.sav;
  const benchmark = (n: number) => (n > SAV_BENCHMARK ? pick(lang, 'above 28', '28 से अधिक') : n === SAV_BENCHMARK ? pick(lang, 'at 28', 'ठीक 28') : pick(lang, 'below 28', '28 से कम'));
  const rows = [6, 7, 10, 11].map((h) => [`\\textbf{${ordinalLabel(lang, h)}}`, tex(houseTheme(lang, h)), `\\textbf{${s[h]}}`, tex(benchmark(s[h]))]);
  const cmp = (a: number, b: number, an: string, bn: string) => (a === b ? `${an} and ${bn} are equal (${a} each)` : `${a > b ? an : bn} is higher (${Math.max(a, b)} against ${Math.min(a, b)})`);
  /** The same comparison in Hindi, for houses `ha` and `hb`. */
  const cmpHi = (a: number, b: number, ha: number, hb: number) => (a === b
    ? `${ordinalLabel(lang, ha)} और ${ordinalLabel(lang, hb)} भाव बराबर हैं (दोनों में ${a})`
    : `${ordinalLabel(lang, a > b ? ha : hb, 'oblique')} भाव के बिंदु अधिक हैं (${Math.max(a, b)}, दूसरे के ${Math.min(a, b)})`);
  const sentence = (a: number, b: number, ha: number, hb: number) => (lang === 'hi' ? `${tex(cmpHi(a, b, ha, hb))}।` : `${tex(cmp(a, b, ordinal(ha), ordinal(hb)))}.`);
  const box = `\\begin{asHighlight}\\CardTitle{${label(lang, 'The two comparisons')}}{\\fontsize{9.5}{13.5}\\selectfont
\\textbf{${label(lang, 'Service and partnership:')}} ${sentence(s[6], s[7], 6, 7)} ${label(lang, 'A stronger 6th leans towards employment, service and competitive roles; a stronger 7th leans towards trade, clients and partnership.')}\\par\\vspace{1mm}
\\textbf{${label(lang, 'Action and gains:')}} ${sentence(s[10], s[11], 10, 11)} ${label(lang, 'When the 11th exceeds the 10th, gains tend to come readily relative to effort; when the 10th leads, results follow steady, visible work.')}\\par}\\end{asHighlight}`;
  return {
    tex: table('>{\\raggedright\\arraybackslash}p{0.1\\linewidth}X>{\\centering\\arraybackslash}p{0.12\\linewidth}>{\\centering\\arraybackslash}p{0.16\\linewidth}', [...labels(lang, ['House', 'Signifies']), pick(lang, 'SAV', 'बिंदु'), label(lang, 'Benchmark')], rows) + '\n' + box,
    evidenceIds: ['career.sav.service-vs-partnership', 'career.sav.effort-vs-gain', 'career.sav.house.6.benchmark', 'career.sav.house.7.benchmark', 'career.sav.house.10.benchmark', 'career.sav.house.11.benchmark'],
    method: label(lang, 'Sarvashtakavarga bindus per house; 28 is the classical average (BPHS). The 6th/7th and 10th/11th comparisons are a widely used practitioner reading of Ashtakavarga, shown as tendencies, not verdicts.'),
  };
};

export const careerTransitTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const lang = blockLang(ctx);
  const duration = (startIso: string, endIso: string) => (lang === 'hi' ? durationHi(durationText(startIso, endIso)) : durationText(startIso, endIso));
  const from = (asc: number, moon: number) => `${ordinalLabel(lang, asc)} / ${ordinalLabel(lang, moon)}`;
  const ids: string[] = [];
  const rows: string[][] = [];
  for (const t of c.transits) {
    const k = t.planet.toLowerCase();
    ids.push(`career.transit.${k}.current`);
    const p = t.current;
    rows.push([`\\textbf{${tex(planetLabel(lang, t.planet))}}`, `\\textbf{${label(lang, 'Now')}}`, tex(signLabel(lang, p.sign)), tex(periodText(lang, p.startIso, p.endIso)), tex(duration(p.startIso, p.endIso)), from(p.fromAsc, p.fromMoon)]);
    t.upcoming.forEach((u, i) => {
      ids.push(`career.transit.${k}.next.${String(i + 1).padStart(2, '0')}`);
      const re = u.retrogradeEntry && k !== 'rahu' && k !== 'ketu' ? ` (${label(lang, 'R')})` : '';
      rows.push(['', label(lang, 'Next'), tex(signLabel(lang, u.sign) + re), tex(periodText(lang, u.startIso, u.endIso)), tex(duration(u.startIso, u.endIso)), from(u.fromAsc, u.fromMoon)]);
    });
  }
  return {
    tex: intro(label(lang, 'The four slow-moving planets that shape the longer seasons of a career. "From Lagna / Moon" shows which house of your chart the transit sign is, counted from the Ascendant and from the Moon.')) +
      table('>{\\raggedright\\arraybackslash}p{0.1\\linewidth}>{\\raggedright\\arraybackslash}p{0.07\\linewidth}>{\\raggedright\\arraybackslash}p{0.15\\linewidth}>{\\raggedright\\arraybackslash}X>{\\raggedright\\arraybackslash}p{0.17\\linewidth}>{\\centering\\arraybackslash}p{0.12\\linewidth}',
        labels(lang, ['Planet', '', 'Sign', 'Period', 'Duration', 'From Lagna / Moon']), rows),
    evidenceIds: ids,
    method: label(lang, 'Actual sign-ingress dates from the transit ingress solver (sidereal, Lahiri; mean nodes for Rahu and Ketu). (R) marks a retrograde re-entry into the previous sign. Dates are UTC.'),
  };
};

export const careerDashaTimeline: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const lang = blockLang(ctx);
  const now = pick(lang, ' (now)', ' (अभी)');
  const ids: string[] = [];
  const birthYear = Number(ctx.snapshot.subject.dateOfBirth.slice(0, 4));
  const rows = c.dashas.map((d, i) => {
    ids.push(`career.dasha.md.${String(i + 1).padStart(2, '0')}.links`, `dasha.md.${String(i + 1).padStart(2, '0')}`);
    const b = (s: string) => (d.active ? `\\textbf{${s}}` : s);
    const ages = `${Math.max(0, Number(d.startIso.slice(0, 4)) - birthYear)}–${Number(d.endIso.slice(0, 4)) - birthYear}`;
    return [b(tex(planetLabel(lang, d.lord) + (d.active ? now : ''))), b(tex(periodText(lang, d.startIso, d.endIso))), tex(ages),
      tex(d.rules.map((h) => ordinalLabel(lang, h)).join(', ') || '—'), tex(`${ordinalLabel(lang, d.house)} / ${d.d10House}`), tex(careerLinks(lang, d.careerLinks))];
  });
  return {
    tex: intro(label(lang, 'Your Vimshottari Mahadashas with the facts that connect each period lord to work: the houses it rules, where it sits in the birth chart and in the D10, and its direct links to the career houses (2nd, 6th, 10th, 11th).')) +
      table('>{\\raggedright\\arraybackslash}p{0.13\\linewidth}>{\\raggedright\\arraybackslash}p{0.21\\linewidth}>{\\centering\\arraybackslash}p{0.07\\linewidth}>{\\raggedright\\arraybackslash}p{0.1\\linewidth}>{\\centering\\arraybackslash}p{0.1\\linewidth}X',
        labels(lang, ['Mahadasha', 'Period', 'Age', 'Rules', 'D1 / D10 house', 'Career links']), rows, '\\setlength{\\tabcolsep}{4pt}'),
    evidenceIds: ids,
    method: label(lang, 'Vimshottari dasha from the Moon\'s nakshatra (engine). Ages are approximate calendar years. Career links are listed facts, not a score.'),
  };
};

export const careerAntardashaTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const lang = blockLang(ctx);
  const md = planetLabel(lang, String(evidenceValue(ctx.registry, 'dasha.current.md')));
  const now = pick(lang, ' (now)', ' (अभी)');
  const ids: string[] = ['dasha.current.md'];
  const rows = c.antardashas.map((a, i) => {
    ids.push(`career.dasha.ad.${String(i + 1).padStart(2, '0')}`);
    const b = (s: string) => (a.active ? `\\textbf{${s}}` : s);
    const links = careerExtLinks(ctx, a.lord);
    return [b(tex(`${md}–${planetLabel(lang, a.lord)}${a.active ? now : ''}`)), b(tex(periodText(lang, a.startIso, a.endIso))), tex(links)];
  });
  return {
    tex: table('>{\\raggedright\\arraybackslash}p{0.24\\linewidth}>{\\raggedright\\arraybackslash}p{0.3\\linewidth}X', labels(lang, ['Antardasha', 'Period', 'Sub-lord\'s career links']), rows),
    evidenceIds: ids,
    method: label(lang, 'Antardashas (sub-periods) of the running Mahadasha, Vimshottari proportions.'),
  };
};

function careerExtLinks(ctx: BlockContext, lord: string): string {
  const d = careerExt(ctx.ext).dashas.find((x) => x.lord === lord);
  return careerLinks(blockLang(ctx), d?.careerLinks ?? []);
}

export const careerKarmajivaTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const lang = blockLang(ctx);
  const from = (f: string) => (lang === 'hi' ? careerTerm(KARMAJIVA_FROM_HI, f) : f);
  const rows = c.karmajiva.map((k) => [`\\textbf{${tex(from(k.from))}}`, tex(signLabel(lang, k.tenthSign)), tex(planetLabel(lang, k.tenthLord)), tex(signLabel(lang, k.lordNavamsaSign)), `\\textbf{${tex(planetLabel(lang, k.karmajivaPlanet))}}`]);
  const r = ctx.registry;
  const q = (id: string) => (evidenceValue(r, id) as string[]).map((x) => (lang === 'hi' ? careerTerm(SIGN_QUALITY_HI, x) : x)).join(', ');
  return {
    tex: intro(label(lang, 'Varahamihira\'s Karmajiva rule reads the source of livelihood from the Navamsa sign occupied by the lord of the 10th, counted from the Lagna, the Moon and the Sun. The lord of that Navamsa sign is the planet whose nature colours how you earn.')) +
      table('>{\\raggedright\\arraybackslash}p{0.13\\linewidth}>{\\raggedright\\arraybackslash}p{0.17\\linewidth}>{\\raggedright\\arraybackslash}p{0.15\\linewidth}>{\\raggedright\\arraybackslash}X>{\\raggedright\\arraybackslash}p{0.2\\linewidth}',
        labels(lang, ['Counted from', '10th sign', 'Its lord', 'Lord\'s Navamsa sign', 'Livelihood planet']), rows) +
      kv(lang, [
        ['10th house sign quality', q('career.vocation.house10.quality')],
        ['10th lord\'s sign quality', q('career.vocation.lord10.quality')],
        ['D10 ascendant quality', q('career.d10.asc.quality')],
      ]),
    evidenceIds: ['career.karmajiva.lagna', 'career.karmajiva.moon', 'career.karmajiva.sun', 'career.vocation.house10.quality', 'career.vocation.lord10.quality', 'career.d10.asc.quality'],
    method: label(lang, 'Brihat Jataka ch. 10 (Karmajiva), using the engine\'s D9. All three reference points are shown; the text does not pick one by an invented strength score. Element and modality are the standard sign qualities.'),
  };
};

export const CAREER_BLOCKS: Record<string, BlockRenderer> = {
  'career-astral-details': careerAstralDetails,
  'career-houses': careerHousesTable,
  'career-yogas': careerYogaTable,
  'career-sun-saturn': careerSunSaturnTable,
  'career-karakas': careerKarakaTable,
  'career-d10-houses': careerD10Table,
  'career-bnn': careerBnnTable,
  'career-lords': careerLordsTable,
  'career-government': careerGovTable,
  'career-ashtakavarga': careerAshtakavargaTable,
  'career-job-vs-business': careerJobVsBusiness,
  'career-transits': careerTransitTable,
  'career-dasha-timeline': careerDashaTimeline,
  'career-antardashas': careerAntardashaTable,
  'career-karmajiva': careerKarmajivaTable,
};

