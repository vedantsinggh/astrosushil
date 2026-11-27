/** Kundli reference tables: ashtakavarga, bhavas, conjunctions, karakas, Mangal, Sade Sati, yogas, patterns, numerology, practices. */
import { ASHTAKAVARGA_PLANETS } from '@astro/astrology-engine';
import { BlockContext, blockLang, BlockOutput, timelineTex } from '../../../render/blocks';
import { tex } from '../../../render/latex';
import { ordinal, planetName, SIGNS } from '../../../evidence/evidence-registry';
import { computeNumerology } from '../../../evidence/numerology';
import { pick, planetLabel, signLabel } from '../../../i18n/hindi';
import { kundliExt } from '../extend';
import { NUMBER_RULER, pad2, remedyFocus, SAV_AVERAGE } from '../evidence';
import { bhavaIn, dateIn, kl, mangalExceptionIn, practiceIn, signShortIn, weekdayIn, yogaFamilyIn, yogaNameIn } from '../kundli.hindi';
import { dataTable, dignityIn, list, noteBox, para, planetOf, SIGN_SHORT } from './common';

export function kundliAshtakavarga(ctx: BlockContext): BlockOutput {
  const { ashtakavarga, natal } = ctx.snapshot;
  const lang = blockLang(ctx);
  const L = (en: string) => kl(lang, en);
  const header = ['', ...SIGN_SHORT.map((short, i) => signShortIn(lang, short, SIGNS[i])), L('Total')];
  const rows: string[][] = ASHTAKAVARGA_PLANETS.map((p) => {
    const bav = ashtakavarga.bav[p];
    return [`\\textbf{${tex(planetLabel(lang, planetName(p)))}}`, ...bav.signList.map(String), `\\textbf{${bav.totalPoints}}`];
  });
  const sav = ashtakavarga.sav;
  rows.push([`\\textbf{${pick(lang, 'SAV', 'सर्वाष्टक')}}`, ...sav.signList.map((v) => (v > SAV_AVERAGE ? `\\textbf{\\color{Primary}${v}}` : String(v))), `\\textbf{${sav.grandTotal}}`]);
  const houseOf = (signIdx: number) => ((signIdx - natal.ascendant.rashiIndex + 12) % 12) + 1;
  rows.push([`\\textit{${L('House')}}`, ...SIGN_SHORT.map((_, i) => `\\textit{${houseOf(i + 1)}}`), '']);
  return {
    tex: dataTable(`l*{12}{>{\\centering\\arraybackslash}X}c`, header, rows, { fontPt: 8.4, tabcolsep: '2.5pt' }),
    evidenceIds: natal.houses.map((h) => `sav.house.${h.number}`).concat(['kundli.sav.above-average']),
    method: pick(lang,
      `Bhinnashtakavarga (BAV) of the seven planets and the Sarvashtakavarga (SAV) by sign, from the classical benefic-point tables (BPHS ch. 66-72). The SAV totals 337 in every chart, an average of about 28 per sign; signs above ${SAV_AVERAGE} are shown in bold colour. The last row gives the house each sign occupies in your chart.`,
      `सात ग्रहों का भिन्नाष्टकवर्ग और राशि के अनुसार सर्वाष्टकवर्ग, शास्त्रीय शुभ-बिंदु सारणियों से (बृहत् पाराशर होरा शास्त्र, अध्याय 66-72)। हर कुंडली में सर्वाष्टकवर्ग का कुल योग 337 होता है, यानी प्रति राशि औसत लगभग 28; ${SAV_AVERAGE} से अधिक बिंदु वाली राशियाँ गहरे रंग में दिखाई गई हैं। अंतिम पंक्ति बताती है कि आपकी कुंडली में वह राशि किस भाव में पड़ती है।`),
  };
}

const BHAVA: Array<[string, string]> = [
  ['Tanu', 'Self, body, temperament, vitality, first impressions'],
  ['Dhana', 'Wealth, family, speech, food, values'],
  ['Sahaja', 'Courage, effort, siblings, communication, short travel'],
  ['Sukha', 'Home, mother, comforts, property, inner peace'],
  ['Putra', 'Intelligence, children, creativity, romance, past merit'],
  ['Ripu', 'Health routines, service, competition, debts, problem-solving'],
  ['Kalatra', 'Marriage, partnership, contracts, public dealings'],
  ['Randhra', 'Transformation, longevity, research, shared resources'],
  ['Dharma', 'Fortune, father and teachers, higher learning, faith'],
  ['Karma', 'Career, status, responsibility, visible action'],
  ['Labha', 'Gains, networks, friends, ambitions, elder siblings'],
  ['Vyaya', 'Expenses, rest, foreign lands, solitude, liberation'],
];

export function kundliBhavaSignificators(ctx: BlockContext): BlockOutput {
  const { natal } = ctx.snapshot;
  const lang = blockLang(ctx);
  const L = (en: string) => kl(lang, en);
  const rows = natal.houses.map((h) => [
    `\\textbf{${pick(lang, ordinal(h.number), String(h.number))}}`, `\\textit{${bhavaIn(lang, BHAVA[h.number - 1][0])}}`, tex(bhavaIn(lang, BHAVA[h.number - 1][1])),
    tex(signLabel(lang, h.sign)), tex(planetLabel(lang, planetName(h.lord))),
  ]);
  return {
    tex: dataTable('cl>{\\raggedright\\arraybackslash}Xll', ['House', 'Bhava', 'What it governs', 'Your sign', 'Lord'].map(L), rows, { fontPt: 8.6 }),
    evidenceIds: natal.houses.flatMap((h) => [`house.${h.number}.d1.sign`, `house.${h.number}.d1.lord`]),
    method: L('Classical bhava significations (Brihat Parashara Hora Shastra, ch. 11), summarised; signs by Whole Sign houses from your Ascendant.'),
  };
}

const HOUSE_CLASS = (h: number) => {
  const c: string[] = [];
  if ([1, 4, 7, 10].includes(h)) c.push('kendra');
  if ([1, 5, 9].includes(h)) c.push('trikona');
  if ([6, 8, 12].includes(h)) c.push('dusthana');
  if ([3, 6, 10, 11].includes(h)) c.push('upachaya');
  return c.join(', ') || '--';
};

export function kundliHouseLords(ctx: BlockContext): BlockOutput {
  const { natal } = ctx.snapshot;
  const lang = blockLang(ctx);
  const L = (en: string) => kl(lang, en);
  const no = (n: number) => pick(lang, ordinal(n), String(n));
  const houseClass = (h: number) => {
    const c = HOUSE_CLASS(h);
    return c === '--' ? c : c.split(', ').map(L).join(', ');
  };
  const rows = natal.houses.map((h) => {
    const lord = planetName(h.lord);
    const lp = planetOf(natal, lord);
    const fromHouse = ((lp.house - h.number + 12) % 12) + 1;
    return [
      pick(lang, `\\textbf{${ordinal(h.number)}} lord`, `\\textbf{भाव ${h.number}}`), tex(planetLabel(lang, lord)), no(lp.house), tex(signLabel(lang, lp.sign)),
      tex(dignityIn(lang, lp.dignity)), tex(houseClass(lp.house)), no(fromHouse),
    ];
  });
  return {
    tex: dataTable('llcl>{\\raggedright\\arraybackslash}X>{\\raggedright\\arraybackslash}Xc', ['House lord', 'Planet', 'Placed in', 'Sign', 'Dignity', 'Type of house reached', 'From own house'].map(L), rows, { fontPt: 8.5 }),
    evidenceIds: natal.houses.flatMap((h) => [`house.${h.number}.d1.lord-house`, `kundli.house.${h.number}.lord-sign`, `kundli.house.${h.number}.lord-dignity`]),
    method: L('Bhava-lord placement (bhavesha phala): where the lord of each house sits. Kendra = 1/4/7/10, trikona = 1/5/9, dusthana = 6/8/12, upachaya = 3/6/10/11. The last column counts the lord\'s house from the house it rules.'),
  };
}

export function kundliConjunctions(ctx: BlockContext): BlockOutput {
  const groups = kundliExt(ctx).conjunctions;
  const lang = blockLang(ctx);
  const L = (en: string) => kl(lang, en);
  if (!groups.length) {
    return {
      tex: noteBox('asCard', L('No conjunctions'), L('No two planets share a sign in your birth chart, so each planet works through its own house without blending directly with another.')),
      evidenceIds: ['kundli.conjunctions.count'],
      method: L('A conjunction (yuti) is two or more planets in the same sign.'),
    };
  }
  const rows = groups.map((g) => [
    pick(lang, ordinal(g.house), String(g.house)), tex(signLabel(lang, g.sign)), tex(g.planets.map((p) => `${planetLabel(lang, p.name)} ${p.degree.toFixed(1)}°`).join(', ')),
    `${g.spanDegrees.toFixed(1)}°`, tex(`${planetLabel(lang, g.closest.a)}-${planetLabel(lang, g.closest.b)} (${g.closest.orb.toFixed(1)}°)`),
  ]);
  return {
    tex: dataTable('cl>{\\raggedright\\arraybackslash}Xc>{\\raggedright\\arraybackslash}p{0.22\\linewidth}', ['House', 'Sign', 'Planets and degrees', 'Spread', 'Closest pair'].map(L), rows, { fontPt: 8.8 }),
    evidenceIds: ['kundli.conjunctions.count', ...groups.map((_, i) => `kundli.conjunction.${pad2(i + 1)}`)],
    method: L('A conjunction (yuti) is two or more planets in the same sign; the closer their degrees, the more their themes blend.'),
  };
}

const KARAKA_ROWS: Array<[string, string, string]> = [
  ['AK', 'Atmakaraka', 'The soul\'s central lesson and desire'],
  ['AMK', 'Amatyakaraka', 'Career, counsel and the means of achievement'],
  ['BK', 'Bhratrikaraka', 'Siblings, courage, guides and mentors'],
  ['MK', 'Matrikaraka', 'Mother, nurturing, emotional foundations'],
  ['PK', 'Putrakaraka', 'Children, creativity, students and disciples'],
  ['GK', 'Gnatikaraka', 'Rivals, obstacles, health discipline'],
  ['DK', 'Darakaraka', 'Spouse and close partnerships'],
];

export function kundliKarakaTable(ctx: BlockContext): BlockOutput {
  const { natal } = ctx.snapshot;
  const lang = blockLang(ctx);
  const L = (en: string) => kl(lang, en);
  const rows: string[][] = [];
  const ids: string[] = [];
  for (const [code, name, meaning] of KARAKA_ROWS) {
    const p = natal.planets.find((x) => String(x.charaKaraka ?? '').toUpperCase() === code);
    if (!p) continue;
    ids.push(`karaka.${code.toLowerCase()}`, `kundli.karaka.${code.toLowerCase()}.placement`);
    rows.push([`\\textbf{${L(name)}}`, tex(planetLabel(lang, planetName(p.name))), p.degree.toFixed(2) + '°', `${pick(lang, ordinal(p.house), String(p.house))}, ${tex(signLabel(lang, p.sign))}`, tex(L(meaning))]);
  }
  const km = kundliExt(ctx).karakamsha;
  const kmLine = km
    ? para(pick(lang,
      `Karakamsha: your Atmakaraka ${km.atmakaraka} falls in ${km.sign} in the Navamsa (D9). In Jaimini astrology the 12th sign from the Karakamsha (${km.twelfthSign}, ruled by ${km.twelfthLord}) is read for spiritual inclination.`,
      `कारकांश: आपका आत्मकारक ${planetLabel(lang, km.atmakaraka)} नवांश (D9) में ${signLabel(lang, km.sign)} राशि में है। जैमिनी ज्योतिष में कारकांश से 12वीं राशि (${signLabel(lang, km.twelfthSign)}, स्वामी ${planetLabel(lang, km.twelfthLord)}) से आध्यात्मिक झुकाव देखा जाता है।`), 9.2)
    : '';
  return {
    tex: dataTable('l l c l >{\\raggedright\\arraybackslash}X', ['Karaka', 'Planet', 'Degree in sign', 'House, sign', 'What it signifies'].map(L), rows, { fontPt: 8.8 }) + kmLine,
    evidenceIds: [...ids, ...(km ? ['kundli.karakamsha.sign', 'kundli.karakamsha.twelfth'] : [])],
    method: L('Jaimini chara (variable) karakas, seven-karaka scheme: the seven planets from the Sun to Saturn are ranked by degree within their sign, highest first (D-005).'),
  };
}

export function kundliMangalTable(ctx: BlockContext): BlockOutput {
  const m = kundliExt(ctx).manglik;
  const lang = blockLang(ctx);
  const L = (en: string) => kl(lang, en);
  const mp = m.marsPlacement;
  const yes = (s?: string) => L(s === 'MANGLIK' ? 'Yes' : s === 'NON_MANGLIK' ? 'No' : 'Not available');
  const no = (n?: number) => (n ? pick(lang, ordinal(n), String(n)) : '--');
  const rows = [
    [L('From the Ascendant'), no(mp.houseFromLagna), yes(m.statusFromLagna)],
    [L('From the Moon'), no(mp.houseFromMoon), yes(m.statusFromMoon)],
    [L('From Venus'), no(mp.houseFromVenus), yes(m.statusFromVenus)],
  ];
  const exceptions = m.cancellationFactors.length ? m.cancellationFactors.map((f) => mangalExceptionIn(lang, f)).join('; ') : L('None of the listed classical exceptions applies.');
  return {
    tex: dataTable('>{\\raggedright\\arraybackslash}Xcc', ['Reference point', 'Mars counted from it', 'In a classical Mangal house?'].map(L), rows.map((r) => r.map(tex)), { fontPt: 9 })
      + para(pick(lang, `Classical exceptions (parihara) checked: ${exceptions}`, `जाँचे गए शास्त्रीय अपवाद (परिहार): ${exceptions}`), 9.2)
      + '\n' + noteBox('asHighlight', L('Our view'), L('Astro Sushil does not treat Mangal placement as a dosha or a defect. Mars in these houses describes energy, drive and directness that a relationship benefits from channelling well. It is never a reason to fear, delay or reject a marriage, and no ritual or purchase is needed.')),
    evidenceIds: ['kundli.mangal.pattern', 'kundli.mangal.exceptions', 'kundli.mangal.classical-houses', ...(['from-lagna', 'from-moon', 'from-venus'] as const).map((s) => `kundli.mangal.${s}`).filter((id) => ctx.registry.has(id))],
    method: L('Mars counted in whole signs from the Ascendant, the Moon and Venus; classical Mangal houses 1, 4, 7, 8 and 12 (engine convention; the 2nd house is not included). Exceptions are the engine\'s classical list: Mars in its own or exaltation sign in specific houses, and Jupiter joining or aspecting Mars. No severity grade is given.'),
  };
}

const PHASE_LABEL: Record<string, string> = { rising: '1st phase (12th from Moon)', peak: '2nd phase (over the Moon)', setting: '3rd phase (2nd from Moon)' };

export function kundliSadeSatiTable(ctx: BlockContext): BlockOutput {
  const k = kundliExt(ctx);
  const lang = blockLang(ctx);
  const L = (en: string) => kl(lang, en);
  const t = Date.parse(ctx.snapshot.asOfIso);
  const rows: string[][] = [];
  const hl: number[] = [];
  const tlItems: Array<{ date: string; title: string; detail?: string; active?: boolean }> = [];
  for (const c of k.sadeSati) {
    c.phases.forEach((p, j) => {
      const isCur = Date.parse(p.startIso) <= t && t < Date.parse(p.endIso);
      if (isCur) hl.push(rows.length);
      rows.push([j === 0 ? `\\textbf{${L('Cycle')} ${c.index}}` : '', tex(L(PHASE_LABEL[p.phase])), tex(signLabel(lang, p.sign)), dateIn(lang, p.startIso), dateIn(lang, p.endIso)]);
      if (c.index <= 2 || isCur) {
        tlItems.push({
          date: `${dateIn(lang, p.startIso)} -- ${dateIn(lang, p.endIso)}`,
          title: `${L('Cycle')} ${c.index} · ${signLabel(lang, p.sign)}`,
          detail: L(PHASE_LABEL[p.phase]),
          active: isCur,
        });
      }
    });
  }
  const moonSign = planetOf(ctx.snapshot.natal, 'Moon').sign;
  const first = k.sadeSati[0];
  const before = SIGNS[(SIGNS.indexOf(moonSign as (typeof SIGNS)[number]) + 11) % 12];
  const after = SIGNS[(SIGNS.indexOf(moonSign as (typeof SIGNS)[number]) + 1) % 12];
  const intro = para(pick(lang,
    `Your Moon is in ${moonSign}, so Sade Sati runs while Saturn moves through ${before}, ${moonSign} and ${after}. ${first?.runningAtBirth ? 'A cycle was already under way when you were born. ' : ''}Each cycle lasts roughly seven and a half years and returns about every thirty years.`,
    `आपका चंद्र ${signLabel(lang, moonSign)} राशि में है, इसलिए साढ़े साती तब चलती है जब शनि ${signLabel(lang, before)}, ${signLabel(lang, moonSign)} और ${signLabel(lang, after)} राशियों से गुजरता है। ${first?.runningAtBirth ? 'आपके जन्म के समय एक चक्र पहले से चल रहा था। ' : ''}हर चक्र लगभग साढ़े सात वर्ष का होता है और लगभग तीस वर्ष बाद लौटता है।`), 9.6);
  return {
    tex: intro + '\n' + timelineTex(tlItems) + '\n' + dataTable('l>{\\raggedright\\arraybackslash}Xlll', ['Cycle', 'Phase', 'Saturn in', 'From', 'To'].map(L), rows, { highlight: hl, fontPt: 8.6 }),
    evidenceIds: ['planet.moon.d1.sign', 'kundli.sadesati.count', 'kundli.sadesati.status', ...k.sadeSati.map((c) => `kundli.sadesati.cycle.${pad2(c.index)}`)],
    method: L('Saturn\'s real sign ingresses (engine transit solver, Lahiri) over 100 years from birth. Dates are the first entry into and final exit from each sign, so retrograde back-and-forth movement is included in the span. The highlighted row is current on the report date.'),
  };
}

export function kundliYogaTable(ctx: BlockContext): BlockOutput {
  const ys = ctx.snapshot.yogas.filter((y) => y.isDetected);
  const lang = blockLang(ctx);
  const L = (en: string) => kl(lang, en);
  if (!ys.length) {
    return {
      tex: noteBox('asCard', L('No named yoga detected'), L('None of the classical combinations in the engine\'s catalogue is formed in your chart. Yogas are only one layer of a chart; the placements, dashas and houses in this report describe your potential in full.')),
      evidenceIds: ['kundli.yogas.count'],
      method: L('Yogas evaluated by the engine\'s rule catalogue (about 60 classical combinations).'),
    };
  }
  const cat = (c: string) => c.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());
  // The engine words each verified condition in English only. The Hindi edition shows the same yogas with
  // the planets that form them (house and sign), taken from the engine's structured evidence.
  const formedBy = (y: (typeof ys)[number]) =>
    y.evidence.involvedPlanets.map((p) => `${planetLabel(lang, planetName(p.planet))} (${p.house}, ${signLabel(lang, SIGNS[p.rashiIndex - 1])})`).join('; ') || '--';
  const rows = ys.map((y) => [
    `\\textbf{${tex(yogaNameIn(lang, y.canonicalName))}}`, tex(pick(lang, cat(y.category), yogaFamilyIn(lang, y.category))),
    tex(lang === 'hi' ? formedBy(y) : y.evidence.conditions.filter((c) => c.satisfied).map((c) => c.description).slice(0, 3).join('; ') || y.convention),
  ]);
  return {
    tex: dataTable('>{\\raggedright\\arraybackslash}p{0.27\\linewidth}l>{\\raggedright\\arraybackslash}X', ['Yoga', 'Family', 'Conditions met in your chart'].map(L), rows, { fontPt: 8.4 }),
    evidenceIds: ['kundli.yogas.count', ...ctx.registry.resolve(['yoga.*']).map((e) => e.id)],
    method: L('Only combinations detected by the engine\'s rule catalogue are listed, each with the conditions it verified. Nothing is added by hand.'),
  };
}

export function kundliPatternNote(ctx: BlockContext): BlockOutput {
  const k = kundliExt(ctx);
  const lang = blockLang(ctx);
  const L = (en: string) => kl(lang, en);
  const m = k.manglik;
  const refs = [m.statusFromLagna === 'MANGLIK' ? 'Ascendant' : '', m.statusFromMoon === 'MANGLIK' ? 'Moon' : '', m.statusFromVenus === 'MANGLIK' ? 'Venus' : ''].filter(Boolean);
  const active = k.sadeSati.find((c) => c.index === k.sadeSatiNow.activeIndex);
  const refsHi = list(refs.map((r) => planetLabel(lang, r)), lang);
  const outsideHi = list(k.kaalSarp.outside.map((p) => planetLabel(lang, p)), lang);
  const rows = [
    [L('Mars in a classical Mangal house'), refs.length ? pick(lang, `Yes, counted from the ${list(refs)}`, `हाँ, ${refsHi} से गिनने पर`) : L('No')],
    [L('All seven planets on one side of the Rahu-Ketu axis'), k.kaalSarp.present ? L('Yes') : pick(lang, `No (${list(k.kaalSarp.outside)} outside the larger half)`, `नहीं (बड़े अर्धभाग के बाहर: ${outsideHi})`)],
    [L('Sade Sati on the report date'), active
      ? pick(lang, `Active (cycle ${active.index}, ${k.sadeSatiNow.phase} phase)`, `चल रही है (चक्र ${active.index}, ${k.sadeSatiNow.phase ? L(k.sadeSatiNow.phase) : ''} चरण)`)
      : L('Not active')],
  ];
  return {
    tex: noteBox('asHighlight', L('We do not believe in doshas'),
      L('Many almanacs label certain placements as doshas, or faults. Astro Sushil does not. A planet\'s position describes a tendency and a field of growth, never a curse or a fixed misfortune, and nothing needs to be bought or performed to correct it. The patterns that are commonly asked about are listed below as plain facts so that you never have to wonder about them.'))
      + '\n' + dataTable('>{\\raggedright\\arraybackslash}X>{\\raggedright\\arraybackslash}p{0.42\\linewidth}', ['Pattern people ask about', 'In your chart'].map(L), rows.map((r) => r.map(tex)), { fontPt: 9 }),
    evidenceIds: ['kundli.mangal.pattern', 'kundli.kaalsarp.pattern', 'kundli.sadesati.status'],
    method: L('Mangal houses from the Ascendant, Moon and Venus (engine); the Rahu-Ketu pattern checks whether the Sun, Moon, Mars, Mercury, Jupiter, Venus and Saturn all fall within one 180° half bounded by the nodes; Sade Sati from Saturn\'s real transits.'),
  };
}

const PLANET_DAY: Record<string, string> = {
  Sun: 'Sunday', Moon: 'Monday', Mars: 'Tuesday', Mercury: 'Wednesday', Jupiter: 'Thursday', Venus: 'Friday', Saturn: 'Saturday', Rahu: 'Saturday', Ketu: 'Tuesday',
};
const PLANET_COLOUR: Record<string, string> = {
  Sun: 'gold, saffron', Moon: 'white, silver', Mars: 'red, coral', Mercury: 'green', Jupiter: 'yellow',
  Venus: 'white, pastel pink', Saturn: 'deep blue, black', Rahu: 'smoky grey', Ketu: 'earthy brown, grey',
};
const BEEJ: Record<string, string> = {
  Sun: 'Om Hraam Hreem Hraum Sah Suryaya Namah', Moon: 'Om Shraam Shreem Shraum Sah Chandraya Namah',
  Mars: 'Om Kraam Kreem Kraum Sah Bhaumaya Namah', Mercury: 'Om Braam Breem Braum Sah Budhaya Namah',
  Jupiter: 'Om Graam Greem Graum Sah Gurave Namah', Venus: 'Om Draam Dreem Draum Sah Shukraya Namah',
  Saturn: 'Om Praam Preem Praum Sah Shanaye Namah', Rahu: 'Om Bhraam Bhreem Bhraum Sah Rahave Namah',
  Ketu: 'Om Sraam Sreem Sraum Sah Ketave Namah',
};
const SERVICE: Record<string, string> = {
  Sun: 'Respect and help your father and elders; keep a sunrise routine; take responsibility in civic life.',
  Moon: 'Care for your mother and mother figures; offer water or food to those in need; protect your sleep.',
  Mars: 'Support your siblings; regular physical exercise; volunteer your energy for practical help.',
  Mercury: 'Teach or tutor; help students with books or time; keep your word in writing and speech.',
  Jupiter: 'Honour teachers; share knowledge freely; support education for children.',
  Venus: 'Treat women with respect and gratitude; support the arts; keep your surroundings clean and beautiful.',
  Saturn: 'Serve the elderly and labourers; be punctual and patient; finish what you start.',
  Rahu: 'Keep honest digital habits; help people on the margins of society; avoid shortcuts.',
  Ketu: 'Quiet meditation; care for stray animals; give anonymously.',
};

export function kundliPracticeTable(ctx: BlockContext): BlockOutput {
  const focus = remedyFocus(ctx);
  const lang = blockLang(ctx);
  const L = (en: string) => kl(lang, en);
  const P = (en: string) => practiceIn(lang, en);
  const merged = new Map<string, string[]>();
  for (const f of focus) merged.set(f.planet, [...(merged.get(f.planet) ?? []), f.reason]);
  const rows = [...merged.entries()].map(([p, why]) => [
    `\\textbf{${tex(planetLabel(lang, p))}}\\newline{\\itshape\\color{Muted}${tex(why.map(P).join(', '))}}`, tex(weekdayIn(lang, PLANET_DAY[p])), tex(P(PLANET_COLOUR[p])), `\\textit{${tex(P(BEEJ[p]))}}`, tex(P(SERVICE[p])),
  ]);
  return {
    tex: dataTable('>{\\raggedright\\arraybackslash}p{0.15\\linewidth}l>{\\raggedright\\arraybackslash}p{0.11\\linewidth}>{\\raggedright\\arraybackslash}p{0.2\\linewidth}>{\\raggedright\\arraybackslash}X',
      ['Planet', 'Day', 'Colours', 'Traditional beej mantra', 'Service and daily practice'].map(L), rows, { fontPt: 8.3 })
      + '\n' + noteBox('asCard', L('Nothing to buy'), L('These practices cost nothing. Choose one or two that feel natural and keep them steadily; consistency matters more than quantity. No gemstone, yantra, rudraksha or paid ritual is needed, and none is recommended in this report.')),
    evidenceIds: ['kundli.remedy.focus', 'asc.d1.lord', 'planet.moon.d1.sign', ...(ctx.registry.has('dasha.current.md') ? ['dasha.current.md'] : [])],
    method: L('Classical practice strengthens the Ascendant lord, the Moon-sign lord and the running Mahadasha lord. Weekday, colour and beej mantra are the standard associations of each planet; service is drawn from what the planet signifies (its karakatva).'),
  };
}

export function kundliNumerologyTable(ctx: BlockContext): BlockOutput {
  const num = computeNumerology(ctx.snapshot.subject.dateOfBirth);
  const lang = blockLang(ctx);
  const L = (en: string) => kl(lang, en);
  const mp = NUMBER_RULER[num.mulank];
  const bp = NUMBER_RULER[num.bhagyank];
  const rows = [
    [L('Mulank (driver number)'), String(num.mulank), tex(planetLabel(lang, mp)), tex(weekdayIn(lang, PLANET_DAY[mp])), tex(practiceIn(lang, PLANET_COLOUR[mp]))],
    [L('Bhagyank (destiny number)'), String(num.bhagyank), tex(planetLabel(lang, bp)), tex(weekdayIn(lang, PLANET_DAY[bp])), tex(practiceIn(lang, PLANET_COLOUR[bp]))],
  ];
  return {
    tex: dataTable('>{\\raggedright\\arraybackslash}Xcllp{0.17\\linewidth}', ['Number', 'Value', 'Ruling planet', 'Day', 'Colours'].map(L), rows, { fontPt: 9 }),
    evidenceIds: ['numerology.mulank', 'numerology.bhagyank', 'kundli.numerology.mulank-planet', 'kundli.numerology.bhagyank-planet'],
    method: L('Mulank = digit sum of the day of birth; Bhagyank = digit sum of the full date of birth, each reduced to 1-9 (D-002). Ruling planets: 1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars.'),
  };
}
