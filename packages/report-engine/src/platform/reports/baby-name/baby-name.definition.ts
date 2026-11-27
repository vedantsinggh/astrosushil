/**
 * Baby Name Report — classical name guidance for a newborn.
 *
 * Reference: docs/referencerepots/Baby Name Report.pdf (15 pp, third-party;
 * information architecture only). Analysis: docs/report-system/analysis/ref-baby-name.md.
 * The reference shows no selection rule; this report uses the classical
 * namakshara (birth-pada syllable) plus numerology fit (BAB-001 … BAB-005 in
 * docs/report-system/decisions/numerology.md). The reference's adult content
 * in plane texts is deliberately excluded.
 */
import { ReportDefinitionInput } from '../../contracts';

export const BABY_NAME_DEFINITION: ReportDefinitionInput = {
  id: 'baby-name',
  reportType: 'BABY_NAME',
  specVersion: '1.0.0',
  title: 'Baby Name Report',
  subtitle: 'Classical syllables from your child\'s birth star, and the numbers that suit them',
  description:
    'This report finds the traditional first syllable for your child\'s name from the Moon\'s nakshatra pada at birth, lists the related syllables of the birth star and Moon sign, and shows which name numbers sit well with your child\'s Mulank and Bhagyank. Any names you are considering are checked against both. The final choice, and its meaning in your family, is always yours.',
  referenceFiles: ['docs/referencerepots/Baby Name Report.pdf'],
  requires: { birthTime: true, partner: false, vargas: ['D1'], transitYears: 1 },
  language: 'en',
  theme: { primary: '462170', accent: 'CC9924', tint: 'F5F1FB' },
  writingGuidance: [
    'This report is about naming a newborn child. Keep every sentence warm, gentle and suitable for a family reading about their baby. Never mention romance, sexuality or adult relationships.',
    'The syllables and numbers are already calculated; never change or compute them. Candidate names are referred to only as "candidate 1", "candidate 2" and so on; their spellings are not provided.',
    'When suggesting example names, present them clearly as ideas to explore that begin with the given syllables, never as the chart\'s choice. Give a short meaning only if it is widely known, and remind the family to confirm meaning, origin and spelling.',
    'Numerology and namakshara describe tendencies and tradition; no guarantees about the child\'s future, health, intelligence or success.',
    'Respect every family\'s culture, language and choice; never pressure towards a particular name or imply that a name could harm the child.',
  ],
  sections: [
    {
      id: 'details',
      title: 'Your Details',
      kicker: 'Introduction',
      topics: [
        { id: 'child-details', title: 'Birth Details Used', kind: 'data', block: 'baby-name-details', objective: 'Child\'s details, Moon sign, nakshatra pada, Mulank and Bhagyank.', referencePages: '4' },
        {
          id: 'why-name-matters', title: 'Why a Name Matters', subtitle: 'Sound, number and identity', kind: 'narrative',
          objective: 'Explain the two traditions this report uses: the namakshara (the first sound linked to the birth star in Vedic tradition) and name numerology (each letter carries a value). Describe how a name supports identity, confidence and belonging, without overstating its power.',
          requiredEvidence: ['baby.syllable.primary'], optionalEvidence: ['baby.janma-pada', 'numerology.mulank', 'numerology.bhagyank'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, referencePages: '5-6',
        },
      ],
    },
    {
      id: 'syllables',
      title: 'Syllables from the Birth Star',
      kicker: 'Namakshara',
      topics: [
        { id: 'syllable-table', title: 'Your Child\'s Name Syllables', kind: 'data', block: 'baby-name-syllables', objective: 'Primary syllable, nakshatra syllables and Moon-sign syllables.', bonus: true },
        {
          id: 'syllable-guidance', title: 'Reading the Syllables', kind: 'narrative',
          objective: 'Explain the birth nakshatra and pada, why its syllable is the traditional first choice, and how the other syllables of the nakshatra and of the Moon sign widen the options. Include how families commonly use these (formal name vs pet name).',
          requiredEvidence: ['baby.syllable.primary', 'baby.janma-pada'], optionalEvidence: ['baby.syllables.*', 'planet.moon.d1.sign'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, bonus: true,
        },
        {
          id: 'name-ideas', title: 'Name Ideas to Explore', subtitle: 'Examples beginning with your syllables', kind: 'narrative',
          objective: 'Offer 8 to 12 example names suitable for the child\'s gender that begin with the primary syllable or the other nakshatra syllables, grouped by syllable, each with a short widely known meaning where one exists. Frame them strictly as ideas to explore, and suggest checking each one\'s number with the guide in this report.',
          requiredEvidence: ['baby.syllable.primary', 'baby.syllables.nakshatra', 'baby.gender'], optionalEvidence: ['baby.numbers.supportive', 'baby.syllables.rashi'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 10 }, dependsOn: ['syllable-guidance'], referencePages: '7',
        },
      ],
    },
    {
      id: 'numbers',
      title: 'The Numbers of Your Child',
      kicker: 'Numerology',
      topics: [
        { id: 'birth-grid', title: 'Birth-Date Grid', kind: 'data', block: 'baby-name-loshu', objective: 'Lo Shu grid of the date of birth.', referencePages: '8' },
        {
          id: 'child-numbers', title: 'Mulank, Bhagyank and the Birth Grid', kind: 'narrative',
          objective: 'Gently describe the child\'s Mulank and Bhagyank and what the birth-date grid shows (present and missing numbers) as natural tendencies to nurture.',
          requiredEvidence: ['numerology.mulank', 'numerology.bhagyank'], optionalEvidence: ['num.mulank.planet', 'num.bhagyank.planet', 'num.loshu.missing', 'num.loshu.repeated'],
          depth: { minParagraphs: 2, maxParagraphs: 3 }, bonus: true,
        },
        { id: 'number-guide', title: 'Name-Number Guide', kind: 'data', block: 'baby-name-number-guide', objective: 'Fit of name numbers 1–9 with Mulank and Bhagyank.', bonus: true },
        {
          id: 'number-fit', title: 'Choosing a Name Number', kind: 'narrative',
          objective: 'Explain the supportive, workable and needs-care groups of name numbers for this child and how to use them alongside the syllable when shortlisting; a workable number is perfectly acceptable.',
          requiredEvidence: ['baby.numbers.supportive'], optionalEvidence: ['baby.numbers.workable', 'baby.numbers.care', 'numerology.mulank', 'numerology.bhagyank'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, bonus: true,
        },
      ],
    },
    {
      id: 'candidates',
      title: 'The Names You Are Considering',
      kicker: 'Name Check',
      topics: [
        { id: 'candidate-table', title: 'Your Shortlist at a Glance', kind: 'data', block: 'baby-name-candidates', objective: 'Each candidate\'s number, fit and syllable match.', referencePages: '7' },
        {
          id: 'candidate-comparison', title: 'Comparing Your Shortlist', kind: 'narrative',
          objective: 'For each candidate (by number), discuss its number fit and syllable match and what each suggests; if no candidates were provided, explain how to use the worksheet to check names. Never rank one name as wrong.',
          requiredEvidence: ['baby.candidates.count'], optionalEvidence: ['baby.candidate.*.number', 'baby.candidate.*.syllable', 'baby.numbers.supportive'],
          depth: { minParagraphs: 2, maxParagraphs: 4 }, referencePages: '7',
        },
        { id: 'candidate-grids', title: 'Name Grids', kind: 'data', block: 'baby-name-candidate-planes', objective: 'Planes-of-expression grid per candidate.', referencePages: '9-14' },
        {
          id: 'candidate-planes', title: 'What the Name Grids Show', kind: 'narrative',
          objective: 'Interpret the mental, physical, emotional and intuitive plane counts, and the soul urge and personality numbers, of each candidate as gentle character tendencies for a child (curiosity, energy, feelings, imagination). Child-appropriate only. If no candidates were provided, explain the four planes in general.',
          requiredEvidence: ['baby.candidates.count'], optionalEvidence: ['baby.candidate.*.plane.*', 'baby.candidate.*.soul-urge', 'baby.candidate.*.personality'],
          depth: { minParagraphs: 2, maxParagraphs: 4 }, referencePages: '9-14',
        },
      ],
    },
    {
      id: 'worksheet',
      title: 'Test Any Name Yourself',
      kicker: 'Worksheet',
      topics: [
        { id: 'worksheet-table', title: 'Chaldean Letter Values', kind: 'data', block: 'baby-name-worksheet', objective: 'Letter values and steps to test a name.', bonus: true },
      ],
    },
  ],
};
