/**
 * Report illustrations (presentation only).
 *
 * Pictures come from a curated library of freely-licensed photographs and
 * historic engravings (templates/assets/library, see its SOURCES.md). Which
 * picture goes where is decided by fixed keyword rules over the section and
 * topic titles: no LLM is involved, the same definition and chart always give
 * the same plan, and no picture is used twice in one report. A section or topic
 * with no relevant unused picture simply has none.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ReportDefinition, ReportSection, ReportTopic } from '../contracts';
import { tex } from './latex';

export interface LibraryImage {
  id: string;
  file: string;
  subjects: string[];
  caption: string;
  credit: string;
  license: string;
  sourceUrl: string;
  width: number;
  height: number;
  /** The picture shows people; preferred, because a person at work says more than an object. */
  people?: boolean;
}

export interface IllustrationPlan {
  /** Topic id → small picture beside the passage. */
  topics: Map<string, LibraryImage>;
  /** Every picture used, in order of appearance (for the credits page). */
  used: LibraryImage[];
}

export const EMPTY_PLAN: IllustrationPlan = { topics: new Map(), used: [] };

const LIBRARY_DIR = path.resolve(__dirname, '../../../templates/assets/library');

let cachedLibrary: LibraryImage[] | undefined;

/** The curated library, or an empty list when it is not installed. */
export function loadImageLibrary(dir: string = LIBRARY_DIR): LibraryImage[] {
  if (dir === LIBRARY_DIR && cachedLibrary) return cachedLibrary;
  const manifest = path.join(dir, 'library.json');
  let images: LibraryImage[] = [];
  if (fs.existsSync(manifest)) {
    const raw = JSON.parse(fs.readFileSync(manifest, 'utf-8')) as LibraryImage[];
    images = raw.filter((i) => i.width > 0 && i.height > 0 && fs.existsSync(path.join(dir, i.file)));
  }
  if (dir === LIBRARY_DIR) cachedLibrary = images;
  return images;
}

/**
 * Keyword → subject tag, in priority order: the planet or point a passage is
 * about first, then its life theme, then general mood. Matched against the
 * section or topic id, title and subtitle.
 */
const SUBJECT_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/saturn|shani|sade sati|dhaiya|kantaka/, 'saturn'],
  [/jupiter|brihaspati/, 'jupiter'],
  [/rahu/, 'rahu'],
  [/ketu/, 'ketu'],
  [/\bsun\b|\bsun's|surya|solar return/, 'sun'],
  [/venus|shukra/, 'venus'],
  [/\bmars\b|mangal|manglik/, 'mars'],
  [/mercury|budh\b/, 'mercury'],
  [/\bmoon|chandra/, 'moon'],
  [/nakshatra|birth star|tara koota/, 'nakshatra'],
  [/numerolog|mulank|bhagyank|\bnumbers?\b/, 'numbers'],
  // Working-life themes, more specific than "career" itself.
  [/\bseva\b/, 'spirituality'],
  [/\bservice|competition|government/, 'service'],
  [/authority|leadership|recognition|minister/, 'leadership'],
  [/chang|transformation|turning point|next chapter|stormy/, 'change'],
  [/balance|dialogue|equilibrium/, 'balance'],
  [/growth|\bscale|advancement|opportunit|success|cornerstone/, 'growth'],
  [/persona\b|nature of your work|\bskills?\b|livelihood/, 'craft'],
  [/marriage|spouse|togetherness|commitment|darakaraka|navamsa|koota|guna milan|wedding/, 'marriage'],
  // The 7th house and "partner" mean marriage only outside work and money passages.
  [/^(?!.*(business|career|profession|work|financ|money|wealth|income)).*(7th house|seventh house|partner)/, 'marriage'],
  [/\blove\b|romance|heart|5th house|fifth house/, 'love'],
  [/children|\bchild\b|baby/, 'children'],
  [/family|mother|father|sibling/, 'family'],
  [/career|profession|10th house|\bwork\b|vocation|employment|dashamsha|public.service|government|karmajiva|amatyakaraka|livelihood/, 'career'],
  [/wealth|money|financ|income|gains|11th house|2nd house|dhana|\bearn|resources|prosper|hora chart|debt|expens|business|entrepreneur|enterprise/, 'wealth'],
  [/collaborat|partnership|network|alliance/, 'teamwork'],
  [/education|learning|intelligence|knowledge/, 'education'],
  [/health|well-?being|lifestyle|\byoga\b|physique/, 'health'],
  [/\bhome\b|property|living space|4th house/, 'home'],
  [/travel|foreign|long journeys|short journeys/, 'travel'],
  [/communicat|speech|voice|speak/, 'communication'],
  [/friend|network|maitri/, 'friendship'],
  [/spiritual|\bsoul|atmakaraka|seva|remed|mantra|meditation|devotion|practices?\b|karm|faith|sacred|affirmation|12th house/, 'spirituality'],
  [/dasha|period|timeline|transit|window|chapter|\byear|month|clock|season|return\b/, 'time'],
  [/success|achieve|triumph|victory|accomplish|promotion|advancement/, 'success'],
  [/positive|positivity|optimis|uplift|blessing|joy|hope|encourag/, 'positivity'],
  [/abundance|prosperity|plenty|fortune|flourish/, 'abundance'],
  [/clarity|insight|vision|awakening|purpose/, 'clarity'],
  [/confidence|courage|resilience|empower/, 'confidence'],
  [/harmony|peaceful|grace|bloom|togetherness/, 'harmony'],
  [/strength|resilience|stability|endurance|challenge|triumph|pressure|discipline|anchor/, 'strength'],
  [/emotion|psyche|temperament|inner peace|mind\b/, 'emotion'],
  [/\bpath|road|voyage|course|ahead|forward|journey|compass/, 'journey'],
  [/beginning|conclusion|closing|bloom|preparing/, 'sunrise'],
  [/wisdom|\blight\b|guidance|guiding|\bguide\b/, 'lamp'],
  [/chart|kundali|kundli|ashtakavarga|panchang|birth details|at a glance|yoga/, 'observatory'],
  [/cosmic|celestial|\bstars?\b|\bsky\b|planet/, 'night-sky'],
];

/**
 * Life themes a reader recognises in a picture. Only these are illustrated: a
 * passage about a planet, a sign or a technique gets no picture, because a
 * photograph of the sky says nothing about what the passage means for the reader.
 */
const THEME_TAGS = new Set([
  'success', 'positivity', 'abundance', 'harmony', 'clarity', 'confidence',
  'career', 'craft', 'teamwork', 'service', 'leadership', 'growth', 'change', 'balance', 'wealth',
  'education', 'health', 'home', 'travel', 'communication', 'friendship', 'marriage', 'love',
  'children', 'family', 'strength', 'journey', 'spirituality', 'emotion',
]);

/** A report carries at most this many pictures. */
export const MAX_PICTURES = 10;

const SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

/** English sign name (lowercase) for a rashi index 1 to 12. */
export function signForRashiIndex(index: number | undefined): string | undefined {
  return index && index >= 1 && index <= 12 ? SIGNS[index - 1] : undefined;
}

export interface SignHints {
  /** Ascendant sign and Moon sign of the native (English names), when known. */
  lagna?: string;
  moon?: string;
}

/** Subject tags for a piece of text, most specific first. */
export function subjectsFor(text: string, hints: SignHints = {}): string[] {
  const t = text.toLowerCase();
  const tags: string[] = [];
  const sign = (s: string | undefined) => (s && SIGNS.includes(s.toLowerCase()) ? s.toLowerCase() : undefined);
  // The native's own sign illustrates passages about their Ascendant or Moon sign.
  // Only the birth chart's Ascendant: a divisional chart (D9, D10) has its own rising sign.
  if (/lagna|ascendant/.test(t) && !/\bd\d+\b|dashamsha|navamsa/.test(t) && sign(hints.lagna)) tags.push(sign(hints.lagna)!);
  if (/moon sign|rashi\b|\bmoon/.test(t) && sign(hints.moon)) tags.push(sign(hints.moon)!);
  for (const s of SIGNS) if (new RegExp(`\\b${s}\\b`).test(t)) tags.push(s);
  for (const [re, tag] of SUBJECT_RULES) if (re.test(t)) tags.push(tag);
  return [...new Set(tags)];
}

const topicText = (t: ReportTopic) => `${t.title} ${t.subtitle ?? ''}`;

/** How many of a passage's subject tags are considered: beyond this a picture is no longer clearly relevant. */
const MAX_TAGS = 2;

/** Subjects that do not belong in a report about work or money, whatever a title's wording suggests. */
const EXCLUDED_BY_REPORT: ReadonlyArray<readonly [RegExp, readonly string[]]> = [
  [/career|finance/, ['marriage', 'love', 'children', 'family']],
];

export function planIllustrations(
  def: ReportDefinition,
  hints: SignHints = {},
  library: LibraryImage[] = loadImageLibrary()
): IllustrationPlan {
  if (!library.length) return EMPTY_PLAN;
  const plan: IllustrationPlan = { topics: new Map(), used: [] };
  const taken = new Set<string>();
  const excluded = new Set(EXCLUDED_BY_REPORT.filter(([re]) => re.test(def.id)).flatMap(([, tags]) => tags));
  /** The life themes of a passage that this report may show, most specific first. */
  const themes = (text: string) =>
    subjectsFor(text, hints).filter((t) => THEME_TAGS.has(t) && !excluded.has(t)).slice(0, MAX_TAGS);
  const pick = (tags: string[]): LibraryImage | undefined => {
    for (const tag of tags) {
      // Only a picture whose main subject is the theme is relevant enough.
      const free = library.filter((i) => !taken.has(i.id) && i.subjects[0] === tag);
      const img = free.find((i) => i.people) ?? free[0];
      if (img) {
        taken.add(img.id);
        return img;
      }
    }
    return undefined;
  };

  const candidates = def.sections
    .flatMap((s) => s.topics)
    .filter((t) => t.kind === 'narrative')
    .map((topic) => {
      const tags = themes(topicText(topic));
      // A passage that is first of all about a life theme comes before one about a planet or a technique.
      const direct = tags.length > 0 && subjectsFor(topicText(topic), hints)[0] === tags[0];
      return { topic, tags, direct };
    })
    .filter((c) => c.tags.length > 0);

  // Rank the passages: theme passages first, and a new theme before a second picture of one already shown.
  const groups: (typeof candidates)[] = [];
  const shown = new Map<string, number>();
  const ranked = new Set<string>();
  for (const direct of [true, false]) {
    for (let round = 0; round < MAX_PICTURES; round++) {
      const group = candidates.filter((c) => c.direct === direct && !ranked.has(c.topic.id) && (shown.get(c.tags[0]) ?? 0) === round);
      const firstOfTheme = group.filter((c, i) => group.findIndex((o) => o.tags[0] === c.tags[0]) === i);
      for (const c of firstOfTheme) {
        ranked.add(c.topic.id);
        shown.set(c.tags[0], round + 1);
      }
      if (firstOfTheme.length) groups.push(firstOfTheme);
    }
  }
  // Fill the allowance group by group; a group that does not fit whole is thinned evenly, so pictures spread through the report.
  for (const group of groups) {
    const room = MAX_PICTURES - plan.topics.size;
    if (room <= 0) break;
    const chosen = group.length <= room ? group : Array.from({ length: room }, (_, i) => group[Math.floor((i * group.length) / room)]);
    for (const c of chosen) {
      const img = pick(c.tags);
      if (img) plan.topics.set(c.topic.id, img);
    }
  }
  // Credits follow reading order.
  for (const c of candidates) {
    const img = plan.topics.get(c.topic.id);
    if (img) plan.used.push(img);
  }
  return plan;
}

/** A picture scaled to cover a box of the given size (mm), centred and cropped. */
export function coverImageTex(img: LibraryImage, widthMm: number, heightMm: number): string {
  const fit = img.width / img.height > widthMm / heightMm ? `height=${heightMm}mm` : `width=${widthMm}mm`;
  return `\\AsImage{${widthMm}mm}{${heightMm}mm}{${fit}}{assets/library/${img.file}}`;
}

/** Closing list of every picture used, with credit and licence. */
export function imageCreditsPage(plan: IllustrationPlan, lang: 'en' | 'hi'): string {
  if (!plan.used.length) return '';
  const heading = lang === 'hi' ? 'चित्र आभार' : 'Image Credits';
  const intro =
    lang === 'hi'
      ? 'इस रिपोर्ट के चित्र सार्वजनिक रूप से लाइसेंस प्राप्त स्रोतों से लिए गए हैं।'
      : 'The photographs in this report come from freely licensed sources. They illustrate the themes of the passages they sit beside and are not part of the astrological calculation. All have been resized and cropped to fit the page.';
  const rows = plan.used
    // Captions exist in English only; a Hindi edition lists the credit and licence, which are names.
    .map((i) => `\\item ${lang === 'hi' ? '' : `${tex(i.caption)} \\textcolor{Muted}{--- `}${tex(i.credit)}${i.credit.includes(i.license) ? '' : ` (${tex(i.license)})`}${lang === 'hi' ? '' : '}'}`)
    .join('\n');
  return `\\clearpage\\markboth{${heading}}{}
\\vspace*{4mm}
{\\displayfont\\fontsize{22}{27}\\selectfont\\color{Primary}${heading}\\par}\\vspace{1.5mm}
{\\color{Accent}\\rule{38mm}{0.9pt}}\\par\\vspace{3mm}
{\\fontsize{9.5}{13}\\selectfont\\color{Muted}${intro}\\par}\\vspace{3mm}
{\\sffamily\\fontsize{7.6}{10.4}\\selectfont
\\begin{itemize}[leftmargin=4mm,itemsep=1.2pt,parsep=0pt,topsep=0pt,label={\\textcolor{Accent}{\\tiny$\\diamondsuit$}}]
${rows}
\\end{itemize}}
`;
}
