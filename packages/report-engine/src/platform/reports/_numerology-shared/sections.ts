/**
 * The numerology half shared by Fortune and Fortune Plus, each in Hindi and English.
 *
 * Section and topic titles exist in both languages; objectives (read by the
 * LLM and reviewers) are English. `refs` maps each topic to the reference PDF
 * pages of both products (Fortune Report / Fortune Report Plus).
 */
import { ReportSection, ReportTopicInput } from '../../contracts';
import { Lang } from './associations';

type Bi = { en: string; hi: string };

interface TopicSpec {
  id: string;
  title: Bi;
  subtitle?: Bi;
  kind: 'narrative' | 'data';
  objective: string;
  block?: string;
  requiredEvidence?: string[];
  optionalEvidence?: string[];
  depth?: { minParagraphs: number; maxParagraphs: number; bullets?: number };
  dependsOn?: string[];
  /** Reference pages: f = Fortune Report (Hindi), p = Fortune Report Plus. */
  refs?: { f?: string; p?: string };
  bonus?: boolean;
}

interface SectionSpec {
  id: string;
  title: Bi;
  kicker: Bi;
  intro?: Bi;
  topics: TopicSpec[];
}

export type SectionInput = Omit<ReportSection, 'topics'> & { topics: ReportTopicInput[] };

const MONTH_TOPICS = (from: number, to: number): TopicSpec[] =>
  Array.from({ length: to - from + 1 }, (_, i) => {
    const n = from + i;
    const id = String(n).padStart(2, '0');
    return {
      id: `month-${id}`,
      title: { en: `Month ${n} of Your Year Ahead`, hi: `आने वाले वर्ष का माह ${n}` },
      subtitle: { en: 'Your personal month and how to use it', hi: 'आपका व्यक्तिगत माह और उसका सदुपयोग' },
      kind: 'narrative' as const,
      objective: `Forecast month ${n}: name the calendar month given in the evidence and interpret its personal month number within the personal year — the month's theme, what to expect in work, relationships, money habits and wellbeing, and specific advice for that month. Keep it distinct from the other months; never invent events.`,
      requiredEvidence: [`num.pm.${id}`],
      optionalEvidence: ['num.py.current', 'num.py.next', 'numerology.mulank'],
      depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 4 },
      refs: { f: '67-90', p: '46-62' },
    };
  });

export function numerologySectionSpecs(prefix: string): SectionSpec[] {
  const b = (k: string) => `${prefix}-${k}`;
  return [
    {
      id: 'num-overview',
      title: { en: 'Your Numbers at a Glance', hi: 'आपके अंक: एक दृष्टि में' },
      kicker: { en: 'Introduction', hi: 'परिचय' },
      intro: { en: 'The calculated numbers this report is built on, and the everyday associations that follow from them.', hi: 'वे गणना किए गए अंक जिन पर यह रिपोर्ट आधारित है, और उनसे जुड़ी दैनिक शुभ बातें।' },
      topics: [
        { id: 'lucky-things', title: { en: 'Your Lucky Things', hi: 'आपकी भाग्यशाली चीज़ें' }, kind: 'data', block: b('lucky-table'), objective: 'Personal details and lucky associations from the core numbers.', refs: { f: '9-10', p: '9' } },
        { id: 'core-numbers', title: { en: 'How Your Numbers Were Calculated', hi: 'आपके अंकों की गणना' }, kind: 'data', block: b('core-numbers'), objective: 'Transparent working of every core number.', bonus: true },
      ],
    },
    {
      id: 'psychic-number',
      title: { en: 'Your Mulank: The Psychic Number', hi: 'मूलांक: आपका मूल अंक' },
      kicker: { en: 'Numerological Analysis', hi: 'संख्यात्मक विश्लेषण' },
      intro: { en: 'Your birth day reveals how you instinctively think, act and present yourself.', hi: 'आपका जन्म दिन बताता है कि आप स्वाभाविक रूप से कैसे सोचते, कार्य करते और स्वयं को प्रस्तुत करते हैं।' },
      topics: [
        { id: 'mulank-nature', title: { en: 'What Your Mulank Reveals', hi: 'आपका मूलांक क्या बताता है' }, subtitle: { en: 'Your ruling planet and natural personality', hi: 'आपका शासक ग्रह और स्वाभाविक व्यक्तित्व' }, kind: 'narrative',
          objective: 'Explain what the Mulank is, then interpret the reader\'s Mulank and its ruling planet as personality traits: strengths, natural style, how others experience them, and the shadow side to manage.',
          requiredEvidence: ['numerology.mulank', 'num.mulank.planet'], optionalEvidence: ['num.birth-day', 'num.weekday', 'num.colours'], depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 5 }, refs: { f: '11-13', p: '10-12' } },
        { id: 'mulank-advice', title: { en: 'Advice and Timing for Your Mulank', hi: 'आपके मूलांक के लिए सलाह और समय' }, subtitle: { en: 'A piece of advice, supportive days and colours', hi: 'विशेष सलाह, शुभ दिन और रंग' }, kind: 'narrative',
          objective: 'Practical advice for this Mulank, how to use its supportive weekday and colours, and which kinds of periods suit it (relate this to the personal-year cycle given, not to invented calendar dates).',
          requiredEvidence: ['numerology.mulank', 'num.weekday'], optionalEvidence: ['num.mulank.planet', 'num.colours', 'num.py.current', 'num.lucky-dates'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 5 }, dependsOn: ['mulank-nature'], refs: { f: '13-14', p: '12-13' } },
        { id: 'birth-day', title: { en: 'Decoding Your Birth Date', hi: 'आपकी जन्म तिथि का विश्लेषण' }, kind: 'narrative',
          objective: 'Interpret the specific day of the month the reader was born on (the unreduced day and its digit sum) as a refinement of the Mulank.',
          requiredEvidence: ['num.birth-day'], optionalEvidence: ['numerology.mulank', 'num.mulank.planet'], depth: { minParagraphs: 2, maxParagraphs: 3 }, refs: { f: '18', p: '17' } },
        { id: 'sun-sign', title: { en: 'Your Western Sun Sign', hi: 'आपकी पाश्चात्य सूर्य राशि' }, subtitle: { en: 'The tropical zodiac sign of your birth date', hi: 'जन्म तिथि की सायन राशि' }, kind: 'narrative',
          objective: 'Describe the traits of the reader\'s Western (tropical) Sun sign and how they blend with the Mulank. Make clear this is the Western sign used in numerology, not the Vedic Moon sign.',
          requiredEvidence: ['num.sun-sign'], optionalEvidence: ['numerology.mulank', 'num.mulank.planet'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 4 }, refs: { f: '20', p: '18' } },
      ],
    },
    {
      id: 'destiny-number',
      title: { en: 'Your Bhagyank: The Destiny Number', hi: 'भाग्यांक: आपका भाग्य अंक' },
      kicker: { en: 'Numerological Analysis', hi: 'संख्यात्मक विश्लेषण' },
      intro: { en: 'Your full date of birth describes the direction of your life and how Mulank and Bhagyank work together.', hi: 'पूरी जन्म तिथि आपके जीवन की दिशा बताती है, और यह भी कि मूलांक और भाग्यांक साथ कैसे काम करते हैं।' },
      topics: [
        { id: 'bhagyank-nature', title: { en: 'What Your Bhagyank Reveals', hi: 'आपका भाग्यांक क्या बताता है' }, subtitle: { en: 'The direction and lessons of your life', hi: 'जीवन की दिशा और सीख' }, kind: 'narrative',
          objective: 'Explain the Bhagyank (destiny/life-path number) and interpret the reader\'s Bhagyank and its ruling planet: life direction, the way luck tends to arrive, lessons, and how it matures with age.',
          requiredEvidence: ['numerology.bhagyank', 'num.bhagyank.planet'], optionalEvidence: ['numerology.mulank'], depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 6 }, refs: { f: '15-17', p: '14-16' } },
        { id: 'combination', title: { en: 'Your Mulank and Bhagyank Together', hi: 'मूलांक और भाग्यांक का संयोजन' }, kind: 'narrative',
          objective: 'Interpret how the Mulank and Bhagyank combine, using the planetary relationship and harmony given, and the bridge number between them; describe inner tension or ease and how to align the two.',
          requiredEvidence: ['num.combination'], optionalEvidence: ['numerology.mulank', 'numerology.bhagyank', 'num.mulank.planet', 'num.bhagyank.planet', 'num.bridge.mulank-bhagyank'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, dependsOn: ['bhagyank-nature'], refs: { f: '19', p: '17' } },
        { id: 'devotion-table', title: { en: 'Ruling Deity, Day and Mantra', hi: 'शासक देवता, वार और मंत्र' }, kind: 'data', block: b('devotion'), objective: 'Deity form, weekday and beej mantra of the ruling planets.', refs: { f: '21-23', p: '19-20' } },
        { id: 'deity-fasting', title: { en: 'Your Ruling Deity and Fasting', hi: 'आपके शासक देवता और उपवास' }, kind: 'narrative',
          objective: 'Explain the deity form associated with the Mulank\'s ruling planet and how simple devotion and an optional fast on its weekday can support focus and discipline. Fasting only if health permits; nothing to buy.',
          requiredEvidence: ['num.avatar', 'num.weekday'], optionalEvidence: ['num.mulank.planet', 'num.bhagyank.planet'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 4 }, refs: { f: '21-23', p: '19-20' } },
      ],
    },
    {
      id: 'friendship',
      title: { en: 'Friendship and Romance by Numbers', hi: 'अंकों से मित्रता और प्रेम' },
      kicker: { en: 'Relationships', hi: 'संबंध' },
      topics: [
        { id: 'friendship-table', title: { en: 'Your Mulank with Every Number', hi: 'हर अंक के साथ आपका मूलांक' }, kind: 'data', block: b('friendship'), objective: 'Harmony of the Mulank with numbers 1–9.', refs: { f: '24-28', p: '20-23' } },
        { id: 'friendship', title: { en: 'Your Friendship with Other Mulanks', hi: 'अन्य मूलांकों से आपकी मित्रता' }, kind: 'narrative',
          objective: 'Walk through how the reader tends to relate to people of each Mulank 1–9, grouped by the harmony given (harmonious, mixed, needs patience), with tips for each group. Never discourage any relationship.',
          requiredEvidence: ['num.harmony.*'], optionalEvidence: ['num.friendly-numbers', 'num.demanding-numbers', 'numerology.mulank'], depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, refs: { f: '24-28', p: '20-23' } },
        { id: 'romance', title: { en: 'Romance with Other Numbers', hi: 'अन्य अंकों के साथ प्रेम' }, kind: 'narrative',
          objective: 'How the reader\'s numbers colour romance and partnership; which numbers bring natural ease, and how to build understanding with the rest. Inclusive of any relationship status.',
          requiredEvidence: ['num.friendly-numbers'], optionalEvidence: ['num.harmony.*', 'numerology.bhagyank', 'num.combination', 'num.demanding-numbers'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, dependsOn: ['friendship'], refs: { f: '29-30', p: '24' } },
      ],
    },
    {
      id: 'health-career',
      title: { en: 'Health and Career Through Numbers', hi: 'स्वास्थ्य और करियर: अंकों की दृष्टि से' },
      kicker: { en: 'Wellbeing & Work', hi: 'स्वास्थ्य और कार्य' },
      topics: [
        { id: 'health', title: { en: 'Your Health and Immunity Blueprint', hi: 'आपका स्वास्थ्य और रोग-प्रतिरोधक नक्शा' }, kind: 'narrative',
          objective: 'Wellbeing tendencies traditionally linked with the ruling planets of the Mulank and Bhagyank (energy, stress patterns, routines), with gentle lifestyle habits. No diagnoses, no medical claims; recommend professional care for any health concern.',
          requiredEvidence: ['numerology.mulank', 'num.mulank.planet'], optionalEvidence: ['numerology.bhagyank', 'num.bhagyank.planet', 'num.loshu.missing'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 5 }, refs: { f: '31', p: '25' } },
        { id: 'career', title: { en: 'Career Options for Your Numbers', hi: 'आपके अंकों के लिए करियर विकल्प' }, kind: 'narrative',
          objective: 'General work traits, suitable career fields, strengths and challenges at work from the Mulank and Bhagyank rulers (and the name number if given), with five example professions as bullets.',
          requiredEvidence: ['num.mulank.planet', 'num.bhagyank.planet'], optionalEvidence: ['numerology.mulank', 'numerology.bhagyank', 'num.name.number', 'num.combination'], depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 5 }, refs: { f: '32-33', p: '26' } },
      ],
    },
    {
      id: 'loshu',
      title: { en: 'Decoding Your Destiny: The Fortune Grid', hi: 'आपकी किस्मत का विश्लेषण: भाग्य ग्रिड' },
      kicker: { en: 'Lo Shu Grid', hi: 'लो शू ग्रिड' },
      intro: { en: 'The ancient 3×3 Lo Shu square, filled with the digits of your birth date.', hi: 'प्राचीन 3×3 लो शू वर्ग, आपकी जन्म तिथि के अंकों से भरा हुआ।' },
      topics: [
        { id: 'loshu-grid', title: { en: 'Your Fortune Grid', hi: 'आपका भाग्य ग्रिड' }, kind: 'data', block: b('loshu'), objective: 'The client\'s Lo Shu grid with counts, missing numbers and lines.', refs: { f: '35-36', p: '28, 36' } },
        { id: 'loshu-intro', title: { en: 'What Your Grid Shows', hi: 'आपका ग्रिड क्या दर्शाता है' }, subtitle: { en: 'The Lo Shu square and the overall shape of yours', hi: 'लो शू वर्ग और आपके ग्रिड का समग्र स्वरूप' }, kind: 'narrative',
          objective: 'Briefly explain the Lo Shu square (origin, use in numerology and Feng Shui), then describe the overall shape of the reader\'s grid: which areas are well filled and which are open.',
          requiredEvidence: ['num.loshu.count.*'], optionalEvidence: ['num.loshu.complete-lines', 'num.loshu.empty-lines', 'num.loshu.missing'], depth: { minParagraphs: 2, maxParagraphs: 3 }, refs: { f: '35', p: '28' } },
        { id: 'loshu-present', title: { en: 'The Numbers Present in Your Grid', hi: 'आपके ग्रिड में उपस्थित अंक' }, kind: 'narrative',
          objective: 'Interpret each number that is present, including what its count (once, twice, three or more times) suggests, following the counts given.',
          requiredEvidence: ['num.loshu.count.*', 'num.loshu.repeated'], optionalEvidence: [], depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 0 }, dependsOn: ['loshu-intro'], refs: { f: '37-40', p: '29-31' } },
        { id: 'loshu-missing', title: { en: 'Missing Numbers and Their Impact', hi: 'मिसिंग नंबर और उनका प्रभाव' }, kind: 'narrative',
          objective: 'Explain what a missing number means, then interpret each of the reader\'s missing numbers (with its planet association) as an area to develop consciously. If none are missing, explain what a full grid suggests.',
          requiredEvidence: ['num.loshu.missing'], optionalEvidence: ['num.loshu.count.*'], depth: { minParagraphs: 2, maxParagraphs: 4, bullets: 3 }, refs: { f: '42-44', p: '32-34' } },
        { id: 'loshu-lines', title: { en: 'Complete and Empty Lines', hi: 'पूर्ण और रिक्त रेखाएँ' }, kind: 'narrative',
          objective: 'Interpret the complete lines and fully empty lines of the grid (rows: mind, emotion, practical life; columns: thought, will, action; and the two diagonals) as patterns of strength and growth.',
          requiredEvidence: ['num.loshu.complete-lines', 'num.loshu.empty-lines'], optionalEvidence: ['num.loshu.count.*'], depth: { minParagraphs: 2, maxParagraphs: 3 }, bonus: true },
      ],
    },
    {
      id: 'feng-shui',
      title: { en: 'Feng-Shui and Your Lucky Directions', hi: 'फेंग-शुई और आपकी शुभ दिशाएँ' },
      kicker: { en: 'Kua Number', hi: 'कुआ नंबर' },
      topics: [
        { id: 'kua-table', title: { en: 'Your Kua Number and Directions', hi: 'आपका कुआ नंबर और दिशाएँ' }, kind: 'data', block: b('kua'), objective: 'Kua, element, group, directions and grid elements.', refs: { f: '46-53', p: '36-39' } },
        { id: 'kua-meaning', title: { en: 'Understanding Your Kua Number', hi: 'अपने कुआ नंबर को समझें' }, kind: 'narrative',
          objective: 'Explain what the Kua number is and why it depends on gender and the solar year, then interpret the reader\'s Kua, its element and its group.',
          requiredEvidence: ['num.kua*'], optionalEvidence: [], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, refs: { f: '47-51', p: '37-38' } },
        { id: 'kua-directions', title: { en: 'Using Your Lucky Directions', hi: 'अपनी शुभ दिशाओं का उपयोग' }, kind: 'narrative',
          objective: 'Practical, low-cost ways to use the favourable directions at home and work (desk facing, sleeping direction, meeting seats), and how to handle less supportive directions calmly. Nothing to buy.',
          requiredEvidence: ['num.kua*'], optionalEvidence: [], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 5 }, dependsOn: ['kua-meaning'], refs: { f: '51', p: '38' } },
        { id: 'grid-elements', title: { en: 'The Elements in Your Grid', hi: 'आपके ग्रिड में तत्व' }, kind: 'narrative',
          objective: 'Interpret the balance of the five elements (water, wood, fire, earth, metal) in the reader\'s grid, and simple ways to balance an absent element.',
          requiredEvidence: ['num.loshu.elements'], optionalEvidence: ['num.loshu.elements-absent', 'num.kua.element'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, refs: { f: '52-53', p: '39' } },
      ],
    },
    {
      id: 'name-analysis',
      title: { en: 'Your Name Analysis', hi: 'आपके नाम का विश्लेषण' },
      kicker: { en: 'Name Numerology', hi: 'नाम अंकशास्त्र' },
      intro: { en: 'Your name, as you use it, carries its own vibration. Numbers are calculated with the Chaldean system.', hi: 'जिस नाम का आप उपयोग करते हैं, उसकी अपनी तरंग होती है। अंकों की गणना कैल्डियन पद्धति से की गई है।' },
      topics: [
        { id: 'name-table', title: { en: 'Name Number Addition', hi: 'नाम संख्या जोड़' }, kind: 'data', block: b('name'), objective: 'Letter values and name numbers.', refs: { f: '55-57', p: '41' } },
        { id: 'name-number', title: { en: 'Your Name Number', hi: 'आपका नामांक' }, kind: 'narrative',
          objective: 'Interpret the name (expression) number and its ruling planet: how the name presents the reader to the world, and its harmony with the Mulank.',
          requiredEvidence: ['num.name.number', 'num.name.planet'], optionalEvidence: ['num.name.harmony', 'numerology.mulank'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, refs: { f: '56-57', p: '41' } },
        { id: 'first-letter', title: { en: 'The First Letter of Your Name', hi: 'आपके नाम का पहला अक्षर' }, kind: 'narrative',
          objective: 'Interpret the Chaldean value (and planet) of the first letter of the name as the first impression and the way the reader starts things. Do not mention or guess the letter itself.',
          requiredEvidence: ['num.name.first-letter'], optionalEvidence: ['num.name.number'], depth: { minParagraphs: 2, maxParagraphs: 2 }, refs: { f: '56-57', p: '41' } },
        { id: 'soul-urge', title: { en: 'Your Soul Urge Number', hi: 'आत्मा आग्रह संख्या' }, kind: 'narrative',
          objective: 'Interpret the soul urge (heart\'s desire) number from the vowels: inner motivations and what truly fulfils the reader.',
          requiredEvidence: ['num.soul-urge'], optionalEvidence: ['num.name.number', 'numerology.mulank'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, refs: { f: '58-59', p: '42' } },
        { id: 'personality-number', title: { en: 'Your Personality Number', hi: 'व्यक्तित्व संख्या' }, kind: 'narrative',
          objective: 'Interpret the personality number from the consonants: the outer image others perceive and how to use it well.',
          requiredEvidence: ['num.personality'], optionalEvidence: ['num.soul-urge', 'num.name.number'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, refs: { f: '60-61', p: '42' } },
        { id: 'name-planes', title: { en: 'Your Current Name Grid', hi: 'वर्तमान नाम ग्रिड' }, kind: 'data', block: b('name-planes'), objective: 'Planes-of-expression grid of the name.', refs: { f: '62', p: '43' } },
        { id: 'name-planes-reading', title: { en: 'The Four Planes of Your Name', hi: 'आपके नाम के चार तल' }, subtitle: { en: 'Mental, physical, emotional and intuitive', hi: 'मानसिक, शारीरिक, भावनात्मक और अंतर्ज्ञान' }, kind: 'narrative',
          objective: 'Interpret the letter counts on the mental, physical, emotional and intuitive planes: which plane dominates, which is light, and what that suggests about how the reader processes life.',
          requiredEvidence: ['num.name.plane.*'], optionalEvidence: [], depth: { minParagraphs: 3, maxParagraphs: 4 }, refs: { f: '62-64', p: '43-44' } },
        { id: 'name-conclusion', title: { en: 'Name Analysis: Conclusion', hi: 'नाम विश्लेषण: निष्कर्ष' }, kind: 'narrative',
          objective: 'Bring the name numbers together with the Mulank: overall harmony, what works well, and gentle considerations (never pressure to change the name).',
          requiredEvidence: ['num.name.harmony'], optionalEvidence: ['num.name.number', 'num.soul-urge', 'num.personality', 'numerology.mulank', 'numerology.bhagyank'], depth: { minParagraphs: 2, maxParagraphs: 2 }, dependsOn: ['name-number'], refs: { f: '65', p: '44' } },
      ],
    },
    {
      id: 'fortune-trend',
      title: { en: 'Your Fortune Trend: The Year Ahead', hi: 'आपकी किस्मत की प्रवृत्ति: आने वाला वर्ष' },
      kicker: { en: 'Fortune Trend', hi: 'भाग्य प्रवृत्ति' },
      intro: { en: 'Twelve months from your report date, read through your personal year and personal months.', hi: 'रिपोर्ट की तिथि से अगले बारह महीने, आपके व्यक्तिगत वर्ष और व्यक्तिगत माह के माध्यम से।' },
      topics: [
        { id: 'months-table', title: { en: 'Your Personal Months', hi: 'आपके व्यक्तिगत माह' }, kind: 'data', block: b('months'), objective: 'Personal year and month numbers for 12 months.', refs: { f: '67-90', p: '46-62' } },
        { id: 'personal-year', title: { en: 'The Theme of Your Personal Year', hi: 'आपके व्यक्तिगत वर्ष का मुख्य विषय' }, kind: 'narrative',
          objective: 'Explain the personal year cycle, then interpret the current personal year and the next one: the main theme, opportunities and what to focus on.',
          requiredEvidence: ['num.py.current'], optionalEvidence: ['num.py.next', 'numerology.bhagyank'], depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, refs: { f: '66-67', p: '45-46' }, bonus: false },
      ],
    },
    {
      id: 'months-1',
      title: { en: 'Month by Month: The First Six Months', hi: 'माहवार भविष्यवाणी: पहले छह माह' },
      kicker: { en: 'Fortune Trend', hi: 'भाग्य प्रवृत्ति' },
      topics: MONTH_TOPICS(1, 6),
    },
    {
      id: 'months-2',
      title: { en: 'Month by Month: The Next Six Months', hi: 'माहवार भविष्यवाणी: अगले छह माह' },
      kicker: { en: 'Fortune Trend', hi: 'भाग्य प्रवृत्ति' },
      topics: MONTH_TOPICS(7, 12),
    },
    {
      id: 'life-cycles',
      title: { en: 'Pinnacles and Challenges of Life', hi: 'जीवन के शिखर और चुनौतियाँ' },
      kicker: { en: 'Challenge of Life', hi: 'जीवन की चुनौतियाँ' },
      intro: { en: 'Four long cycles of life, each with an opportunity (pinnacle) and a lesson (challenge).', hi: 'जीवन के चार लंबे चक्र, हर एक में एक अवसर (शिखर) और एक सीख (चुनौती)।' },
      topics: [
        { id: 'cycles-table', title: { en: 'Your Four Life Cycles', hi: 'आपके चार जीवन-चक्र' }, kind: 'data', block: b('cycles'), objective: 'Pinnacle and challenge numbers with age ranges.', refs: { f: '91-97', p: '63-66' } },
        { id: 'pinnacles', title: { en: 'Your Pinnacles: Seasons of Opportunity', hi: 'आपके शिखर: अवसरों के मौसम' }, kind: 'narrative',
          objective: 'Explain pinnacles, then interpret each of the four pinnacle numbers in its age range as the opportunity of that phase.',
          requiredEvidence: ['num.pinnacle.*'], optionalEvidence: ['num.cycle.current', 'num.age'], depth: { minParagraphs: 3, maxParagraphs: 5 }, refs: { f: '91-97', p: '63-66' } },
        { id: 'challenges', title: { en: 'Your Challenges: Lessons to Master', hi: 'आपकी चुनौतियाँ: सीखने योग्य पाठ' }, kind: 'narrative',
          objective: 'Explain challenge numbers (0 to 8), then interpret each of the four challenges in its age range as a lesson, with constructive ways to work with it.',
          requiredEvidence: ['num.challenge.*'], optionalEvidence: ['num.cycle.current'], depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 3 }, refs: { f: '91-97', p: '63-66' } },
        { id: 'current-cycle', title: { en: 'The Cycle You Are In Now', hi: 'वर्तमान जीवन-चक्र' }, kind: 'narrative',
          objective: 'Focus on the current cycle: how its pinnacle and challenge interact at the reader\'s present age, and practical priorities for the coming years.',
          requiredEvidence: ['num.cycle.current'], optionalEvidence: ['num.pinnacle.*', 'num.challenge.*', 'num.age'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 4 }, dependsOn: ['pinnacles'], bonus: true },
      ],
    },
    {
      id: 'right-path',
      title: { en: 'Are You on the Right Path?', hi: 'क्या आप सही रास्ते पर हैं?' },
      kicker: { en: 'Alignment', hi: 'संतुलन' },
      topics: [
        { id: 'maturity', title: { en: 'Your Maturity Number', hi: 'आपकी परिपक्वता संख्या' }, kind: 'narrative',
          objective: 'Explain the maturity number (Bhagyank plus name number) and interpret it as the goal that becomes clearer in the second half of life.',
          requiredEvidence: ['num.maturity'], optionalEvidence: ['numerology.bhagyank', 'num.name.number', 'num.age'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, refs: { f: '101', p: '69-70' } },
        { id: 'bridge-numbers', title: { en: 'Your Connection (Bridge) Numbers', hi: 'आपकी संबंध (सेतु) संख्याएँ' }, kind: 'narrative',
          objective: 'Explain bridge numbers as the distance between two core numbers, then interpret the reader\'s bridge between Mulank and Bhagyank (and between Bhagyank and name number if given): what quality helps connect the two.',
          requiredEvidence: ['num.bridge.mulank-bhagyank'], optionalEvidence: ['num.bridge.bhagyank-name', 'numerology.mulank', 'numerology.bhagyank'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, refs: { f: '99-100', p: '68-69' } },
        { id: 'path-alignment', title: { en: 'Signs You Are on Track', hi: 'सही मार्ग के संकेत' }, kind: 'narrative',
          objective: 'Bring together the Bhagyank, the current life cycle and the personal year into practical signs that the reader is living in line with their numbers, and course corrections if not.',
          requiredEvidence: ['numerology.bhagyank', 'num.cycle.current'], optionalEvidence: ['num.py.current', 'num.pinnacle.*'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 5 }, refs: { f: '98-99', p: '68' } },
      ],
    },
    {
      id: 'num-remedies',
      title: { en: 'Everyday Luck and Remedies for Your Well-being', hi: 'रोज़ाना की शुभ बातें और आपकी भलाई के उपाय' },
      kicker: { en: 'Remedies', hi: 'उपाय' },
      intro: { en: 'Simple, free practices. Choose two or three that feel natural and keep them steadily.', hi: 'सरल, निःशुल्क अभ्यास। जो दो-तीन स्वाभाविक लगें, उन्हें चुनें और नियमित रखें।' },
      topics: [
        { id: 'everyday-table', title: { en: 'Your Everyday Lucky Items', hi: 'आपकी रोज़ाना की शुभ वस्तुएँ' }, kind: 'data', block: b('everyday'), objective: 'Weekday, colours, dates, numbers, motif and a user-name idea.', refs: { f: '102-104', p: '71' } },
        { id: 'mantras', title: { en: 'Your Mantras', hi: 'आपके मंत्र' }, kind: 'data', block: b('mantras'), objective: 'Beej mantras and Mahamrityunjaya mantra.', refs: { f: '107-109', p: '72, 75' } },
        { id: 'missing-remedies', title: { en: 'Practices for Your Missing Numbers', hi: 'मिसिंग नंबरों के लिए अभ्यास' }, kind: 'narrative',
          objective: 'For each missing number in the grid, suggest two or three free, practical habits that develop the quality it represents (routines, colours, direction, service). If none is missing, suggest how to keep the grid\'s balance. Nothing to buy.',
          requiredEvidence: ['num.loshu.missing'], optionalEvidence: ['num.loshu.count.*', 'num.kua*', 'num.colours'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 6 }, refs: { f: '105-106', p: '73-74' } },
        { id: 'wellbeing-practices', title: { en: 'Daily Practices for Balance', hi: 'संतुलन के दैनिक अभ्यास' }, kind: 'narrative',
          objective: 'A short routine built around the Mulank ruler: mantra practice, its weekday, service and charity in kind, and calm habits. Ethical and devotional only; nothing to buy.',
          requiredEvidence: ['num.mulank.planet', 'num.weekday'], optionalEvidence: ['num.avatar', 'num.colours', 'num.bhagyank.planet'], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 5 }, refs: { f: '107-109', p: '72, 75' } },
      ],
    },
  ];
}

function toTopic(t: TopicSpec, lang: Lang, ref: 'f' | 'p'): ReportTopicInput {
  return {
    id: t.id,
    title: t.title[lang],
    subtitle: t.subtitle?.[lang],
    kind: t.kind,
    objective: t.objective,
    block: t.block,
    requiredEvidence: t.requiredEvidence ?? [],
    optionalEvidence: t.optionalEvidence ?? [],
    dependsOn: t.dependsOn ?? [],
    depth: t.depth ? { bullets: 0, ...t.depth } : undefined,
    referencePages: t.refs?.[ref],
    bonus: t.bonus ?? !t.refs?.[ref],
  };
}

/** Numerology sections for a report in the given language; `ref` picks the reference page column. */
export function numerologySections(prefix: string, lang: Lang, ref: 'f' | 'p'): SectionInput[] {
  return numerologySectionSpecs(prefix).map((s) => ({
    id: s.id,
    title: s.title[lang],
    kicker: s.kicker[lang],
    intro: s.intro?.[lang],
    topics: s.topics.map((t) => toTopic(t, lang, ref)),
  }));
}

/**
 * Hindi titles of the numerology sections and topics, in the shape of a HindiEdition overlay
 * (platform/i18n/hindi.ts), for a report whose own definition is English (Fortune Plus).
 */
export function numerologyHindiText(): {
  sections: Record<string, { title: string; kicker: string; intro?: string }>;
  topics: Record<string, { title: string; subtitle?: string }>;
} {
  const specs = numerologySectionSpecs('numerology');
  return {
    sections: Object.fromEntries(specs.map((s) => [s.id, { title: s.title.hi, kicker: s.kicker.hi, intro: s.intro?.hi }])),
    topics: Object.fromEntries(specs.flatMap((s) => s.topics).map((t) => [t.id, { title: t.title.hi, subtitle: t.subtitle?.hi }])),
  };
}

export const NUMEROLOGY_WRITING_GUIDANCE = [
  'This is a numerology report. Every number has already been calculated; never compute, change or add a number. Use only the numbers in the evidence.',
  'Ruling planets here are numerological associations of numbers, not positions in a birth chart: never say a planet is placed in a house or sign in this numerology part.',
  'The reader\'s name and its letters are private and not provided; refer only to the name numbers. Never guess letters or spellings.',
  'Numerology describes tendencies and seasons, not fixed fate. No guarantees, no fear, no "unlucky" labels for people; frame demanding numbers as areas that need patience.',
  'Health is discussed as wellbeing and lifestyle only, with no diagnoses; money as habits and planning, never investment advice.',
  'Remedies are free practices only (mantra, routine, service, charity in kind, colours, orderliness). Never recommend buying gemstones, rudraksha, yantras, bracelets, crystals or rituals.',
];
