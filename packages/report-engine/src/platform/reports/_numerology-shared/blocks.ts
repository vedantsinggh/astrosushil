/**
 * Deterministic numerology blocks, shared by Fortune (Hindi) and Fortune Plus
 * (English). Every value comes from the canonical numerology module via
 * `ext.numerology`; every block returns the evidence IDs it displays.
 */
import { BlockContext, BlockOutput, BlockRenderer } from '../../render/blocks';
import { tex } from '../../render/latex';
import {
  BEEJ_MANTRA,
  dateLabel,
  DIRECTION_SHORT,
  ELEMENT_HI,
  directionLabel,
  elementLabel,
  GENDER_LABEL,
  HARMONY_LABEL,
  L,
  Lang,
  LINE_LABEL,
  MAHAMRITYUNJAYA,
  monthLabel,
  NAME_PLANE_LABEL,
  NUMBER_PLANET,
  numberHarmony,
  PLANET_AVATAR,
  PLANET_COLOUR,
  PLANET_DAY,
  planetLabel,
  planetRelation,
  RELATION_LABEL,
  signLabel,
} from './associations';
import { numerologyExtOf } from './evidence';
import { CHALDEAN, KuaResult, LO_SHU_CELL, LO_SHU_LAYOUT, NAME_PLANE_ORDER, NAME_PLANES, nameLetters, numbersReducingTo, reduceToDigit, VOWELS } from './numerology';

// ---------------------------------------------------------------------------
// Table helpers
// ---------------------------------------------------------------------------

/** Two-column key/value table with language-aware headings. All values are escaped here. */
export function kv(lang: Lang, rows: Array<[string, string]>, head?: [string, string]): string {
  const [h1, h2] = head ?? [L(lang, 'Item', 'विवरण'), L(lang, 'Your value', 'आपका मान')];
  return [
    '\\begin{center}\\begin{tabularx}{0.9\\linewidth}{>{\\raggedright\\arraybackslash}p{0.36\\linewidth}X}',
    `\\TableHead\\THd{${tex(h1)}} & \\THd{${tex(h2)}}\\\\`,
    ...rows.map(([k, v], i) => `${i % 2 ? '\\rowcolor{Surface}' : ''}\\TCell{\\textbf{${tex(k)}}} & \\TCell{${tex(v)}}\\\\`),
    '\\bottomrule\\end{tabularx}\\end{center}',
  ].join('\n');
}

/** Multi-column table; `spec` is a tabularx column spec, cells are escaped here. */
export function grid(spec: string, head: string[], rows: string[][], highlight?: (i: number) => boolean): string {
  return [
    `\\begin{center}\\begin{tabularx}{\\linewidth}{${spec}}`,
    `\\TableHead${head.map((h) => `\\THd{${tex(h)}}`).join(' & ')}\\\\`,
    ...rows.map((r, i) => `${highlight?.(i) ? '\\rowcolor{Tint}' : i % 2 ? '\\rowcolor{Surface}' : ''}${r.map((c) => `\\TCell{${tex(c)}}`).join(' & ')}\\\\`),
    '\\bottomrule\\end{tabularx}\\end{center}',
  ].join('\n');
}

const p = (ctx: BlockContext) => numerologyExtOf(ctx.ext).profile;

function kuaRows(lang: Lang, k: KuaResult): Array<[string, string]> {
  return [
    [L(lang, 'Kua number', 'कुआ नंबर'), `${k.value}${k.fiveSubstituted ? L(lang, ' (5 replaced by ', ' (5 के स्थान पर ') + k.value + ')' : ''}`],
    [L(lang, 'Solar year used', 'प्रयुक्त सौर वर्ष'), String(k.solarYear) + (k.nearYearBoundary ? L(lang, ' (birth near the 4 February year boundary)', ' (जन्म 4 फ़रवरी की वर्ष-सीमा के निकट)') : '')],
    [L(lang, 'Element', 'तत्व'), elementLabel(lang, k.element)],
    [L(lang, 'Group', 'समूह'), L(lang, `${k.group} group`, k.group === 'East' ? 'पूर्वी समूह' : 'पश्चिमी समूह')],
    [L(lang, 'Success & growth direction', 'सफलता की दिशा'), directionLabel(lang, k.favourable.success)],
    [L(lang, 'Health direction', 'स्वास्थ्य की दिशा'), directionLabel(lang, k.favourable.health)],
    [L(lang, 'Relationships direction', 'संबंधों की दिशा'), directionLabel(lang, k.favourable.relationships)],
    [L(lang, 'Personal growth & calm direction', 'व्यक्तिगत विकास और शांति की दिशा'), directionLabel(lang, k.favourable.growth)],
    [L(lang, 'Less supportive directions', 'कम सहायक दिशाएँ'), k.lessSupportive.map((d) => directionLabel(lang, d)).join(', ')],
  ];
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

export function luckyTable(lang: Lang): BlockRenderer {
  return (ctx) => {
    const n = numerologyExtOf(ctx.ext);
    const pr = n.profile;
    const s = ctx.snapshot.subject;
    const mp = NUMBER_PLANET[pr.mulank];
    const bp = NUMBER_PLANET[pr.bhagyank];
    const harmonious = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((k) => numberHarmony(pr.mulank, k) === 'harmonious');
    const demanding = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((k) => numberHarmony(pr.mulank, k) === 'demanding');
    const rows: Array<[string, string]> = [
      [L(lang, 'Name', 'नाम'), s.name],
      ...(pr.name ? [[L(lang, 'Name number (Chaldean)', 'नामांक (कैल्डियन)'), `${pr.name.number.value} (${pr.name.number.compound})`] as [string, string]] : []),
      [L(lang, 'Date of birth', 'जन्म तिथि'), dateLabel(lang, s.dateOfBirth)],
      [L(lang, 'Gender', 'लिंग'), L(lang, GENDER_LABEL[s.gender ?? 'other'].en, GENDER_LABEL[s.gender ?? 'other'].hi)],
      [L(lang, 'Western Sun sign', 'पाश्चात्य सूर्य राशि'), signLabel(lang, n.sunSign)],
      [L(lang, 'Mulank (driver number)', 'मूलांक'), `${pr.mulank} — ${planetLabel(lang, mp)}`],
      [L(lang, 'Bhagyank (destiny number)', 'भाग्यांक'), `${pr.bhagyank} — ${planetLabel(lang, bp)}`],
      [L(lang, 'Kua number', 'कुआ नंबर'), pr.kua ? String(pr.kua.value) : L(lang, `${pr.kuaBoth!.male.value} (male formula) / ${pr.kuaBoth!.female.value} (female formula)`, `${pr.kuaBoth!.male.value} (पुरुष सूत्र) / ${pr.kuaBoth!.female.value} (महिला सूत्र)`)],
      [L(lang, 'Numbers in harmony with you', 'आपके अनुकूल अंक'), harmonious.join(', ') || L(lang, 'none', 'कोई नहीं')],
      [L(lang, 'Numbers that need patience', 'धैर्य माँगने वाले अंक'), demanding.join(', ') || L(lang, 'none', 'कोई नहीं')],
      [L(lang, 'Supportive colours', 'शुभ रंग'), L(lang, PLANET_COLOUR[mp].en, PLANET_COLOUR[mp].hi)],
      [L(lang, 'Supportive weekday', 'शुभ वार'), L(lang, PLANET_DAY[mp].en, PLANET_DAY[mp].hi)],
      [L(lang, 'Supportive dates', 'शुभ तारीखें'), numbersReducingTo(pr.mulank, 1, 31).join(', ')],
      [L(lang, 'Resonant ages', 'विशेष आयु-वर्ष'), numbersReducingTo(pr.mulank, 1, 90).join(', ')],
      [L(lang, 'Personal year now', 'वर्तमान व्यक्तिगत वर्ष'), `${pr.personalYearNow} (${pr.months[0].year})`],
      [L(lang, 'Favourable mantra (free to recite)', 'अनुकूल मंत्र (निःशुल्क जप)'), BEEJ_MANTRA[mp].dev],
    ];
    return {
      tex: kv(lang, rows),
      evidenceIds: ['numerology.mulank', 'numerology.bhagyank', 'num.mulank.planet', 'num.bhagyank.planet', 'num.sun-sign', 'num.friendly-numbers', 'num.demanding-numbers',
        'num.colours', 'num.weekday', 'num.lucky-dates', 'num.py.current', ...(pr.name ? ['num.name.number'] : []), ...(pr.kua ? ['num.kua'] : ['num.kua.male-formula', 'num.kua.female-formula'])],
      method: L(lang,
        'Mulank = digit sum of the birth day; Bhagyank = digit sum of the full date; name number = Chaldean letter values (Cheiro). Harmony is read from the natural friendships of the ruling planets (BPHS). Colours, weekday and mantra belong to the Mulank\'s ruling planet; dates and ages are those that reduce to the Mulank.',
        'मूलांक = जन्म दिन के अंकों का योग; भाग्यांक = पूरी जन्म तिथि के अंकों का योग; नामांक = कैल्डियन अक्षर-मान (कीरो)। अंकों का सामंजस्य स्वामी ग्रहों की नैसर्गिक मित्रता (बृहत् पाराशर होरा शास्त्र) से लिया गया है। रंग, वार और मंत्र मूलांक के स्वामी ग्रह के हैं; तारीखें और आयु-वर्ष वे हैं जिनका योग मूलांक बनता है।'),
    };
  };
}

export function coreNumbersTable(lang: Lang): BlockRenderer {
  return (ctx) => {
    const pr = p(ctx);
    const b = pr.birth;
    const dd = String(b.day).padStart(2, '0');
    const mm = String(b.month).padStart(2, '0');
    const rows: string[][] = [
      [L(lang, 'Mulank', 'मूलांक'), `${dd} → ${pr.mulank}`, planetLabel(lang, NUMBER_PLANET[pr.mulank])],
      [L(lang, 'Bhagyank', 'भाग्यांक'), `${dd}${mm}${b.year} → ${pr.bhagyank}`, planetLabel(lang, NUMBER_PLANET[pr.bhagyank])],
    ];
    const ids = ['numerology.mulank', 'numerology.bhagyank', 'num.mulank.planet', 'num.bhagyank.planet', 'num.bridge.mulank-bhagyank'];
    if (pr.name) {
      rows.push([L(lang, 'Name number', 'नामांक'), `${pr.name.number.compound} → ${pr.name.number.value}`, planetLabel(lang, NUMBER_PLANET[pr.name.number.value])]);
      rows.push([L(lang, 'Soul urge (vowels)', 'आत्मा आग्रह अंक (स्वर)'), `${pr.name.soulUrge.compound} → ${pr.name.soulUrge.value}`, pr.name.soulUrge.value ? planetLabel(lang, NUMBER_PLANET[pr.name.soulUrge.value]) : '—']);
      rows.push([L(lang, 'Personality (consonants)', 'व्यक्तित्व अंक (व्यंजन)'), `${pr.name.personality.compound} → ${pr.name.personality.value}`, pr.name.personality.value ? planetLabel(lang, NUMBER_PLANET[pr.name.personality.value]) : '—']);
      rows.push([L(lang, 'Maturity', 'परिपक्वता अंक'), `${pr.bhagyank} + ${pr.name.number.value} → ${pr.maturity}`, planetLabel(lang, NUMBER_PLANET[pr.maturity!])]);
      ids.push('num.name.number', 'num.soul-urge', 'num.personality', 'num.maturity');
    }
    rows.push([L(lang, 'Bridge (Mulank–Bhagyank)', 'सेतु अंक (मूलांक–भाग्यांक)'), `|${pr.mulank} − ${pr.bhagyank}| → ${pr.bridges.mulankBhagyank}`, '—']);
    rows.push([L(lang, `Personal year ${pr.months[0].year}`, `व्यक्तिगत वर्ष ${pr.months[0].year}`), `${pr.personalYearNow}`, planetLabel(lang, NUMBER_PLANET[pr.personalYearNow])]);
    ids.push('num.py.current');
    return {
      tex: grid('>{\\raggedright\\arraybackslash}p{0.34\\linewidth}>{\\raggedright\\arraybackslash}p{0.34\\linewidth}X',
        [L(lang, 'Number', 'अंक'), L(lang, 'Working', 'गणना'), L(lang, 'Ruling planet', 'स्वामी ग्रह')], rows),
      evidenceIds: ids,
      method: L(lang, 'Every figure is reduced by repeated digit-summing to 1–9; the working column shows the starting figure.', 'हर अंक को बार-बार अंक-योग करके 1–9 तक घटाया गया है; गणना स्तंभ आरंभिक संख्या दिखाता है।'),
    };
  };
}

export function friendshipMatrix(lang: Lang): BlockRenderer {
  return (ctx) => {
    const pr = p(ctx);
    const mp = NUMBER_PLANET[pr.mulank];
    const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => {
      const kp = NUMBER_PLANET[k];
      const h = numberHarmony(pr.mulank, k);
      return [
        `${pr.mulank} & ${k}`,
        planetLabel(lang, kp),
        k === pr.mulank ? '—' : L(lang, RELATION_LABEL[planetRelation(mp, kp)].en, RELATION_LABEL[planetRelation(mp, kp)].hi),
        k === pr.mulank ? '—' : L(lang, RELATION_LABEL[planetRelation(kp, mp)].en, RELATION_LABEL[planetRelation(kp, mp)].hi),
        L(lang, HARMONY_LABEL[h].en, HARMONY_LABEL[h].hi),
      ];
    });
    return {
      tex: grid('p{0.11\\linewidth}p{0.13\\linewidth}>{\\raggedright\\arraybackslash}X>{\\raggedright\\arraybackslash}X>{\\raggedright\\arraybackslash}p{0.17\\linewidth}',
        [L(lang, 'Pair', 'जोड़ी'), L(lang, 'Ruler', 'स्वामी'), L(lang, `${mp} sees it as`, `${planetLabel(lang, mp)} की दृष्टि में`), L(lang, `It sees ${mp} as`, `उसकी दृष्टि में ${planetLabel(lang, mp)}`), L(lang, 'Harmony', 'सामंजस्य')], rows),
      evidenceIds: ['numerology.mulank', ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `num.harmony.${k}`)],
      method: L(lang,
        'Natural (naisargika) friendships of the ruling planets, read in both directions (BPHS ch. 3). Harmonious = friendly on at least one side with no enmity on the other; needs patience = mutual enmity; mixed = everything else. These are tendencies, never verdicts on a person.',
        'स्वामी ग्रहों की नैसर्गिक मित्रता, दोनों दिशाओं से (बृहत् पाराशर होरा शास्त्र, अध्याय 3)। सामंजस्यपूर्ण = कम से कम एक ओर मित्रता और दूसरी ओर शत्रुता नहीं; धैर्य अपेक्षित = परस्पर शत्रुता; शेष = मिश्रित। ये प्रवृत्तियाँ हैं, किसी व्यक्ति पर निर्णय नहीं।'),
    };
  };
}

export function devotionTable(lang: Lang): BlockRenderer {
  return (ctx) => {
    const pr = p(ctx);
    const rows: string[][] = [pr.mulank, pr.bhagyank]
      .filter((v, i, a) => a.indexOf(v) === i)
      .map((num) => {
        const pl = NUMBER_PLANET[num];
        return [
          `${num} — ${planetLabel(lang, pl)}`,
          L(lang, PLANET_DAY[pl].en, PLANET_DAY[pl].hi),
          L(lang, PLANET_AVATAR[pl].en, PLANET_AVATAR[pl].hi),
          BEEJ_MANTRA[pl].dev,
        ];
      });
    return {
      tex: grid('p{0.17\\linewidth}p{0.14\\linewidth}p{0.15\\linewidth}>{\\raggedright\\arraybackslash}X',
        [L(lang, 'Number & planet', 'अंक और ग्रह'), L(lang, 'Weekday / fast', 'वार / व्रत'), L(lang, 'Deity form', 'देव स्वरूप'), L(lang, 'Beej mantra', 'बीज मंत्र')], rows),
      evidenceIds: ['numerology.mulank', 'numerology.bhagyank', 'num.weekday', 'num.avatar'],
      method: L(lang,
        'Deity forms follow the Vishnu-avatar association of each planet given in Brihat Parashara Hora Shastra (ch. 2); the weekday is the planet\'s traditional day; beej mantras are the traditional Navagraha mantras. Fasting is optional and only if your health allows. Nothing here needs to be bought.',
        'देव स्वरूप बृहत् पाराशर होरा शास्त्र (अध्याय 2) में दिए गए ग्रह–विष्णु अवतार संबंध से लिए गए हैं; वार ग्रह का पारंपरिक दिन है; बीज मंत्र पारंपरिक नवग्रह मंत्र हैं। व्रत वैकल्पिक है और केवल स्वास्थ्य अनुमति दे तभी। इसमें कुछ भी खरीदने की आवश्यकता नहीं है।'),
    };
  };
}

/** TikZ Lo Shu grid with the client's repeated digits. */
function loShuTikz(lang: Lang, counts: Record<number, number>, withLabels: boolean): string {
  const cells: string[] = [];
  LO_SHU_LAYOUT.forEach((row, r) =>
    row.forEach((num, c) => {
      const x = c * 2.6 + 1.3;
      const y = (2 - r) * 2.1 + 1.05;
      const count = counts[num] ?? 0;
      const digits = count ? String(num).repeat(Math.min(count, 5)) : '';
      const fill = count ? 'Tint' : 'white';
      cells.push(`\\fill[${fill}] (${c * 2.6},${(2 - r) * 2.1}) rectangle +(2.6,2.1);`);
      cells.push(`\\node[font=\\displayfont\\fontsize{${count > 3 ? 15 : 20}}{22}\\selectfont,text=Primary] at (${x},${y + (withLabels ? 0.15 : 0)}) {${digits || '\\textcolor{Muted!50}{\\fontsize{10}{12}\\selectfont ' + num + '}'}};`);
      if (withLabels) {
        const cell = LO_SHU_CELL[num];
        cells.push(`\\node[font=\\sffamily\\fontsize{6.2}{7.5}\\selectfont,text=Muted] at (${x},${y - 0.72}) {${tex(L(lang, DIRECTION_SHORT[cell.direction].en, DIRECTION_SHORT[cell.direction].hi))} · ${tex(lang === 'hi' ? ELEMENT_HI[cell.element].split(' ')[0] : cell.element)}};`);
      }
    })
  );
  return [
    '\\begin{center}\\begin{tikzpicture}',
    ...cells,
    '\\draw[Primary,line width=1.1pt] (0,0) rectangle (7.8,6.3);',
    '\\draw[Accent,line width=0.6pt] (2.6,0) -- (2.6,6.3) (5.2,0) -- (5.2,6.3) (0,2.1) -- (7.8,2.1) (0,4.2) -- (7.8,4.2);',
    '\\end{tikzpicture}\\end{center}',
  ].join('\n');
}

export function loShuBlock(lang: Lang): BlockRenderer {
  return (ctx) => {
    const g = p(ctx).loShu;
    const rows: Array<[string, string]> = [
      [L(lang, 'Digits placed', 'ग्रिड में रखे अंक'), g.sourceDigits.join(' ')],
      [L(lang, 'Present numbers', 'उपस्थित अंक'), g.present.map((k) => `${k}×${g.counts[k]}`).join(', ')],
      [L(lang, 'Repeated numbers', 'दोहराए गए अंक'), g.repeated.join(', ') || L(lang, 'none', 'कोई नहीं')],
      [L(lang, 'Missing numbers', 'अनुपस्थित (मिसिंग) अंक'), g.missing.join(', ') || L(lang, 'none', 'कोई नहीं')],
      [L(lang, 'Complete lines', 'पूर्ण रेखाएँ'), g.completeLines.map((id) => L(lang, LINE_LABEL[id].en, LINE_LABEL[id].hi)).join('; ') || L(lang, 'none', 'कोई नहीं')],
      [L(lang, 'Empty lines', 'रिक्त रेखाएँ'), g.emptyLines.map((id) => L(lang, LINE_LABEL[id].en, LINE_LABEL[id].hi)).join('; ') || L(lang, 'none', 'कोई नहीं')],
    ];
    return {
      tex: loShuTikz(lang, g.counts, true) + '\n' + kv(lang, rows),
      evidenceIds: [...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `num.loshu.count.${k}`), 'num.loshu.missing', 'num.loshu.repeated', 'num.loshu.complete-lines', 'num.loshu.empty-lines'],
      method: L(lang,
        `Lo Shu grid (4-9-2 / 3-5-7 / 8-1-6, South at the top) filled with the non-zero digits of your date of birth${g.addedMulank ? ', your Mulank (your birth day has two digits)' : ''} and your Bhagyank. Shaded cells are occupied; each digit is written once per occurrence.`,
        `लो शू ग्रिड (4-9-2 / 3-5-7 / 8-1-6, ऊपर दक्षिण) जन्म तिथि के शून्य-रहित अंकों${g.addedMulank ? ', मूलांक (क्योंकि जन्म दिन दो अंकों का है)' : ''} और भाग्यांक से भरा गया है। रंगीन खाने भरे हुए हैं; हर अंक जितनी बार आया, उतनी बार लिखा गया है।`),
    };
  };
}

export function kuaBlock(lang: Lang): BlockRenderer {
  return (ctx) => {
    const pr = p(ctx);
    const g = pr.loShu;
    const elementRows: string[][] = ['Water', 'Wood', 'Fire', 'Earth', 'Metal'].map((el) => {
      const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((k) => LO_SHU_CELL[k].element === el);
      const total = nums.reduce((a, k) => a + g.counts[k], 0);
      return [elementLabel(lang, el), nums.join(', '), nums.map((k) => directionLabel(lang, LO_SHU_CELL[k].direction)).join(', '), String(total)];
    });
    const elementTable = grid('p{0.17\\linewidth}p{0.15\\linewidth}>{\\raggedright\\arraybackslash}X p{0.16\\linewidth}',
      [L(lang, 'Element', 'तत्व'), L(lang, 'Grid numbers', 'ग्रिड अंक'), L(lang, 'Directions', 'दिशाएँ'), L(lang, 'Digits you have', 'आपके अंक')], elementRows);
    let kuaTex: string;
    let ids: string[];
    if (pr.kua) {
      kuaTex = kv(lang, kuaRows(lang, pr.kua));
      ids = ['num.kua', 'num.kua.element', 'num.kua.group', 'num.kua.direction.success', 'num.kua.direction.health', 'num.kua.direction.relationships', 'num.kua.direction.growth'];
    } else {
      const b = pr.kuaBoth!;
      kuaTex = `{\\fontsize{9.5}{13}\\selectfont ${tex(L(lang, 'The Kua formula differs for men and women, and no gender was given, so both results are shown.', 'कुआ सूत्र पुरुष और महिला के लिए अलग है; लिंग नहीं दिया गया, इसलिए दोनों परिणाम दिखाए गए हैं।'))}\\par}\n`
        + kv(lang, kuaRows(lang, b.male), [L(lang, 'Male formula', 'पुरुष सूत्र'), '']) + kv(lang, kuaRows(lang, b.female), [L(lang, 'Female formula', 'महिला सूत्र'), '']);
      ids = ['num.kua.male-formula', 'num.kua.female-formula'];
    }
    return {
      tex: `${kuaTex}\n\\vspace{2mm}{\\sffamily\\fontsize{8.5}{10.5}\\selectfont\\bfseries\\color{Primary}${tex(L(lang, 'ELEMENTS IN YOUR GRID', 'आपके ग्रिड के तत्व'))}\\par}\n${elementTable}`,
      evidenceIds: [...ids, 'num.loshu.elements', 'num.loshu.elements-absent'],
      method: L(lang,
        'Kua (Eight Mansions): with y = digit sum of the solar birth year (a birth before 4 February counts to the previous year), male = 11 − y and female = 4 + y, reduced to 1–9; a result of 5 becomes 2 for men and 8 for women. The four favourable directions are Sheng Qi (success), Tian Yi (health), Yan Nian (relationships) and Fu Wei (personal growth).',
        'कुआ (अष्ट-भवन पद्धति): सौर जन्म वर्ष (4 फ़रवरी से पहले का जन्म पिछले वर्ष में गिना जाता है) के अंकों का योग y हो, तो पुरुष = 11 − y और महिला = 4 + y, फिर 1–9 तक घटाएँ; परिणाम 5 आए तो पुरुष के लिए 2 और महिला के लिए 8। चार अनुकूल दिशाएँ: शेंग ची (सफलता), तियान यी (स्वास्थ्य), यान नियान (संबंध) और फू वेई (व्यक्तिगत विकास)।'),
    };
  };
}

export function nameBlock(lang: Lang): BlockRenderer {
  return (ctx) => {
    const pr = p(ctx);
    if (!pr.name) throw new Error('BLOCK_DATA_MISSING: name numerology (no Latin letters in the name)');
    const words = ctx.snapshot.subject.name.split(/\s+/).map(nameLetters).filter((w) => w.length);
    const cellOf = (c: string) => `\\begin{tabular}{@{}c@{}}{\\displayfont\\fontsize{13}{15}\\selectfont\\color{${VOWELS.has(c) ? 'Accent' : 'Primary'}}${c}}\\\\[-1pt]{\\sffamily\\fontsize{8}{9}\\selectfont ${CHALDEAN[c]}}\\end{tabular}`;
    const strip = `\\begin{center}${words.map((w) => w.map(cellOf).join('\\hspace{2.2mm}')).join('\\hspace{7mm}')}\\end{center}`;
    const nm = pr.name;
    const rows: Array<[string, string]> = [
      [L(lang, 'Name analysed', 'विश्लेषित नाम'), ctx.snapshot.subject.name],
      [L(lang, 'Total of all letters', 'सभी अक्षरों का योग'), `${nm.number.compound} → ${nm.number.value}`],
      [L(lang, 'Name number and its planet', 'नामांक और उसका ग्रह'), `${nm.number.value} — ${planetLabel(lang, NUMBER_PLANET[nm.number.value])}`],
      [L(lang, 'First letter', 'पहला अक्षर'), `${nm.firstLetter} = ${nm.firstLetterValue} (${planetLabel(lang, NUMBER_PLANET[nm.firstLetterValue])})`],
      [L(lang, 'Soul urge (vowels A E I O U)', 'आत्मा आग्रह अंक (स्वर A E I O U)'), `${nm.soulUrge.compound} → ${nm.soulUrge.value}`],
      [L(lang, 'Personality (consonants)', 'व्यक्तित्व अंक (व्यंजन)'), `${nm.personality.compound} → ${nm.personality.value}`],
      [L(lang, 'Harmony with your Mulank', 'मूलांक से सामंजस्य'), L(lang, HARMONY_LABEL[numberHarmony(pr.mulank, nm.number.value)].en, HARMONY_LABEL[numberHarmony(pr.mulank, nm.number.value)].hi)],
    ];
    return {
      tex: strip + '\n' + kv(lang, rows),
      evidenceIds: ['num.name.number', 'num.name.planet', 'num.name.first-letter', 'num.soul-urge', 'num.personality', 'num.name.harmony'],
      method: L(lang,
        'Chaldean values (Cheiro): A I J Q Y = 1, B K R = 2, C G L S = 3, D M T = 4, E H N X = 5, U V W = 6, O Z = 7, F P = 8. Vowels (shown in gold) give the soul urge; consonants give the personality number. Y counts as a consonant.',
        'कैल्डियन अक्षर-मान (कीरो): A I J Q Y = 1, B K R = 2, C G L S = 3, D M T = 4, E H N X = 5, U V W = 6, O Z = 7, F P = 8। स्वर (सुनहरे रंग में) आत्मा आग्रह अंक देते हैं; व्यंजन व्यक्तित्व अंक। Y को व्यंजन माना गया है।'),
    };
  };
}

/** Planes-of-expression table for any name (used by Fortune and Baby Name). */
export function planesTable(lang: Lang, name: string): string {
  const letters = nameLetters(name);
  const cols = NAME_PLANE_ORDER.map((plane) =>
    NAME_PLANES[plane]
      .map((l) => ({ l, c: letters.filter((x) => x === l).length }))
      .filter((x) => x.c > 0)
      .map((x) => `${x.l} (${x.c})`)
  );
  const depth = Math.max(1, ...cols.map((c) => c.length));
  const rows: string[][] = [];
  for (let i = 0; i < depth; i++) rows.push(cols.map((c) => c[i] ?? ''));
  const totals = cols.map((_, j) => String(NAME_PLANES[NAME_PLANE_ORDER[j]].reduce((a, l) => a + letters.filter((x) => x === l).length, 0)));
  return [
    '\\begin{center}\\begin{tabularx}{\\linewidth}{XXXX}',
    `\\TableHead${NAME_PLANE_ORDER.map((pl) => `\\THd{${tex(L(lang, NAME_PLANE_LABEL[pl].en, NAME_PLANE_LABEL[pl].hi))}}`).join(' & ')}\\\\`,
    ...rows.map((r, i) => `${i % 2 ? '\\rowcolor{Surface}' : ''}${r.map((c) => `\\TCell{${tex(c)}}`).join(' & ')}\\\\`),
    `\\rowcolor{Tint}${totals.map((t) => `\\TCell{\\textbf{${tex(L(lang, 'Total', 'कुल'))}: ${t}}}`).join(' & ')}\\\\`,
    '\\bottomrule\\end{tabularx}\\end{center}',
  ].join('\n');
}

export const PLANES_METHOD = {
  en: 'Planes of expression: each letter belongs to one plane — Mental A G H J L N P; Physical D E M W; Emotional B I O R S T X Z; Intuitive C F K Q U V Y. The figure in brackets is how often the letter occurs.',
  hi: 'अभिव्यक्ति के तल: हर अक्षर एक तल का है — मानसिक A G H J L N P; शारीरिक D E M W; भावनात्मक B I O R S T X Z; अंतर्ज्ञान C F K Q U V Y। कोष्ठक में अंक बताता है कि अक्षर कितनी बार आया।',
};

export function namePlanesBlock(lang: Lang): BlockRenderer {
  return (ctx) => {
    if (!p(ctx).name) throw new Error('BLOCK_DATA_MISSING: name numerology');
    return {
      tex: planesTable(lang, ctx.snapshot.subject.name),
      evidenceIds: NAME_PLANE_ORDER.map((pl) => `num.name.plane.${pl}`),
      method: L(lang, PLANES_METHOD.en, PLANES_METHOD.hi),
    };
  };
}

/** NUM-017 Standard personal-cycle keywords (Pythagorean). */
export const CYCLE_KEYWORD: Record<number, { en: string; hi: string }> = {
  1: { en: 'New beginnings, initiative', hi: 'नई शुरुआत, पहल' },
  2: { en: 'Cooperation, patience, partnership', hi: 'सहयोग, धैर्य, साझेदारी' },
  3: { en: 'Expression, creativity, social life', hi: 'अभिव्यक्ति, रचनात्मकता, सामाजिकता' },
  4: { en: 'Work, structure, foundations', hi: 'परिश्रम, व्यवस्था, नींव' },
  5: { en: 'Change, movement, freedom', hi: 'परिवर्तन, गतिशीलता, स्वतंत्रता' },
  6: { en: 'Home, family, responsibility', hi: 'घर, परिवार, ज़िम्मेदारी' },
  7: { en: 'Reflection, study, inner work', hi: 'चिंतन, अध्ययन, आत्मिक कार्य' },
  8: { en: 'Achievement, management, material matters', hi: 'उपलब्धि, प्रबंधन, भौतिक विषय' },
  9: { en: 'Completion, release, compassion', hi: 'पूर्णता, त्याग, करुणा' },
};

export function monthsTable(lang: Lang): BlockRenderer {
  return (ctx) => {
    const pr = p(ctx);
    const rows = pr.months.map((m) => [
      String(m.index),
      `${monthLabel(lang, m.month)} ${m.year}`,
      String(m.personalYear),
      String(m.personalMonth),
      L(lang, CYCLE_KEYWORD[m.personalMonth].en, CYCLE_KEYWORD[m.personalMonth].hi),
    ]);
    return {
      tex: grid('p{0.06\\linewidth}p{0.2\\linewidth}p{0.13\\linewidth}p{0.13\\linewidth}>{\\raggedright\\arraybackslash}X',
        ['#', L(lang, 'Month', 'माह'), L(lang, 'Personal year', 'व्यक्तिगत वर्ष'), L(lang, 'Personal month', 'व्यक्तिगत माह'), L(lang, 'Theme', 'मुख्य विषय')], rows),
      evidenceIds: ['num.py.current', 'num.py.next', ...pr.months.map((m) => `num.pm.${String(m.index).padStart(2, '0')}`)],
      method: L(lang,
        'Personal year = digit sum of your birth day + birth month + the calendar year; personal month = personal year + calendar month number; both reduced to 1–9. Themes are the standard keywords of each cycle number.',
        'व्यक्तिगत वर्ष = जन्म दिन + जन्म माह + कैलेंडर वर्ष के अंकों का योग; व्यक्तिगत माह = व्यक्तिगत वर्ष + कैलेंडर माह की संख्या; दोनों को 1–9 तक घटाया गया है। विषय हर चक्र-अंक के मानक संकेत-शब्द हैं।'),
    };
  };
}

export function cyclesTable(lang: Lang): BlockRenderer {
  return (ctx) => {
    const pr = p(ctx);
    const rows = pr.cycles.map((c) => [
      String(c.index),
      c.toAge === undefined ? L(lang, `${c.fromAge} onwards`, `${c.fromAge} से आगे`) : `${c.fromAge}–${c.toAge}`,
      c.toYear === undefined ? L(lang, `${c.fromYear} onwards`, `${c.fromYear} से आगे`) : `${c.fromYear}–${c.toYear}`,
      `${c.pinnacle} (${L(lang, CYCLE_KEYWORD[c.pinnacle].en, CYCLE_KEYWORD[c.pinnacle].hi).split(',')[0]})`,
      String(c.challenge),
    ]);
    const cur = pr.cycles.indexOf(pr.currentCycle);
    return {
      tex: grid('p{0.08\\linewidth}p{0.16\\linewidth}p{0.18\\linewidth}>{\\raggedright\\arraybackslash}X p{0.14\\linewidth}',
        [L(lang, 'Cycle', 'चक्र'), L(lang, 'Ages', 'आयु'), L(lang, 'Years', 'वर्ष'), L(lang, 'Pinnacle (opportunity)', 'शिखर अंक (अवसर)'), L(lang, 'Challenge', 'चुनौती अंक')], rows, (i) => i === cur),
      evidenceIds: [1, 2, 3, 4].flatMap((i) => [`num.pinnacle.${i}`, `num.challenge.${i}`]).concat(['num.cycle.current', 'num.age']),
      method: L(lang,
        `With month, day and year each reduced to 1–9: pinnacles P1 = month + day, P2 = day + year, P3 = P1 + P2, P4 = month + year; challenges C1 = |month − day|, C2 = |day − year|, C3 = |C1 − C2|, C4 = |month − year|. The first cycle ends at age 36 − Bhagyank (${36 - pr.bhagyank}); the next two last nine years each. The highlighted row is your current cycle.`,
        `माह, दिन और वर्ष को 1–9 तक घटाकर: शिखर P1 = माह + दिन, P2 = दिन + वर्ष, P3 = P1 + P2, P4 = माह + वर्ष; चुनौतियाँ C1 = |माह − दिन|, C2 = |दिन − वर्ष|, C3 = |C1 − C2|, C4 = |माह − वर्ष|। पहला चक्र 36 − भाग्यांक (${36 - pr.bhagyank}) की आयु पर समाप्त होता है; अगले दो चक्र नौ-नौ वर्ष के हैं। रंगीन पंक्ति आपका वर्तमान चक्र है।`),
    };
  };
}

export function everydayItems(lang: Lang): BlockRenderer {
  return (ctx) => {
    const n = numerologyExtOf(ctx.ext);
    const pr = n.profile;
    const mp = NUMBER_PLANET[pr.mulank];
    const handle = nameLetters(ctx.snapshot.subject.name).join('').toLowerCase();
    const rows: Array<[string, string]> = [
      [L(lang, 'Supportive weekday for new starts', 'नए काम के लिए शुभ वार'), L(lang, PLANET_DAY[mp].en, PLANET_DAY[mp].hi)],
      [L(lang, 'Colours to wear or keep around', 'पहनने/आसपास रखने के रंग'), L(lang, PLANET_COLOUR[mp].en, PLANET_COLOUR[mp].hi)],
      [L(lang, 'Dates to schedule important steps', 'महत्त्वपूर्ण कार्यों की तारीखें'), numbersReducingTo(pr.mulank, 1, 31).join(', ')],
      [L(lang, 'Numbers to favour (house, vehicle, phone endings)', 'पसंद करने योग्य अंक (मकान, वाहन, फ़ोन)'), [pr.mulank, ...[1, 2, 3, 4, 5, 6, 7, 8, 9].filter((k) => numberHarmony(pr.mulank, k) === 'harmonious')].join(', ')],
      [L(lang, 'Symbol for art or a motif', 'कला या प्रतीक के लिए चिह्न'), L(lang, `${n.sunSign} (your Western Sun sign)`, `${signLabel(lang, n.sunSign)} (आपकी पाश्चात्य सूर्य राशि)`)],
    ];
    const ids = ['num.weekday', 'num.colours', 'num.lucky-dates', 'num.friendly-numbers', 'num.sun-sign'];
    if (handle) {
      const total = handle.toUpperCase().split('').reduce((a, c) => a + CHALDEAN[c], 0);
      const suffix = ((pr.mulank - reduceToDigit(total) + 9) % 9) || 9;
      rows.push([L(lang, 'An email/user-name idea', 'ईमेल/यूज़र-नेम का सुझाव'), `${handle}${suffix}  (${total} + ${suffix} → ${reduceToDigit(total + suffix)})`]);
    }
    return {
      tex: kv(lang, rows),
      evidenceIds: ids,
      method: L(lang,
        'Everyday items follow your Mulank\'s ruling planet. The user-name idea adds one digit to the Chaldean total of your name letters so that the whole reduces to your Mulank — a playful, optional touch.',
        'दैनिक वस्तुएँ मूलांक के स्वामी ग्रह पर आधारित हैं। यूज़र-नेम सुझाव में नाम के अक्षरों के कैल्डियन योग में एक अंक जोड़ा गया है ताकि कुल योग आपका मूलांक बने — यह एक हल्का, वैकल्पिक सुझाव है।'),
    };
  };
}

export function mantraBlock(lang: Lang): BlockRenderer {
  return (ctx) => {
    const pr = p(ctx);
    const planets = [NUMBER_PLANET[pr.mulank], NUMBER_PLANET[pr.bhagyank]].filter((v, i, a) => a.indexOf(v) === i);
    const card = (title: string, dev: string, roman: string, note: string) =>
      `\\begin{asCard}\\CardTitle{${tex(title)}}{\\fontsize{12}{17}\\selectfont\\color{Primary}${tex(dev)}\\par}\\vspace{0.8mm}{\\fontsize{9}{12}\\selectfont\\itshape ${tex(roman)}\\par}\\vspace{0.8mm}{\\fontsize{8.8}{12}\\selectfont\\color{Muted}${tex(note)}\\par}\\end{asCard}`;
    const cards = planets.map((pl) =>
      card(L(lang, `Beej mantra of ${pl}`, `${planetLabel(lang, pl)} का बीज मंत्र`), BEEJ_MANTRA[pl].dev, BEEJ_MANTRA[pl].roman,
        L(lang, `Recite 11 or 108 times, ideally on ${PLANET_DAY[pl].en}, facing east or north, with a calm mind.`, `11 या 108 बार, संभव हो तो ${PLANET_DAY[pl].hi} को, पूर्व या उत्तर की ओर मुख करके, शांत मन से जप करें।`)));
    cards.push(card(L(lang, 'Mahamrityunjaya mantra (for well-being)', 'महामृत्युंजय मंत्र (कल्याण के लिए)'), MAHAMRITYUNJAYA.dev, MAHAMRITYUNJAYA.roman,
      L(lang, 'A Rigvedic prayer for health and inner strength; recite slowly, 11 times in the morning. It supports, never replaces, medical care.', 'स्वास्थ्य और आंतरिक शक्ति के लिए ऋग्वैदिक प्रार्थना; सुबह धीरे-धीरे 11 बार जप करें। यह चिकित्सा का साथ देती है, उसका स्थान नहीं लेती।')));
    return {
      tex: cards.join('\n\\vspace{1.5mm}\n'),
      evidenceIds: ['num.mulank.planet', 'num.bhagyank.planet', 'num.weekday'],
      method: L(lang, 'Traditional Navagraha beej mantras of your Mulank and Bhagyank rulers. Free, optional and devotional; nothing to buy.', 'आपके मूलांक और भाग्यांक के स्वामी ग्रहों के पारंपरिक नवग्रह बीज मंत्र। निःशुल्क, वैकल्पिक और भक्तिपूर्ण; कुछ भी खरीदना नहीं है।'),
    };
  };
}

/** All shared numerology blocks under a report prefix (e.g. `fortune-lucky-table`). */
export function numerologyBlocks(prefix: string, lang: Lang): Record<string, BlockRenderer> {
  return {
    [`${prefix}-lucky-table`]: luckyTable(lang),
    [`${prefix}-core-numbers`]: coreNumbersTable(lang),
    [`${prefix}-friendship`]: friendshipMatrix(lang),
    [`${prefix}-devotion`]: devotionTable(lang),
    [`${prefix}-loshu`]: loShuBlock(lang),
    [`${prefix}-kua`]: kuaBlock(lang),
    [`${prefix}-name`]: nameBlock(lang),
    [`${prefix}-name-planes`]: namePlanesBlock(lang),
    [`${prefix}-months`]: monthsTable(lang),
    [`${prefix}-cycles`]: cyclesTable(lang),
    [`${prefix}-everyday`]: everydayItems(lang),
    [`${prefix}-mantras`]: mantraBlock(lang),
  };
}

export type { BlockOutput };
