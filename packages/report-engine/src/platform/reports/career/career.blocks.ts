/**
 * Career report — deterministic LaTeX blocks (provenance `deterministic`).
 * All values come from the snapshot, the evidence registry or the career
 * `extend` output; all dynamic text passes through `tex()`.
 */
import { BlockContext, BlockRenderer, evidenceValue, kvTable } from '../../render/blocks';
import { ordinal, planetName, SIGNS } from '../../evidence/evidence-registry';
import { tex } from '../../render/latex';
import { formatBusinessDate } from '../../snapshot/chart-snapshot';
import { CAREER_HOUSES, careerExt, durationText, SAV_BENCHMARK } from './calc/career-calc';

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
  const v = (id: string) => String(evidenceValue(r, id));
  const amk = v('karaka.amk');
  const ak = v('karaka.ak');
  const rows: Array<[string, string]> = [
    ['Ascendant (Lagna)', `${v('asc.d1.sign')} (${v('asc.d1.nakshatra')} nakshatra), lord ${v('asc.d1.lord')}`],
    ['Moon sign and nakshatra', `${v('planet.moon.d1.sign')}, ${v('planet.moon.d1.nakshatra')}`],
    ['10th house (profession)', `${v('house.10.d1.sign')}, lord ${v('house.10.d1.lord')} in the ${ordinal(Number(v('house.10.d1.lord-house')))} house`],
    ['D10 (Dashamsha) ascendant', v('asc.d10.sign')],
    ['Atmakaraka / Amatyakaraka', `${ak} / ${amk}`],
    ['Saturn (karma karaka)', `${v('planet.saturn.d1.sign')}, ${ordinal(Number(v('planet.saturn.d1.house')))} house`],
    ['Birth Mahadasha', v('dasha.birth-lord')],
    ['Current Mahadasha / Antardasha', `${v('dasha.current.md')} / ${v('dasha.current.ad')}`],
  ];
  return {
    tex: kvTable(rows),
    evidenceIds: ['asc.d1.sign', 'asc.d1.nakshatra', 'asc.d1.lord', 'planet.moon.d1.sign', 'planet.moon.d1.nakshatra', 'house.10.d1.sign',
      'house.10.d1.lord', 'house.10.d1.lord-house', 'asc.d10.sign', 'karaka.ak', 'karaka.amk', 'planet.saturn.d1.sign', 'planet.saturn.d1.house',
      'dasha.birth-lord', 'dasha.current.md', 'dasha.current.ad'],
  };
};

export const careerHousesTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const { natal } = ctx.snapshot;
  const ids: string[] = [];
  const rows = CAREER_HOUSES.map((h) => {
    const house = natal.houses.find((x) => x.number === h)!;
    const lord = planetName(house.lord);
    const lp = natal.planets.find((p) => planetName(p.name) === lord)!;
    const occ = house.occupants.map((o) => planetName(o));
    ids.push(`house.${h}.d1.sign`, `house.${h}.d1.lord`, `house.${h}.d1.lord-house`, `house.${h}.d1.occupants`, `career.house.${h}.aspected-by`, `sav.house.${h}`);
    return [
      `\\textbf{${ordinal(h)}}\\newline{\\color{Muted}\\scriptsize ${tex(HOUSE_THEME[h])}}`,
      tex(house.sign),
      tex(`${lord} (${ordinal(lp.house)}, ${lp.sign})`),
      tex(occ.join(', ') || '—'),
      tex(c.aspects[h].map((a) => `${a.planet} (${ordinal(a.aspect)})`).join(', ') || '—'),
      String(c.sav[h]),
    ];
  });
  return {
    tex: table('>{\\raggedright\\arraybackslash}p{0.2\\linewidth}>{\\raggedright\\arraybackslash}p{0.11\\linewidth}>{\\raggedright\\arraybackslash}p{0.2\\linewidth}>{\\raggedright\\arraybackslash}p{0.13\\linewidth}>{\\raggedright\\arraybackslash}X>{\\centering\\arraybackslash}p{0.05\\linewidth}',
      ['House', 'Sign', 'Lord (placed in)', 'Occupants', 'Aspected by', 'SAV'], rows),
    evidenceIds: ids,
    method: 'Whole-sign houses. Aspects are classical graha drishti (all planets 7th; Mars 4th/8th; Jupiter 5th/9th; Saturn 3rd/10th; Rahu/Ketu 5th/9th), shown with the aspect counted from the planet. SAV = Sarvashtakavarga bindus of the house sign.',
  };
};

export const careerYogaTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  if (!c.yogas.length) {
    return {
      tex: '\\begin{asCard}{\\fontsize{9.5}{13.5}\\selectfont The calculation engine did not detect any of the classical raja, dhana, mahapurusha, solar or related career combinations in your chart. Career strength is then read from the houses, their lords, the D10 and the dashas, which the following sections cover in detail.\\par}\\end{asCard}',
      evidenceIds: ['career.yogas.relevant'],
      method: 'Only yogas detected by the engine\'s rule set are listed; none are inferred.',
    };
  }
  // Every detected yoga is listed (career-relevant families first) so that any yoga the narrative
  // names has a row here (audit F17). Conditions are the engine's observed relations (audit F7).
  const all = c.allYogas ?? c.yogas;
  const rows = all.map((y) => [
    `\\textbf{${tex(y.name)}}`,
    tex(y.category.toLowerCase().replace(/_/g, ' ') + (y.relevant ? '' : ' (context)')),
    tex(y.conditions.slice(0, 3).join('; ') || '—'),
  ]);
  return {
    tex: table('>{\\raggedright\\arraybackslash}p{0.27\\linewidth}>{\\raggedright\\arraybackslash}p{0.14\\linewidth}>{\\raggedright\\arraybackslash}X', ['Yoga', 'Family', 'How it is formed in your chart'], rows),
    evidenceIds: ['career.yogas.relevant', ...all.map((y) => y.evidenceId).filter((id) => ctx.registry.has(id))],
    method: 'Yogas detected by the engine\'s classical rule set (BPHS, Phaladeepika conventions). Families classically tied to status, work and earnings come first; other detected yogas are marked "context". No yoga is added by hand, and a listed yoga indicates a potential, not a result.',
  };
};

export const careerSunSaturnTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const r = ctx.registry;
  const rows = [c.sun, c.saturn].map((f) => {
    const k = f.planet.toLowerCase();
    return [`\\textbf{${f.planet}}`, tex(f.sign), ordinal(f.house), ordinal(f.fromMoon), ordinal(f.fromTenth), tex(String(evidenceValue(r, `planet.${k}.d1.dignity`)).toLowerCase().replace(/_/g, ' ')),
      tex(`${ctx.snapshot.vargas.D10 ? c.d10.planets[f.planet].sign : ''} (D10 house ${c.d10.planets[f.planet].house})`)];
  });
  return {
    tex: table('>{\\raggedright\\arraybackslash}p{0.1\\linewidth}>{\\raggedright\\arraybackslash}p{0.12\\linewidth}>{\\centering\\arraybackslash}p{0.1\\linewidth}>{\\centering\\arraybackslash}p{0.1\\linewidth}>{\\centering\\arraybackslash}p{0.1\\linewidth}>{\\raggedright\\arraybackslash}p{0.13\\linewidth}X',
      ['Planet', 'Sign', 'From Lagna', 'From Moon', 'From 10th', 'Dignity', 'In the D10'], rows),
    evidenceIds: ['planet.sun.d1.sign', 'planet.sun.d1.house', 'planet.sun.d1.dignity', 'planet.saturn.d1.sign', 'planet.saturn.d1.house', 'planet.saturn.d1.dignity',
      'career.sun.from-moon', 'career.sun.from-tenth', 'career.saturn.from-moon', 'career.saturn.from-tenth', 'planet.sun.d10.sign', 'planet.saturn.d10.sign', 'career.d10.sun.dignity', 'career.d10.saturn.dignity'],
    method: 'Positions counted inclusively in whole signs from the Ascendant, from the Moon\'s sign and from the 10th house (bhavat bhavam: the 10th itself counts as 1st).',
  };
};

export const careerKarakaTable: BlockRenderer = (ctx) => {
  const planets = ctx.snapshot.natal.planets.filter((p) => p.charaKaraka).sort((a, b) => b.degree - a.degree);
  const ids: string[] = [];
  const rows = planets.map((p) => {
    const code = String(p.charaKaraka).toUpperCase();
    const name = planetName(p.name);
    ids.push(`karaka.${code.toLowerCase()}`, `planet.${name.toLowerCase()}.d1.degree`);
    const strong = code === 'AK' || code === 'AMK';
    const b = (s: string) => (strong ? `\\textbf{${s}}` : s);
    return [b(tex(KARAKA_NAMES[code] ?? code)), b(tex(name)), tex(`${p.degree.toFixed(2)}° ${p.sign}`), tex(`${ordinal(p.house)} house`), tex(KARAKA_ROLE[code] ?? '')];
  });
  return {
    tex: table('>{\\raggedright\\arraybackslash}p{0.2\\linewidth}>{\\raggedright\\arraybackslash}p{0.12\\linewidth}>{\\raggedright\\arraybackslash}p{0.18\\linewidth}>{\\raggedright\\arraybackslash}p{0.12\\linewidth}X',
      ['Chara karaka', 'Planet', 'Degree in sign', 'Placed in', 'Signifies'], rows),
    evidenceIds: ids,
    method: 'Jaimini seven-karaka scheme (Rahu excluded): planets ranked by degree within their sign, highest first. The Amatyakaraka (second highest) is the classical significator of career and counsel.',
  };
};

export const careerD10Table: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const ids: string[] = ['asc.d10.sign'];
  const dig = (p: string) => c.d10.planets[p as keyof typeof c.d10.planets].dignity;
  const short = (d: string) => (d === 'exalted' || d === 'debilitated' || d === 'own sign' ? d : '');
  const rows = c.d10.houses.map((h) => {
    ids.push(`career.d10.house.${h.house}.sign`, `career.d10.house.${h.house}.lord`, `career.d10.house.${h.house}.lord-house`, `career.d10.house.${h.house}.occupants`);
    for (const p of [h.lord, ...h.occupants]) {
      const id = `planet.${p.toLowerCase()}.d10.dignity`;
      if (ctx.registry.has(id) && !ids.includes(id)) ids.push(id);
    }
    const key = [1, 6, 7, 10, 11].includes(h.house);
    const b = (s: string) => (key ? `\\textbf{${s}}` : s);
    const occ = h.occupants.map((o) => (short(dig(o)) ? `${o} (${short(dig(o))})` : o));
    return [b(ordinal(h.house)), tex(h.sign), tex(h.lord), tex(`house ${h.lordHouse} (${h.lordSign})`), tex(short(dig(h.lord)) || '—'), tex(occ.join(', ') || '—')];
  });
  return {
    tex: intro('Every house of the Dashamsha (D10), the divisional chart of profession. Bold rows are the houses this report reads most closely for work.') +
      table('>{\\raggedright\\arraybackslash}p{0.09\\linewidth}>{\\raggedright\\arraybackslash}p{0.14\\linewidth}>{\\raggedright\\arraybackslash}p{0.11\\linewidth}>{\\raggedright\\arraybackslash}p{0.2\\linewidth}>{\\raggedright\\arraybackslash}p{0.14\\linewidth}X',
        ['D10 house', 'Sign', 'Lord', 'Lord sits in', 'Lord\'s D10 dignity', 'Occupants'], rows),
    evidenceIds: ids,
    method: 'D10 computed by the divisional-chart engine (Parashari Dashamsha); houses counted in whole signs from the D10 ascendant. D10 dignity is sign dignity only (exalted, debilitated or own sign; a dash means none of these) and is a different scale from the birth-chart compound dignity.',
  };
};

export const careerBnnTable: BlockRenderer = (ctx) => {
  const b = careerExt(ctx.ext).bnn;
  const rows: Array<[string, string]> = [
    ['Saturn (karma karaka)', `${b.saturnSign}${b.retrograde ? ', retrograde' : ''}`],
    ['Same sign as Saturn (conjunction)', b.conjunct.join(', ') || 'none'],
    [`5th sign from Saturn (${SIGNS[(b.saturnSignIndex + 3) % 12]})`, b.trine5.join(', ') || 'none'],
    [`9th sign from Saturn (${SIGNS[(b.saturnSignIndex + 7) % 12]})`, b.trine9.join(', ') || 'none'],
    [`2nd sign from Saturn (${SIGNS[b.saturnSignIndex % 12]})`, b.second.join(', ') || 'none'],
    [`12th sign from Saturn (${SIGNS[(b.saturnSignIndex + 10) % 12]})`, b.twelfth.join(', ') || 'none'],
    ['Saturn\'s 3rd / 7th / 10th aspects', b.aspects.map((a) => `${a.sign}${a.planets.length ? ` (${a.planets.join(', ')})` : ''}`).join(' / ')],
  ];
  return {
    tex: kvTable(rows),
    evidenceIds: ['career.bnn.saturn.sign', 'career.bnn.conjunct', 'career.bnn.trine', 'career.bnn.second', 'career.bnn.twelfth', 'career.bnn.aspects', 'planet.saturn.d1.retrograde'],
    method: 'Classical Bhrigu Nandi Nadi reading: Saturn as karma karaka, with the planets it is linked to by sign — the same sign, its trines (5th, 9th) and the signs immediately ahead (2nd) and behind (12th). Signs only; no degree-based chain is used.',
  };
};

export const careerLordsTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const { natal } = ctx.snapshot;
  const ids: string[] = [];
  const rows = [1, 6, 10, 11].map((h) => {
    const house = natal.houses.find((x) => x.number === h)!;
    const lord = planetName(house.lord);
    const lp = natal.planets.find((p) => planetName(p.name) === lord)!;
    const dh = c.d10.houses[h - 1];
    ids.push(`house.${h}.d1.lord`, `house.${h}.d1.lord-house`, `career.d10.house.${h}.lord`, `career.d10.house.${h}.lord-house`);
    return [`\\textbf{${ordinal(h)}}`, tex(`${lord}: ${ordinal(lp.house)} house, ${lp.sign}`), tex(`${dh.lord}: D10 house ${dh.lordHouse}, ${dh.lordSign}`)];
  });
  return {
    tex: table('>{\\raggedright\\arraybackslash}p{0.1\\linewidth}XX', ['House', 'Lord in the birth chart (D1)', 'Lord in the career chart (D10)'], rows),
    evidenceIds: ids,
    method: 'Lords of the self (1st), service (6th), profession (10th) and gains (11th), in the D1 and in the D10 (whole-sign houses from each chart\'s ascendant).',
  };
};

export const careerGovTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const r = ctx.registry;
  const govYogas = c.yogas.filter((y) => /BUDHA_ADITYA|GAJAKESARI|VESI|VOSI|UBHAYACHARI|RAJA|DHARMA_KARMADHIPATI|AMALA/.test(y.id));
  const rows: Array<[string, string]> = [
    ['Sun (authority, state)', `${evidenceValue(r, 'planet.sun.d1.sign')}, ${ordinal(Number(evidenceValue(r, 'planet.sun.d1.house')))} house; ${String(evidenceValue(r, 'planet.sun.d1.dignity')).toLowerCase().replace(/_/g, ' ')}`],
    ['Saturn (service, administration)', `${evidenceValue(r, 'planet.saturn.d1.sign')}, ${ordinal(Number(evidenceValue(r, 'planet.saturn.d1.house')))} house; ${String(evidenceValue(r, 'planet.saturn.d1.dignity')).toLowerCase().replace(/_/g, ' ')}`],
    ['Sun–Saturn link', c.sunSaturn.links.join('; ') || 'no conjunction or aspect'],
    ['Sun and the 10th house', c.sunTenth.join('; ') || 'no direct link'],
    ['6th house (service)', `${evidenceValue(r, 'house.6.d1.sign')}, lord ${evidenceValue(r, 'house.6.d1.lord')} in the ${ordinal(Number(evidenceValue(r, 'house.6.d1.lord-house')))}`],
    ['10th house (office)', `${evidenceValue(r, 'house.10.d1.sign')}, lord ${evidenceValue(r, 'house.10.d1.lord')} in the ${ordinal(Number(evidenceValue(r, 'house.10.d1.lord-house')))}`],
    ['Related yogas detected', govYogas.map((y) => y.name).join(', ') || 'none detected'],
  ];
  return {
    tex: kvTable(rows),
    evidenceIds: ['planet.sun.d1.sign', 'planet.sun.d1.house', 'planet.sun.d1.dignity', 'planet.saturn.d1.sign', 'planet.saturn.d1.house', 'planet.saturn.d1.dignity',
      'career.gov.sun-saturn', 'career.gov.sun-tenth', 'house.6.d1.sign', 'house.6.d1.lord', 'house.6.d1.lord-house', 'house.10.d1.sign', 'house.10.d1.lord', 'house.10.d1.lord-house', 'career.yogas.relevant'],
    method: 'Classical significators of public service: the Sun (raja karaka, government) and Saturn (service, administration), the 6th (service) and 10th (office). Facts only; no score is computed.',
  };
};

export const careerAshtakavargaTable: BlockRenderer = (ctx) => {
  const av = ctx.snapshot.ashtakavarga;
  const ascIdx = ctx.snapshot.natal.ascendant.rashiIndex;
  const signs = Array.from({ length: 12 }, (_, i) => i + 1);
  const head = ['Planet', ...signs.map((s) => SIGNS[s - 1].slice(0, 3))];
  const planetRows = (['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'] as const).map((k) => {
    const t = av.bav[k as keyof typeof av.bav];
    return [tex(planetName(k)), ...signs.map((s) => String(t.signs[s]))];
  });
  const savRow = ['\\textbf{SAV}', ...signs.map((s) => `\\textbf{${av.sav.signs[s as keyof typeof av.sav.signs]}}`)];
  const houseRow = ['{\\color{Muted}House}', ...signs.map((s) => `{\\color{Muted}${((s - ascIdx + 12) % 12) + 1}}`)];
  const spec = '>{\\raggedright\\arraybackslash}p{0.1\\linewidth}' + '>{\\centering\\arraybackslash}X'.repeat(12);
  return {
    tex: intro('Bhinnashtakavarga (BAV) bindus of each planet in each sign, with the Sarvashtakavarga (SAV) total. The last row shows which house of your chart each sign is.') +
      table(spec, head, [...planetRows, savRow, houseRow], '\\setlength{\\tabcolsep}{3pt}'),
    evidenceIds: Array.from({ length: 12 }, (_, i) => `sav.house.${i + 1}`),
    method: 'Parashari Ashtakavarga (BPHS) computed by the engine; signs in zodiac order (Aries to Pisces).',
  };
};

export const careerJobVsBusiness: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const s = c.sav;
  const rows = [6, 7, 10, 11].map((h) => [`\\textbf{${ordinal(h)}}`, tex(HOUSE_THEME[h]), `\\textbf{${s[h]}}`, tex(s[h] > SAV_BENCHMARK ? 'above 28' : s[h] === SAV_BENCHMARK ? 'at 28' : 'below 28')]);
  const cmp = (a: number, b: number, an: string, bn: string) => (a === b ? `${an} and ${bn} are equal (${a} each)` : `${a > b ? an : bn} is higher (${Math.max(a, b)} against ${Math.min(a, b)})`);
  const box = `\\begin{asHighlight}\\CardTitle{The two comparisons}{\\fontsize{9.5}{13.5}\\selectfont
\\textbf{Service and partnership:} ${tex(cmp(s[6], s[7], '6th', '7th'))}. A stronger 6th leans towards employment, service and competitive roles; a stronger 7th leans towards trade, clients and partnership.\\par\\vspace{1mm}
\\textbf{Action and gains:} ${tex(cmp(s[10], s[11], '10th', '11th'))}. When the 11th exceeds the 10th, gains tend to come readily relative to effort; when the 10th leads, results follow steady, visible work.\\par}\\end{asHighlight}`;
  return {
    tex: table('>{\\raggedright\\arraybackslash}p{0.1\\linewidth}X>{\\centering\\arraybackslash}p{0.12\\linewidth}>{\\centering\\arraybackslash}p{0.16\\linewidth}', ['House', 'Signifies', 'SAV', 'Benchmark'], rows) + '\n' + box,
    evidenceIds: ['career.sav.service-vs-partnership', 'career.sav.effort-vs-gain', 'career.sav.house.6.benchmark', 'career.sav.house.7.benchmark', 'career.sav.house.10.benchmark', 'career.sav.house.11.benchmark'],
    method: 'Sarvashtakavarga bindus per house; 28 is the classical average (BPHS). The 6th/7th and 10th/11th comparisons are a widely used practitioner reading of Ashtakavarga, shown as tendencies, not verdicts.',
  };
};

export const careerTransitTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const ids: string[] = [];
  const rows: string[][] = [];
  for (const t of c.transits) {
    const k = t.planet.toLowerCase();
    ids.push(`career.transit.${k}.current`);
    const p = t.current;
    rows.push([`\\textbf{${t.planet}}`, `\\textbf{Now}`, tex(p.sign), tex(`${formatBusinessDate(p.startIso)} -- ${formatBusinessDate(p.endIso)}`), tex(durationText(p.startIso, p.endIso)), `${ordinal(p.fromAsc)} / ${ordinal(p.fromMoon)}`]);
    t.upcoming.forEach((u, i) => {
      ids.push(`career.transit.${k}.next.${String(i + 1).padStart(2, '0')}`);
      const re = u.retrogradeEntry && k !== 'rahu' && k !== 'ketu' ? ' (R)' : '';
      rows.push(['', 'Next', tex(u.sign + re), tex(`${formatBusinessDate(u.startIso)} -- ${formatBusinessDate(u.endIso)}`), tex(durationText(u.startIso, u.endIso)), `${ordinal(u.fromAsc)} / ${ordinal(u.fromMoon)}`]);
    });
  }
  return {
    tex: intro('The four slow-moving planets that shape the longer seasons of a career. "From Lagna / Moon" shows which house of your chart the transit sign is, counted from the Ascendant and from the Moon.') +
      table('>{\\raggedright\\arraybackslash}p{0.1\\linewidth}>{\\raggedright\\arraybackslash}p{0.07\\linewidth}>{\\raggedright\\arraybackslash}p{0.15\\linewidth}>{\\raggedright\\arraybackslash}X>{\\raggedright\\arraybackslash}p{0.17\\linewidth}>{\\centering\\arraybackslash}p{0.12\\linewidth}',
        ['Planet', '', 'Sign', 'Period', 'Duration', 'From Lagna / Moon'], rows),
    evidenceIds: ids,
    method: 'Actual sign-ingress dates from the transit ingress solver (sidereal, Lahiri; mean nodes for Rahu and Ketu). (R) marks a retrograde re-entry into the previous sign. Dates are UTC.',
  };
};

export const careerDashaTimeline: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const ids: string[] = [];
  const birthYear = Number(ctx.snapshot.subject.dateOfBirth.slice(0, 4));
  const rows = c.dashas.map((d, i) => {
    ids.push(`career.dasha.md.${String(i + 1).padStart(2, '0')}.links`, `dasha.md.${String(i + 1).padStart(2, '0')}`);
    const b = (s: string) => (d.active ? `\\textbf{${s}}` : s);
    const ages = `${Math.max(0, Number(d.startIso.slice(0, 4)) - birthYear)}–${Number(d.endIso.slice(0, 4)) - birthYear}`;
    return [b(tex(d.lord + (d.active ? ' (now)' : ''))), b(tex(`${formatBusinessDate(d.startIso)} -- ${formatBusinessDate(d.endIso)}`)), tex(ages),
      tex(d.rules.map(ordinal).join(', ') || '—'), tex(`${ordinal(d.house)} / ${d.d10House}`), tex(d.careerLinks.join('; ') || '—')];
  });
  return {
    tex: intro('Your Vimshottari Mahadashas with the facts that connect each period lord to work: the houses it rules, where it sits in the birth chart and in the D10, and its direct links to the career houses (2nd, 6th, 10th, 11th).') +
      table('>{\\raggedright\\arraybackslash}p{0.13\\linewidth}>{\\raggedright\\arraybackslash}p{0.21\\linewidth}>{\\centering\\arraybackslash}p{0.07\\linewidth}>{\\raggedright\\arraybackslash}p{0.1\\linewidth}>{\\centering\\arraybackslash}p{0.1\\linewidth}X',
        ['Mahadasha', 'Period', 'Age', 'Rules', 'D1 / D10 house', 'Career links'], rows, '\\setlength{\\tabcolsep}{4pt}'),
    evidenceIds: ids,
    method: 'Vimshottari dasha from the Moon\'s nakshatra (engine). Ages are approximate calendar years. Career links are listed facts, not a score.',
  };
};

export const careerAntardashaTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const md = String(evidenceValue(ctx.registry, 'dasha.current.md'));
  const ids: string[] = ['dasha.current.md'];
  const rows = c.antardashas.map((a, i) => {
    ids.push(`career.dasha.ad.${String(i + 1).padStart(2, '0')}`);
    const b = (s: string) => (a.active ? `\\textbf{${s}}` : s);
    const links = careerExtLinks(ctx, a.lord);
    return [b(tex(`${md}–${a.lord}${a.active ? ' (now)' : ''}`)), b(tex(`${formatBusinessDate(a.startIso)} -- ${formatBusinessDate(a.endIso)}`)), tex(links)];
  });
  return {
    tex: table('>{\\raggedright\\arraybackslash}p{0.24\\linewidth}>{\\raggedright\\arraybackslash}p{0.3\\linewidth}X', ['Antardasha', 'Period', 'Sub-lord\'s career links'], rows),
    evidenceIds: ids,
    method: 'Antardashas (sub-periods) of the running Mahadasha, Vimshottari proportions.',
  };
};

function careerExtLinks(ctx: BlockContext, lord: string): string {
  const d = careerExt(ctx.ext).dashas.find((x) => x.lord === lord);
  return d?.careerLinks.join('; ') || '—';
}

export const careerKarmajivaTable: BlockRenderer = (ctx) => {
  const c = careerExt(ctx.ext);
  const rows = c.karmajiva.map((k) => [`\\textbf{${tex(k.from)}}`, tex(k.tenthSign), tex(k.tenthLord), tex(k.lordNavamsaSign), `\\textbf{${tex(k.karmajivaPlanet)}}`]);
  const r = ctx.registry;
  const q = (id: string) => (evidenceValue(r, id) as string[]).join(', ');
  return {
    tex: intro('Varahamihira\'s Karmajiva rule reads the source of livelihood from the Navamsa sign occupied by the lord of the 10th, counted from the Lagna, the Moon and the Sun. The lord of that Navamsa sign is the planet whose nature colours how you earn.') +
      table('>{\\raggedright\\arraybackslash}p{0.13\\linewidth}>{\\raggedright\\arraybackslash}p{0.17\\linewidth}>{\\raggedright\\arraybackslash}p{0.15\\linewidth}>{\\raggedright\\arraybackslash}X>{\\raggedright\\arraybackslash}p{0.2\\linewidth}',
        ['Counted from', '10th sign', 'Its lord', 'Lord\'s Navamsa sign', 'Livelihood planet'], rows) +
      kvTable([
        ['10th house sign quality', q('career.vocation.house10.quality')],
        ['10th lord\'s sign quality', q('career.vocation.lord10.quality')],
        ['D10 ascendant quality', q('career.d10.asc.quality')],
      ]),
    evidenceIds: ['career.karmajiva.lagna', 'career.karmajiva.moon', 'career.karmajiva.sun', 'career.vocation.house10.quality', 'career.vocation.lord10.quality', 'career.d10.asc.quality'],
    method: 'Brihat Jataka ch. 10 (Karmajiva), using the engine\'s D9. All three reference points are shown; the text does not pick one by an invented strength score. Element and modality are the standard sign qualities.',
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

