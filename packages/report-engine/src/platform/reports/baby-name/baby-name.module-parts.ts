/**
 * Baby Name report: extend step, evidence and deterministic blocks.
 *
 * Candidate names are an optional input (`candidateNames` on the subject JSON,
 * see BAB-005). They are evaluated locally; only their numbers reach the
 * evidence registry, referenced by position (candidate 1, 2, …), never by name.
 */
import { AddEvidence, EvidenceRegistry, planetName } from '../../evidence/evidence-registry';
import { ExtendContext } from '../../module';
import { nakshatraLabel, planetLabel, signLabel } from '../../i18n/hindi';
import { BlockContext, blockLang, BlockOutput } from '../../render/blocks';
import { tex } from '../../render/latex';
import { dateLabel, HARMONY_LABEL, L, NUMBER_PLANET, numberHarmony } from '../_numerology-shared/associations';
import { grid, kv, PLANES_METHOD, planesTable } from '../_numerology-shared/blocks';
import { computeNumerologyExt } from '../_numerology-shared/evidence';
import { NAME_PLANE_ORDER } from '../_numerology-shared/numerology';
import { FIT_LABEL_HI, MATCH_LABEL_HI } from './baby-name.hindi';
import { computeNameGuidance, FIT_LABEL, MATCH_LABEL, NAKSHATRA_NAMES, NameGuidance } from './calc/name-guidance';

export interface BabySubjectExtras {
  /** Names the parents are considering (optional, up to 5 are evaluated). */
  candidateNames?: string[];
}

export async function babyExtend(ctx: ExtendContext): Promise<Record<string, unknown>> {
  const s = ctx.snapshot;
  const numerology = computeNumerologyExt(s, { useName: false });
  const moon = s.natal.planets.find((p) => planetName(p.name) === 'Moon')!;
  const extras = s.subject as typeof s.subject & BabySubjectExtras;
  const guidance = computeNameGuidance({
    moonNakshatraIndex: moon.nakshatraIndex, moonPada: moon.pada, moonSignIndex: moon.rashiIndex,
    mulank: numerology.profile.mulank, bhagyank: numerology.profile.bhagyank,
    candidateNames: Array.isArray(extras.candidateNames) ? extras.candidateNames.filter((n) => typeof n === 'string') : [],
  });
  guidance.janma.nakshatra = moon.nakshatra; // keep the engine's spelling, as in planet.moon.d1.nakshatra
  return { numerology, guidance };
}

export const guidanceOf = (ext: Record<string, unknown>): NameGuidance => {
  const g = ext.guidance as NameGuidance | undefined;
  if (!g) throw new Error('BLOCK_DATA_MISSING: guidance');
  return g;
};

const SRC = 'platform.baby-name';

export function addBabyEvidence(add: AddEvidence, g: NameGuidance, gender: string | undefined): void {
  add('baby.gender', 'baby-name', `The child is ${gender === 'male' ? 'a boy' : gender === 'female' ? 'a girl' : 'of unspecified gender'}`, gender === 'male' ? 'boy' : gender === 'female' ? 'girl' : 'unspecified', SRC);
  add('baby.janma-pada', 'baby-name', `Janma nakshatra ${g.janma.nakshatra}, pada ${g.janma.pada}`, g.janma.nakshatra, SRC);
  add('baby.syllable.primary', 'baby-name', `The traditional first syllable (namakshara) for this birth pada is ${g.primary.latin} (${g.primary.devanagari})`, g.primary.latin, SRC);
  add('baby.syllables.nakshatra', 'baby-name', `Syllables of the four padas of ${g.janma.nakshatra}: ${g.nakshatraSyllables.map((s) => s.latin).join(', ')}`, g.nakshatraSyllables.map((s) => s.latin), SRC);
  add('baby.syllables.rashi', 'baby-name', `Syllables of the Moon sign ${g.janma.moonSign}: ${g.rashiSyllables.map((s) => s.latin).join(', ')}`, g.rashiSyllables.map((s) => s.latin), SRC);
  const by = (f: string) => Object.entries(g.fits).filter(([, v]) => v === f).map(([k]) => k);
  add('baby.numbers.supportive', 'baby-name', by('supportive').length ? `Name numbers supportive for both Mulank and Bhagyank: ${by('supportive').join(', ')}` : 'No name number is supportive for both Mulank and Bhagyank', by('supportive'), SRC);
  add('baby.numbers.workable', 'baby-name', by('workable').length ? `Workable name numbers: ${by('workable').join(', ')}` : 'No name number is in the workable group', by('workable'), SRC);
  add('baby.numbers.care', 'baby-name', by('needs-care').length ? `Name numbers that need care: ${by('needs-care').join(', ')}` : 'No name number needs special care', by('needs-care'), SRC);
  add('baby.candidates.count', 'baby-name', `${g.candidates.length} candidate name${g.candidates.length === 1 ? ' was' : 's were'} provided by the family`, g.candidates.length, SRC);
  for (const c of g.candidates) {
    const b = `baby.candidate.${c.index}`;
    add(`${b}.number`, 'baby-name', `Candidate ${c.index} has Chaldean name number ${c.number.value} (compound ${c.number.compound}), fit: ${FIT_LABEL[c.fit].toLowerCase()}`, c.number.value, SRC);
    add(`${b}.syllable`, 'baby-name', `Candidate ${c.index}: ${MATCH_LABEL[c.match].toLowerCase()}`, MATCH_LABEL[c.match].toLowerCase(), SRC);
    add(`${b}.soul-urge`, 'baby-name', `Candidate ${c.index} soul urge number is ${c.soulUrge.value}`, c.soulUrge.value, SRC);
    add(`${b}.personality`, 'baby-name', `Candidate ${c.index} personality number is ${c.personality.value}`, c.personality.value, SRC);
    for (const pl of NAME_PLANE_ORDER) {
      add(`${b}.plane.${pl}`, 'baby-name', `Candidate ${c.index} ${pl} plane has ${c.planes.counts[pl]} letter${c.planes.counts[pl] === 1 ? '' : 's'}`, c.planes.counts[pl], SRC);
    }
  }
}

export function babyEvidence(add: AddEvidence, ctx: ExtendContext & { ext: Record<string, unknown>; registry: EvidenceRegistry }): void {
  addBabyEvidence(add, guidanceOf(ctx.ext), ctx.snapshot.subject.gender);
}

// ---------------------------------------------------------------------------
// Blocks. Each labels itself in the language of the edition being generated
// (`blockLang`); syllables, numbers and evidence IDs are the same in both.
// Candidate names are printed as the family wrote them.
// ---------------------------------------------------------------------------

export function babyDetails(ctx: BlockContext): BlockOutput {
  const s = ctx.snapshot.subject;
  const g = guidanceOf(ctx.ext);
  const r = ctx.registry;
  const lang = blockLang(ctx);
  const numbers = `${r.get('numerology.mulank')!.value} / ${r.get('numerology.bhagyank')!.value}`;
  const rows: Array<[string, string]> = lang === 'hi'
    ? [
      ['शिशु', s.name],
      ['लिंग', s.gender === 'male' ? 'बालक' : s.gender === 'female' ? 'बालिका' : 'निर्दिष्ट नहीं'],
      ['जन्म तिथि और समय', `${dateLabel(lang, s.dateOfBirth)}${s.timeOfBirth ? ', ' + s.timeOfBirth : ''}`],
      ['जन्म स्थान', s.placeName],
      ['चंद्र राशि', signLabel(lang, g.janma.moonSign)],
      ['जन्म नक्षत्र और चरण', `${nakshatraLabel(lang, g.janma.nakshatra)}, चरण ${g.janma.pada}`],
      ['मूलांक / भाग्यांक', numbers],
    ]
    : [
      ['Child', s.name],
      ['Gender', s.gender === 'male' ? 'Boy' : s.gender === 'female' ? 'Girl' : 'Not specified'],
      ['Date and time of birth', `${s.dateOfBirth}${s.timeOfBirth ? ', ' + s.timeOfBirth : ''}`],
      ['Place of birth', s.placeName],
      ['Moon sign (Rashi)', g.janma.moonSign],
      ['Janma nakshatra and pada', `${g.janma.nakshatra}, pada ${g.janma.pada}`],
      ['Mulank / Bhagyank', numbers],
    ];
  return {
    tex: kv(lang, rows, lang === 'hi' ? ['विवरण', 'मान'] : ['Detail', 'Value']),
    evidenceIds: ['planet.moon.d1.sign', 'planet.moon.d1.nakshatra', 'baby.janma-pada', 'numerology.mulank', 'numerology.bhagyank'],
  };
}

export function babySyllables(ctx: BlockContext): BlockOutput {
  const g = guidanceOf(ctx.ext);
  const lang = blockLang(ctx);
  const hi = lang === 'hi';
  const nakshatra = nakshatraLabel(lang, g.janma.nakshatra);
  const pada = (n: number) => L(lang, `pada ${n}`, `चरण ${n}`);
  const hero = `\\begin{center}\\begin{tcolorbox}[enhanced,colback=Tint,colframe=Accent!60,boxrule=0.8pt,arc=2mm,width=0.62\\linewidth,center,halign=center]
{\\sffamily\\fontsize{7.5}{9}\\selectfont\\bfseries\\color{Accent}${hi ? tex('पारंपरिक पहला अक्षर (नामाक्षर)') : 'TRADITIONAL FIRST SYLLABLE (NAMAKSHARA)'}}\\par\\vspace{2mm}
{\\displayfont\\fontsize{34}{40}\\selectfont\\color{Primary}${tex(g.primary.latin)}\\enspace\\textbar\\enspace ${tex(g.primary.devanagari)}\\par}\\vspace{1mm}
{\\fontsize{9}{12}\\selectfont\\color{Muted}${tex(`${nakshatra}, ${pada(g.janma.pada)}`)}\\par}
\\end{tcolorbox}\\end{center}`;
  const nakRows = g.nakshatraSyllables.map((s) => [
    hi ? `चरण ${s.pada}${s.pada === g.janma.pada ? ' (जन्म चरण)' : ''}` : `Pada ${s.pada}${s.pada === g.janma.pada ? ' (birth pada)' : ''}`,
    s.latin, s.devanagari,
  ]);
  const rashiRows = g.rashiSyllables.map((s) => [
    `${s.nakshatraIndex === g.janma.nakshatraIndex ? nakshatra : nakshatraLabel(lang, NAKSHATRA_NAMES[s.nakshatraIndex - 1])}, ${pada(s.pada)}`,
    s.latin, s.devanagari,
  ]);
  const head = hi ? ['चरण', 'रोमन लिपि में', 'देवनागरी में'] : ['Pada', 'Latin', 'Devanagari'];
  return {
    tex: [
      hero,
      `{\\sffamily\\fontsize{8.5}{10.5}\\selectfont\\bfseries\\color{Primary}${tex(hi ? `${nakshatra} नक्षत्र के अक्षर` : `SYLLABLES OF ${g.janma.nakshatra.toUpperCase()}`)}\\par}`,
      grid('>{\\raggedright\\arraybackslash}X p{0.2\\linewidth}p{0.2\\linewidth}', head, nakRows, (i) => i === g.janma.pada - 1),
      `{\\sffamily\\fontsize{8.5}{10.5}\\selectfont\\bfseries\\color{Primary}${tex(hi ? `चंद्र राशि ${signLabel(lang, g.janma.moonSign)} के अक्षर` : `SYLLABLES OF THE MOON SIGN ${g.janma.moonSign.toUpperCase()}`)}\\par}`,
      grid('>{\\raggedright\\arraybackslash}X p{0.2\\linewidth}p{0.2\\linewidth}', head, rashiRows),
    ].join('\n'),
    evidenceIds: ['baby.janma-pada', 'baby.syllable.primary', 'baby.syllables.nakshatra', 'baby.syllables.rashi', 'planet.moon.d1.nakshatra', 'planet.moon.d1.sign'],
    method: L(lang,
      'Classical namakshara (avakahada chakra): each of the 108 nakshatra padas has one syllable; the birth pada is the Moon\'s pada at birth. The Moon-sign list gives the nine padas that fall in the Moon\'s sign. Latin spellings are approximate; the Devanagari form is the reference.',
      'शास्त्रीय नामाक्षर (अवकहड़ा चक्र): 108 नक्षत्र-चरणों में से हर एक का अपना अक्षर है; जन्म चरण वह चरण है जिसमें जन्म के समय चंद्र था। चंद्र राशि की सूची में वे नौ चरण हैं जो चंद्र की राशि में पड़ते हैं। रोमन लिपि की वर्तनी अनुमानित है; देवनागरी रूप ही प्रमाण है।'),
  };
}

export function babyNumberGuide(ctx: BlockContext): BlockOutput {
  const g = guidanceOf(ctx.ext);
  const lang = blockLang(ctx);
  const hi = lang === 'hi';
  const mul = Number(ctx.registry.get('numerology.mulank')!.value);
  const bha = Number(ctx.registry.get('numerology.bhagyank')!.value);
  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [
    String(n), planetLabel(lang, NUMBER_PLANET[n]), HARMONY_LABEL[numberHarmony(mul, n)][lang], HARMONY_LABEL[numberHarmony(bha, n)][lang],
    hi ? FIT_LABEL_HI[g.fits[n]] : FIT_LABEL[g.fits[n]],
  ]);
  return {
    tex: grid('p{0.1\\linewidth}p{0.15\\linewidth}>{\\raggedright\\arraybackslash}X>{\\raggedright\\arraybackslash}X p{0.16\\linewidth}',
      hi ? ['नामांक', 'ग्रह', `मूलांक ${mul} के साथ`, `भाग्यांक ${bha} के साथ`, 'कुल मिलाकर'] : ['Name number', 'Planet', `With Mulank ${mul}`, `With Bhagyank ${bha}`, 'Overall'],
      rows, (i) => g.fits[i + 1] === 'supportive'),
    evidenceIds: ['numerology.mulank', 'numerology.bhagyank', 'baby.numbers.supportive', 'baby.numbers.workable', 'baby.numbers.care'],
    method: L(lang,
      'Supportive = same as, or in natural friendship with, both the Mulank and the Bhagyank rulers; needs care = mutual natural enmity with either; workable = everything else (BPHS naisargika relationships). Highlighted rows are supportive.',
      'अनुकूल = मूलांक और भाग्यांक दोनों के स्वामी ग्रहों के समान, या दोनों से नैसर्गिक मित्रता वाला; ध्यान अपेक्षित = दोनों में से किसी एक से परस्पर नैसर्गिक शत्रुता; स्वीकार्य = शेष सभी (बृहत् पाराशर होरा शास्त्र के नैसर्गिक संबंध)। रंगीन पंक्तियाँ अनुकूल हैं।'),
  };
}

export function babyCandidates(ctx: BlockContext): BlockOutput {
  const g = guidanceOf(ctx.ext);
  const lang = blockLang(ctx);
  const hi = lang === 'hi';
  if (!g.candidates.length) {
    const title = hi ? tex('कोई संभावित नाम नहीं दिया गया') : 'No candidate names were provided';
    const text = L(lang,
      'When ordering, families can list up to five names they are considering. Each is then checked here for its syllable and its numbers. Until then, use the worksheet at the end of this report: add the letter values of a name with the Chaldean table and compare the total with the guide above.',
      'रिपोर्ट मँगवाते समय परिवार ऐसे पाँच तक नाम लिख सकते हैं जिन पर वे विचार कर रहे हैं। तब हर नाम का अक्षर और उसके अंक यहाँ परखे जाते हैं। तब तक इस रिपोर्ट के अंत में दिए गए अभ्यास-पत्र का उपयोग करें: कैल्डियन तालिका से नाम के अक्षरों के मान जोड़ें और योग को ऊपर दी गई मार्गदर्शिका से मिलाएँ।');
    return {
      tex: `\\begin{asCard}\\CardTitle{${title}}{\\fontsize{9.5}{13.5}\\selectfont ${tex(text)}\\par}\\end{asCard}`,
      evidenceIds: ['baby.candidates.count'],
    };
  }
  const rows = g.candidates.map((c) => [
    String(c.index), c.name, `${c.number.compound} → ${c.number.value}`, hi ? FIT_LABEL_HI[c.fit] : FIT_LABEL[c.fit], hi ? MATCH_LABEL_HI[c.match] : MATCH_LABEL[c.match],
  ]);
  return {
    tex: grid('p{0.05\\linewidth}p{0.2\\linewidth}p{0.12\\linewidth}p{0.13\\linewidth}>{\\raggedright\\arraybackslash}X',
      hi ? ['#', 'नाम', 'नामांक', 'अंक की अनुकूलता', 'नामाक्षर'] : ['#', 'Name', 'Number', 'Number fit', 'Syllable'], rows),
    evidenceIds: ['baby.candidates.count', ...g.candidates.flatMap((c) => [`baby.candidate.${c.index}.number`, `baby.candidate.${c.index}.syllable`])],
    method: L(lang,
      'Chaldean name number of the name as written; number fit from the guide above; syllable check compares the start of the Latin spelling with the traditional syllables (long-vowel spellings such as "aa", "ee", "oo" accepted). Please confirm the syllable in Devanagari.',
      'नाम जैसा लिखा गया है, उसका कैल्डियन नामांक; अंक की अनुकूलता ऊपर दी गई मार्गदर्शिका से; नामाक्षर की जाँच में रोमन लिपि की वर्तनी के आरंभ को पारंपरिक अक्षरों से मिलाया गया है (दीर्घ स्वर की "aa", "ee", "oo" जैसी वर्तनी मान्य है)। कृपया नामाक्षर की पुष्टि देवनागरी में कर लें।'),
  };
}

export function babyCandidatePlanes(ctx: BlockContext): BlockOutput {
  const g = guidanceOf(ctx.ext);
  const lang = blockLang(ctx);
  if (!g.candidates.length) {
    return { tex: `{\\itshape ${lang === 'hi' ? tex('कोई संभावित नाम नहीं दिया गया।') : 'No candidate names were provided.'}}`, evidenceIds: ['baby.candidates.count'] };
  }
  const parts = g.candidates.map((c) =>
    `\\needspace{10\\baselineskip}{\\sffamily\\fontsize{8.5}{10.5}\\selectfont\\bfseries\\color{Primary}${tex(L(lang, `NAME GRID FOR CANDIDATE ${c.index}: ${c.name.toUpperCase()}`, `संभावित नाम ${c.index} का नाम ग्रिड: ${c.name.toUpperCase()}`))}\\par}\n${planesTable(lang, c.name)}\n{\\fontsize{8.8}{12}\\selectfont\\color{Muted}${tex(L(lang, `Soul urge ${c.soulUrge.value} · personality ${c.personality.value}`, `आत्मा आग्रह अंक ${c.soulUrge.value} · व्यक्तित्व अंक ${c.personality.value}`))}\\par}\\vspace{2mm}`);
  return {
    tex: parts.join('\n'),
    evidenceIds: g.candidates.flatMap((c) => [...NAME_PLANE_ORDER.map((pl) => `baby.candidate.${c.index}.plane.${pl}`), `baby.candidate.${c.index}.soul-urge`, `baby.candidate.${c.index}.personality`]),
    method: PLANES_METHOD[lang],
  };
}

export function babyWorksheet(ctx?: BlockContext): BlockOutput {
  const lang = ctx ? blockLang(ctx) : 'en';
  const hi = lang === 'hi';
  const rows = [['1', 'A I J Q Y'], ['2', 'B K R'], ['3', 'C G L S'], ['4', 'D M T'], ['5', 'E H N X'], ['6', 'U V W'], ['7', 'O Z'], ['8', 'F P']];
  const steps = L(lang,
    '1. Write the name as it will be used. 2. Add the value of every letter. 3. Reduce the total by adding its digits until one digit remains (for example 32 → 5). 4. Look the digit up in the name-number guide. 5. Check that the first sound matches one of the syllables listed earlier.',
    '1. नाम को रोमन लिपि में वैसे ही लिखें जैसे वह प्रयोग में आएगा। 2. हर अक्षर का मान जोड़ें। 3. योग के अंकों को तब तक जोड़ते जाएँ जब तक एक ही अंक न बचे (जैसे 32 → 5)। 4. उस अंक को नामांक मार्गदर्शिका में देखें। 5. जाँच लें कि नाम की पहली ध्वनि पहले बताए गए अक्षरों में से किसी एक से मिलती है।');
  return {
    tex: grid('p{0.15\\linewidth}X', hi ? ['मान', 'अक्षर'] : ['Value', 'Letters'], rows)
      + `\n\\begin{asHighlight}\\CardTitle{${hi ? tex('किसी भी नाम को कैसे परखें') : 'How to test any name'}}{\\fontsize{9.5}{13.5}\\selectfont ${tex(steps)}\\par}\\end{asHighlight}`,
    evidenceIds: ['baby.numbers.supportive'],
    method: L(lang, 'Chaldean letter values (Cheiro); 9 is not assigned to any letter.', 'कैल्डियन अक्षर-मान (कीरो); 9 किसी भी अक्षर को नहीं दिया गया है।'),
  };
}

export const BABY_BLOCKS = {
  'baby-name-details': babyDetails,
  'baby-name-syllables': babySyllables,
  'baby-name-number-guide': babyNumberGuide,
  'baby-name-candidates': babyCandidates,
  'baby-name-candidate-planes': babyCandidatePlanes,
  'baby-name-worksheet': babyWorksheet,
};
