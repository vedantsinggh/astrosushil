import { ChartCalculator, AstronomyEngineAdapter, DEFAULT_ASTROLOGY_CONFIG, normalizeAstroChart } from '@astro/astrology-engine';
import {
  VocationalSynthesisEngine,
  careerEditorialLlmService,
  EditorialPartOutput,
  EditorialTopicOutput,
} from '@astro/prediction-engine';
import { escapeLatex } from '../generators/report-data-tex.generator';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Astro Sushil - Career Monograph LaTeX Part Files Generator
 * Generates all 10 modular LaTeX part files into `packages/report-engine/templates/parts/`
 * using the real LLM output from `careerEditorialLlmService`.
 */

function markdownToLatex(text: any): string {
  if (!text) return '';
  if (Array.isArray(text)) {
    return text.map((item) => markdownToLatex(item)).join(' ');
  }
  const str = typeof text === 'string' ? text : String(text);
  const boldMatches: string[] = [];
  const withPlaceholders = str.replace(/\*\*(.+?)\*\*/g, (_, content) => {
    boldMatches.push(content);
    return `BOLDPLACEHOLDER_${boldMatches.length - 1}_END`;
  });
  let escaped = escapeLatex(withPlaceholders);
  boldMatches.forEach((content, idx) => {
    escaped = escaped.replace(`BOLDPLACEHOLDER_${idx}_END`, `\\textbf{${escapeLatex(content)}}`);
  });
  return escaped;
}

function formatTopicToLatex(topic: EditorialTopicOutput): string {
  let tex = '';
  tex += `\\TopicHeader{${topic.topicNumber}}{${escapeLatex(topic.title)}}{${escapeLatex(topic.subtitle)}}\n`;
  tex += `\\label{topic${topic.topicNumber}}\n\n`;

  // Flatten and clean paragraphs & extract any nested pointers
  const cleanedParagraphs: string[] = [];
  const additionalPointers: string[] = [];

  for (const p of topic.paragraphs || []) {
    if (Array.isArray(p)) {
      for (const item of p) {
        if (typeof item === 'string') {
          if (item.trim().startsWith('✦') || item.trim().startsWith('•') || item.trim().startsWith('-')) {
            additionalPointers.push(item);
          } else {
            cleanedParagraphs.push(item);
          }
        } else if (item) {
          cleanedParagraphs.push(String(item));
        }
      }
    } else if (typeof p === 'string') {
      cleanedParagraphs.push(p);
    } else if (p && typeof p === 'object') {
      const val = (p as any).text || (p as any).paragraph || JSON.stringify(p);
      cleanedParagraphs.push(String(val));
    }
  }

  const allDiamondPointers: string[] = [];
  for (const dp of [...(topic.diamondPointers || []), ...additionalPointers]) {
    if (typeof dp === 'string') {
      allDiamondPointers.push(dp);
    } else if (Array.isArray(dp)) {
      for (const item of dp) {
        if (item) allDiamondPointers.push(String(item));
      }
    } else if (dp) {
      allDiamondPointers.push(String(dp));
    }
  }

  // Render paragraphs
  if (cleanedParagraphs.length > 0) {
    const leadPara = cleanedParagraphs[0];
    tex += `{\\fontsize{9.5}{13.8}\\selectfont\\bfseries\\color{DeepSlate} ${markdownToLatex(leadPara)}}\\par\\vspace{2mm}\n\n`;

    for (let i = 1; i < cleanedParagraphs.length; i++) {
      const p = cleanedParagraphs[i];
      const hasLatin = /[a-zA-Z]/.test(p);
      const isPureDevanagari = /[\u0900-\u097F]/.test(p) && !hasLatin;
      if (isPureDevanagari) {
        tex += `{\\devanagarifont\\fontsize{9.5}{14}\\selectfont\\color{ExecutiveNavy} ${p}}\\par\\vspace{2mm}\n\n`;
      } else {
        tex += `{\\fontsize{9}{13}\\selectfont ${markdownToLatex(p)}}\\par\\vspace{1.8mm}\n\n`;
      }
    }
  }

  // Render diamond observation pointers
  if (allDiamondPointers.length > 0) {
    tex += `\\begin{diamondlist}\n`;
    for (const b of allDiamondPointers) {
      const cleanBullet = b.replace(/^[✦❖•\-*]\s*/, '');
      const hasLatin = /[a-zA-Z]/.test(cleanBullet);
      const isPureDevanagari = /[\u0900-\u097F]/.test(cleanBullet) && !hasLatin;
      const fontPrefix = isPureDevanagari ? '{\\devanagarifont ' : '';
      const fontSuffix = isPureDevanagari ? '}' : '';
      tex += `  \\item {\\fontsize{8.5}{12}\\selectfont ${fontPrefix}${markdownToLatex(cleanBullet)}${fontSuffix}}\n`;
    }
    tex += `\\end{diamondlist}\n\n`;
  }

  // Render takeaway / strategic box
  if (topic.takeaway) {
    tex += `\\StrategicBox{${markdownToLatex(topic.takeaway)}}\n\n`;
  }

  // Inject Topic-Specific Astrological Visual Components
  if (topic.topicNumber === 6) {
    // Topic 6: Vedic Charts
    tex += `\\vspace{2mm}\n`;
    tex += `\\TwoCol{\n`;
    tex += `  \\begin{executivecard}\n`;
    tex += `    \\CardTitle{D1 Rashi Kundli (Ascendant: \\AscendantSign)}\n`;
    tex += `    \\begin{center}\n`;
    tex += `      \\RenderRefinedKundli{0.48}{VargaDOne}\n`;
    tex += `    \\end{center}\n`;
    tex += `    \\vspace{1mm}\n`;
    tex += `    {\\sffamily\\fontsize{7.5}{9.5}\\selectfont\\color{MutedSlate}\\textbf{Ascendant:} \\AscendantDegree\\ \\AscendantSign\\ (\\AscendantNakshatra\\ Pada \\AscendantPada)}\n`;
    tex += `  \\end{executivecard}\n`;
    tex += `}{\n`;
    tex += `  \\begin{executivecard}\n`;
    tex += `    \\CardTitle{D10 Dashamsha Chakra (Career Stature)}\n`;
    tex += `    \\begin{center}\n`;
    tex += `      \\RenderRefinedKundli{0.48}{VargaDTen}\n`;
    tex += `    \\end{center}\n`;
    tex += `    \\vspace{1mm}\n`;
    tex += `    {\\sffamily\\fontsize{7.5}{9.5}\\selectfont\\color{MutedSlate}\\textbf{D10 Ascendant:} \\DTenAscendantSign\\ (Ruled by \\DTenAscendantLord)}\n`;
    tex += `  \\end{executivecard}\n`;
    tex += `}\n\\vspace{2mm}\n\n`;
  } else if (topic.topicNumber === 24) {
    // Topic 24: Planetary Yogas Table
    tex += `\\begin{executivecard}\n`;
    tex += `  \\CardTitle{Prominent Career Yogas in Your Natal Architecture}\n`;
    tex += `  \\sffamily\\fontsize{8}{11.5}\\selectfont\n`;
    tex += `  \\begin{tabularx}{\\linewidth}{@{}l l X@{}}\n`;
    tex += `    \\toprule\n`;
    tex += `    \\textbf{Yoga Name} & \\textbf{Planetary Axis} & \\textbf{Professional Manifestation} \\\\\n`;
    tex += `    \\midrule\n`;
    tex += `    \\textbf{Raja Yoga} & Sun + Jupiter (9th \\& 10th lords) & Sovereign authority, institutional standing, executive credibility. \\\\\n`;
    tex += `    \\textbf{Budhaditya Yoga} & Sun + Mercury in Sagittarius & High analytical clarity, strategic intellect, financial acumen. \\\\\n`;
    tex += `    \\textbf{Dhana Yoga} & 2nd, 5th, 9th, 11th lord connections & Wealth retention, resource compounding through professional trade. \\\\\n`;
    tex += `    \\textbf{Chandra-Mangala} & Moon + Mars in 11th Virgo & Relentless commercial drive, enterprise agility, execution stamina. \\\\\n`;
    tex += `    \\textbf{Uchcha Shani} & Saturn exalted in 12th Libra & Long-term institutional diplomacy, cross-border or secluded operations. \\\\\n`;
    tex += `    \\bottomrule\n`;
    tex += `  \\end{tabularx}\n`;
    tex += `\\end{executivecard}\\vspace{2mm}\n\n`;
  } else if (topic.topicNumber === 25) {
    // Topic 25: D10 Dashamsha Divisional Placements
    tex += `\\begin{executivecard}\n`;
    tex += `  \\CardTitle{D10 Dashamsha Harmonic Planetary Register}\n`;
    tex += `  \\sffamily\\fontsize{8}{11.5}\\selectfont\n`;
    tex += `  \\begin{tabularx}{\\linewidth}{@{}l l l X@{}}\n`;
    tex += `    \\toprule\n`;
    tex += `    \\textbf{Planet} & \\textbf{D10 Sign} & \\textbf{D10 House} & \\textbf{Executive Dynamic} \\\\\n`;
    tex += `    \\midrule\n`;
    tex += `    \\textbf{Sun} & Aries (Exalted) & 7th House & Exceptional leadership presence in public partnerships. \\\\\n`;
    tex += `    \\textbf{Moon} & Aquarius & 5th House & Intuitive strategic foresight and creative ideation. \\\\\n`;
    tex += `    \\textbf{Mars} & Aquarius & 5th House & Technical innovation and competitive problem-solving. \\\\\n`;
    tex += `    \\textbf{Mercury} & Scorpio & 2nd House & Financial negotiation and confidential intellectual capital. \\\\\n`;
    tex += `    \\textbf{Jupiter} & Sagittarius (Own) & 3rd House & Courageous strategic communications and advisory initiatives. \\\\\n`;
    tex += `    \\textbf{Venus} & Cancer & 10th House & High executive stature, diplomatic grace in leadership. \\\\\n`;
    tex += `    \\textbf{Saturn} & Aries (Debilitated) & 7th House & Partnership friction; debility conditionally mitigated by exalted Sun. \\\\\n`;
    tex += `    \\textbf{Rahu} & Leo & 11th House & Unconventional enterprise gains and large-scale networks. \\\\\n`;
    tex += `    \\textbf{Ketu} & Aquarius & 5th House & Detached analytical design and algorithmic intuition. \\\\\n`;
    tex += `    \\bottomrule\n`;
    tex += `  \\end{tabularx}\n`;
    tex += `\\end{executivecard}\\vspace{2mm}\n\n`;
  } else if (topic.topicNumber === 53) {
    // Topic 53: Complete 12-House Sarvashtakavarga (SAV) Bindu Distribution Table
    tex += `\\begin{executivecard}\n`;
    tex += `  \\CardTitle{Complete 12-House Sarvashtakavarga (SAV) Bindu Distribution}\n`;
    tex += `  \\sffamily\\fontsize{8}{11.5}\\selectfont\n`;
    tex += `  \\begin{tabularx}{\\linewidth}{@{}c l c c X@{}}\n`;
    tex += `    \\toprule\n`;
    tex += `    \\textbf{House} & \\textbf{Sign} & \\textbf{Bindus} & \\textbf{Status vs Mean (28)} & \\textbf{Strategic Career Implication} \\\\\n`;
    tex += `    \\midrule\n`;
    tex += `    1 & Scorpio & 28 & Neutral (28) & Steady personal constitution and executive endurance. \\\\\n`;
    tex += `    2 & Sagittarius & 27 & Slightly Below (-1) & Wealth accumulation requires intentional discipline. \\\\\n`;
    tex += `    3 & Capricorn & 29 & Above Average (+1) & High initiative, proactive communication, reliable drive. \\\\\n`;
    tex += `    4 & Aquarius & 26 & Below Average (-2) & Inner restlessness; workplace must be quiet and structured. \\\\\n`;
    tex += `    5 & Pisces & 25 & Below Average (-3) & Avoid speculative gambles; rely on structured analytics. \\\\\n`;
    tex += `    6 & Aries & 34 & \\textbf{Very Strong (+6)} & Exceptional competitive endurance, operational superiority. \\\\\n`;
    tex += `    7 & Taurus & 25 & Below Average (-3) & Select contractual partners with rigorous due diligence. \\\\\n`;
    tex += `    8 & Gemini & 28 & Neutral (28) & Balanced capacity for crisis resolution and transformation. \\\\\n`;
    tex += `    9 & Cancer & 26 & Below Average (-2) & Institutional guidance and continuous learning required. \\\\\n`;
    tex += `    10 & Leo & 32 & \\textbf{Very Strong (+4)} & Exceptional executive authority, career prominence. \\\\\n`;
    tex += `    11 & Virgo & 33 & \\textbf{Very Strong (+5)} & Outstanding commercial realization, cash-flow leverage. \\\\\n`;
    tex += `    12 & Libra & 24 & Weak (-4) & Low operational leakage; minimal wasteful institutional drag. \\\\\n`;
    tex += `    \\bottomrule\n`;
    tex += `  \\end{tabularx}\n`;
    tex += `\\end{executivecard}\\vspace{2mm}\n\n`;
  } else if (topic.topicNumber === 55) {
    // Topic 55: Vimshottari Dasha Active Window Table
    tex += `\\begin{executivecard}\n`;
    tex += `  \\CardTitle{Vimshottari Dasha: Active \\& Upcoming Sub-Periods (Saturn Mahadasha)}\n`;
    tex += `  \\sffamily\\fontsize{8}{11.5}\\selectfont\n`;
    tex += `  \\begin{tabularx}{\\linewidth}{@{}l l l X@{}}\n`;
    tex += `    \\toprule\n`;
    tex += `    \\textbf{Sub-Period (Antardasha)} & \\textbf{Start Date} & \\textbf{End Date} & \\textbf{Strategic Focus} \\\\\n`;
    tex += `    \\midrule\n`;
    tex += `    \\textbf{Saturn -- Saturn} & 2011 & 2014 & Heavy operational foundation, disciplined re-alignment. \\\\\n`;
    tex += `    \\textbf{Saturn -- Mercury} & \\textbf{Active} & \\textbf{Oct 2026} & High commercial leverage, intellectual capital, systems architecture. \\\\\n`;
    tex += `    \\textbf{Saturn -- Ketu} & Oct 2026 & Nov 2027 & Structural consolidation, internal audits, delegating routine tasks. \\\\\n`;
    tex += `    \\textbf{Saturn -- Venus} & Nov 2027 & Jan 2031 & Major career harvest, high executive prestige, wealth accumulation. \\\\\n`;
    tex += `    \\textbf{Saturn -- Sun} & Jan 2031 & Dec 2031 & Institutional advisory, government liaisons, sovereign authority. \\\\\n`;
    tex += `    \\bottomrule\n`;
    tex += `  \\end{tabularx}\n`;
    tex += `\\end{executivecard}\\vspace{2mm}\n\n`;
  } else if (topic.topicNumber === 59) {
    // Topic 59: Gemstone Recommendation Card
    tex += `\\begin{executivecard}\n`;
    tex += `  \\CardTitle{Prescribed Gemstone: Natural Emerald (Panna)}\n`;
    tex += `  \\sffamily\\fontsize{8}{11.5}\\selectfont\n`;
    tex += `  \\begin{tabularx}{\\linewidth}{@{}l X l X@{}}\n`;
    tex += `    \\textbf{Governing Planet:} & Mercury (\\textit{Budha}) & \\textbf{Recommended Metal:} & Gold or Panchadhatu \\\\\n`;
    tex += `    \\textbf{Recommended Carat:} & 3.5 to 5.25 Carats & \\textbf{Wearing Finger:} & Little finger of right hand \\\\\n`;
    tex += `    \\textbf{Consecration Day:} & Wednesday morning (Shukla Paksha) & \\textbf{Seed Mantra:} & \\textit{Om Bum Budhaya Namah} (108 times) \\\\\n`;
    tex += `    \\textbf{Primary Objective:} & Enhance analytical focus, commercial negotiation, and speech eloquence. & \\textbf{Precaution:} & Must be unheated, untreated, and eye-clean. \\\\\n`;
    tex += `  \\end{tabularx}\n`;
    tex += `\\end{executivecard}\\vspace{2mm}\n\n`;
  } else if (topic.topicNumber === 68) {
    // Topic 68: 30-Day Operational Action Plan Table
    tex += `\\begin{highlightcard}\n`;
    tex += `  \\CardTitle{30-Day Operational Action Plan: Foundations \\& Clarity}\n`;
    tex += `  \\sffamily\\fontsize{8}{11.5}\\selectfont\n`;
    tex += `  \\begin{tabularx}{\\linewidth}{@{}l l X@{}}\n`;
    tex += `    \\toprule\n`;
    tex += `    \\textbf{Day Range} & \\textbf{Operational Focus} & \\textbf{Tangible Milestone} \\\\\n`;
    tex += `    \\midrule\n`;
    tex += `    \\textbf{Days 1--10} & Workflow Audit \\& Time Boundaries & Eliminate 5 hours of non-essential meetings; document key priorities. \\\\\n`;
    tex += `    \\textbf{Days 11--20} & Workspace \\& Workspace Alignment & Cleanse workspace; align desk to North/East; establish Saturday rhythm. \\\\\n`;
    tex += `    \\textbf{Days 21--30} & Communication Protocol & Adopt asynchronous documentation; streamline stakeholder briefings. \\\\\n`;
    tex += `    \\bottomrule\n`;
    tex += `  \\end{tabularx}\n`;
    tex += `\\end{highlightcard}\\vspace{2mm}\n\n`;
  } else if (topic.topicNumber === 69) {
    // Topic 69: 90-Day Tactical Momentum Plan Table
    tex += `\\begin{highlightcard}\n`;
    tex += `  \\CardTitle{90-Day Tactical Momentum Plan: Alliances \\& Commercial Positioning}\n`;
    tex += `  \\sffamily\\fontsize{8}{11.5}\\selectfont\n`;
    tex += `  \\begin{tabularx}{\\linewidth}{@{}l l X@{}}\n`;
    tex += `    \\toprule\n`;
    tex += `    \\textbf{Month} & \\textbf{Tactical Focus} & \\textbf{Tangible Milestone} \\\\\n`;
    tex += `    \\midrule\n`;
    tex += `    \\textbf{Month 1} & Stakeholder Alignment & Initiate bilateral quarterly reviews with key decision-makers. \\\\\n`;
    tex += `    \\textbf{Month 2} & High-Value Systems Asset & Author and publish an institutional architectural framework. \\\\\n`;
    tex += `    \\textbf{Month 3} & Commercial Scope Expansion & Secure mandate for cross-functional initiative or new revenue stream. \\\\\n`;
    tex += `    \\bottomrule\n`;
    tex += `  \\end{tabularx}\n`;
    tex += `\\end{highlightcard}\\vspace{2mm}\n\n`;
  } else if (topic.topicNumber === 70) {
    // Topic 70: 365-Day Strategic Elevation Plan Table
    tex += `\\begin{highlightcard}\n`;
    tex += `  \\CardTitle{365-Day Strategic Elevation Plan: Executive Stature \\& Enterprise Harvest}\n`;
    tex += `  \\sffamily\\fontsize{8}{11.5}\\selectfont\n`;
    tex += `  \\begin{tabularx}{\\linewidth}{@{}l l X@{}}\n`;
    tex += `    \\toprule\n`;
    tex += `    \\textbf{Quarter} & \\textbf{Strategic Focus} & \\textbf{Tangible Milestone} \\\\\n`;
    tex += `    \\midrule\n`;
    tex += `    \\textbf{Q1} & Institutional Sovereignty & Transition from execution details to strategic governance. \\\\\n`;
    tex += `    \\textbf{Q2} & Enterprise Partnerships & Formalize high-margin advisory or enterprise joint ventures. \\\\\n`;
    tex += `    \\textbf{Q3} & Public Stature \\& Thought Leadership & Keynote or publish whitepaper establishing industry domain authority. \\\\\n`;
    tex += `    \\textbf{Q4} & Annual Harvest \\& Succession & Evaluate capital compounding; establish autonomous operating systems. \\\\\n`;
    tex += `    \\bottomrule\n`;
    tex += `  \\end{tabularx}\n`;
    tex += `\\end{highlightcard}\\vspace{2mm}\n\n`;
  }

  // NOTICE: No \\clearpage here! Topics flow naturally down the page.
  return tex;
}

function formatPartToLatex(part: EditorialPartOutput): string {
  let tex = `% ==========================================================================\n`;
  tex += `% PART ${part.partNumber}: ${part.partTitle}\n`;
  tex += `% ==========================================================================\n\n`;

  // Part Opener Header (starts on fresh page)
  tex += `\\PartOpener{${part.partNumber}}{${escapeLatex(part.partTitle)}}{${escapeLatex(part.partSubtitle || '')}}\n\n`;

  // Sanskrit Epigraph
  if (part.epigraphSanskrit) {
    tex += `\\EpigraphCard{${part.epigraphSanskrit}}{${escapeLatex(part.epigraphTransliteration || '')}}{${escapeLatex(part.epigraphTranslation || '')}}{${escapeLatex(part.epigraphSource || '')}}\n\n`;
  }

  // Part Introduction
  if (part.partIntroduction) {
    tex += `{\\fontsize{9.5}{14}\\selectfont\\color{DeepSlate}\\itshape ${escapeLatex(part.partIntroduction)}}\\par\\vspace{3.5mm}\n\n`;
  }

  // Topics flow naturally down the page!
  for (const topic of part.topics) {
    tex += formatTopicToLatex(topic);
  }

  return tex;
}

export async function generateAllMonographParts(options?: { forceRegenerate?: boolean }) {
  console.log('Calculating canonical chart for Puneet Kumar...');
  const chartCalculator = new ChartCalculator(new AstronomyEngineAdapter());
  const puneetBirthDetails = {
    date: { year: 1983, month: 12, day: 28 },
    time: { hour: 4, minute: 45, second: 0 },
    timezone: 'Asia/Kolkata',
    latitude: 28.4069,
    longitude: 77.8498,
    placeName: 'Bulandshahr, India',
  };

  const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
  const normalizedChart = normalizeAstroChart(chart);

  const vocationalEngine = new VocationalSynthesisEngine();
  const synthesis = vocationalEngine.synthesize({ chart: normalizedChart });

  const clientMetadata = {
    name: 'Puneet Kumar',
    dateOfBirth: '1983-12-28',
    timeOfBirth: '04:45',
    birthPlace: 'Bulandshahr, India',
    placeName: 'Bulandshahr, India',
  };

  console.log('Invoking CareerEditorialLlmService for all 10 Parts via real OpenRouter batches...');
  const parts = await careerEditorialLlmService.generateAllParts(
    normalizedChart,
    synthesis,
    clientMetadata,
    options
  );

  const outputDir = path.resolve(__dirname, '../../templates/parts');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const partFileMap: Record<string, string> = {
    part01: 'part01_quest.tex',
    part02: 'part02_lagna.tex',
    part03: 'part03_d10.tex',
    part04: 'part04_bnn.tex',
    part05: 'part05_voyage.tex',
    part06: 'part06_govjob.tex',
    part07: 'part07_entrepreneur.tex',
    part08: 'part08_clock.tex',
    part09: 'part09_remedies.tex',
    part10: 'part10_roadmap.tex',
  };

  for (const [key, filename] of Object.entries(partFileMap)) {
    const part = parts.get(key);
    if (!part) {
      console.error(`Part ${key} not found in generated parts!`);
      continue;
    }
    const texContent = formatPartToLatex(part);
    const destPath = path.join(outputDir, filename);
    fs.writeFileSync(destPath, texContent, 'utf-8');
    console.log(`Wrote ${filename} (${part.topics.length} topics, ${texContent.length} bytes)`);
  }

  console.log('Successfully generated all 10 modular LaTeX part files with natural continuous flow!');
}

async function main() {
  await generateAllMonographParts();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error in generate-monograph-parts:', err);
    process.exit(1);
  });
}
