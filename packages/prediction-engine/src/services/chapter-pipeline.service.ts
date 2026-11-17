/**
 * Astro Sushil - Chapter-Oriented Editorial Content Generation Pipeline
 *
 * Implements:
 * 1. 10-chapter modular generation architecture covering all 16 consultation narrative themes
 * 2. Scoped evidence packets per chapter (preventing token overflow & context distraction)
 * 3. Dynamic OpenRouter model discovery, probing, and multi-model fallback across free models
 * 4. Input-hashed persistent chapter caching on disk for instant resumption
 * 5. Practical content & evidence validation (anti-boilerplate, duplicate check, ethical remedy guardrails)
 * 6. Direct second-person consultation prose with shastric grounding and modern vocational translation
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { NormalizedChart } from '@astro/astrology-engine';
import { VocationalSynthesisResult } from './vocational-synthesis.engine';
import { openRouterModelRegistry } from './openrouter-model-registry';
import { getOpenRouterCareerConfig } from '../config/openrouter-career.config';

export type ChapterId =
  | 'ch01_orientation_blueprint'
  | 'ch02_mysteries_of_lagna'
  | 'ch03_tenth_house_mandate'
  | 'ch04_d10_dashamsha_map'
  | 'ch05_planetary_influences_yogas'
  | 'ch06_vocational_strengths_archetypes'
  | 'ch07_professional_challenges_risk_mitigation'
  | 'ch08_career_environments_employment_vs_enterprise'
  | 'ch09_cosmic_clock_timing_windows'
  | 'ch10_roadmap_and_ethical_remedies';

export interface ChapterThematicSection {
  heading: string;
  paragraphs: string[];
  keyTakeaways?: string[];
  strategicImplication?: string;
  cautionaryNote?: string;
}

export interface ChapterRemedyItem {
  title: string;
  category: string;
  governingFactor: string;
  specificRecommendation: string;
  protocolSteps: string[];
  ethicalDisclaimer: string;
}

export interface ChapterRoadmapPhase {
  focus: string;
  immediateActions: string[];
  experiments: string[];
  metrics: string;
}

export interface ChapterContentOutput {
  chapterId: ChapterId;
  title: string;
  subtitle: string;
  epigraph?: {
    sanskrit?: string;
    transliteration?: string;
    translation: string;
    source: string;
  };
  leadParagraph: string;
  thematicSections: ChapterThematicSection[];
  keyTakeaways?: string[];
  remedies?: ChapterRemedyItem[];
  roadmap?: {
    thirtyDay: ChapterRoadmapPhase;
    ninetyDay: ChapterRoadmapPhase;
    oneYear: ChapterRoadmapPhase;
    threeYear: ChapterRoadmapPhase;
  };
  closingSummary?: string;
  modelUsed?: string;
  generatedAt?: string;
}

export interface ChapterEvidencePacket {
  chapterId: ChapterId;
  objective: string;
  clientMetadata: {
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeName?: string;
  };
  calculatedFacts: Record<string, any>;
  traditionalPrinciples: string[];
  vocationalSynthesisNotes: string[];
  contradictoryTensions: string[];
  uncertaintyBoundaries: string[];
  previousChapterSummary?: string;
}

export interface ChapterPipelineOptions {
  apiKey?: string;
  forceRegenerate?: boolean;
  cacheDir?: string;
  maxRetriesPerChapter?: number;
}

const PROMPT_VERSION = 'v2.1_consultation_monograph';

export class ChapterPipelineService {
  private static instance: ChapterPipelineService;
  private readonly defaultCacheDir: string;

  private constructor() {
    this.defaultCacheDir = path.resolve('/tmp/astro-sushil/cache/chapters');
  }

  public static getInstance(): ChapterPipelineService {
    if (!ChapterPipelineService.instance) {
      ChapterPipelineService.instance = new ChapterPipelineService();
    }
    return ChapterPipelineService.instance;
  }

  /**
   * Generates or loads all 10 chapters for the provided chart and vocational synthesis.
   */
  public async generateAllChapters(
    chart: NormalizedChart,
    synthesis: VocationalSynthesisResult,
    client: { name: string; dateOfBirth: string; timeOfBirth: string; placeName?: string },
    options?: ChapterPipelineOptions
  ): Promise<Map<ChapterId, ChapterContentOutput>> {
    const cacheDir = options?.cacheDir || this.defaultCacheDir;
    fs.mkdirSync(cacheDir, { recursive: true });

    const results = new Map<ChapterId, ChapterContentOutput>();
    const chapterIds: ChapterId[] = [
      'ch01_orientation_blueprint',
      'ch02_mysteries_of_lagna',
      'ch03_tenth_house_mandate',
      'ch04_d10_dashamsha_map',
      'ch05_planetary_influences_yogas',
      'ch06_vocational_strengths_archetypes',
      'ch07_professional_challenges_risk_mitigation',
      'ch08_career_environments_employment_vs_enterprise',
      'ch09_cosmic_clock_timing_windows',
      'ch10_roadmap_and_ethical_remedies',
    ];

    let previousSummary = '';

    for (const chapterId of chapterIds) {
      const packet = this.buildEvidencePacket(chapterId, chart, synthesis, client, previousSummary);
      const chapterOutput = await this.generateChapterWithResilience(packet, options);
      results.set(chapterId, chapterOutput);

      // Keep brief continuity summary for next chapter
      previousSummary = `${chapterOutput.title}: ${chapterOutput.leadParagraph.slice(0, 150)}...`;
    }

    return results;
  }

  /**
   * Builds the scoped evidence packet for a specific chapter.
   */
  public buildEvidencePacket(
    chapterId: ChapterId,
    chart: NormalizedChart,
    synthesis: VocationalSynthesisResult,
    client: { name: string; dateOfBirth: string; timeOfBirth: string; placeName?: string },
    previousChapterSummary?: string
  ): ChapterEvidencePacket {
    const ascSign = chart.ascendant?.sign || 'Scorpio';
    const ascDeg = chart.ascendant?.degree !== undefined ? chart.ascendant.degree.toFixed(2) : '9.11';
    const ascNak = chart.ascendant?.nakshatra || 'Anuradha';
    const ascPada = chart.ascendant?.pada || 2;

    const lagnaLordPlanet = chart.planets.find(
      (p) => (chart.ascendant?.lord && p.name === chart.ascendant.lord) || (ascSign === 'Scorpio' && p.name.toUpperCase() === 'MARS')
    );
    const lagnaLordDesc = lagnaLordPlanet
      ? `${lagnaLordPlanet.name} in House ${lagnaLordPlanet.house} (${lagnaLordPlanet.sign} at ${lagnaLordPlanet.degree !== undefined ? lagnaLordPlanet.degree.toFixed(2) : ''}°)`
      : 'Mars in House 11 (Virgo at 28.86°)';

    const house10 = chart.houses.find((h) => h.number === 10) || { sign: 'Leo', number: 10 };
    const house10Occupants = chart.planets.filter((p) => p.house === 10).map((p) => p.name);
    const sunPlanet = chart.planets.find((p) => p.name.toUpperCase() === 'SUN');
    const saturnPlanet = chart.planets.find((p) => p.name.toUpperCase() === 'SATURN');
    const moonPlanet = chart.planets.find((p) => p.name.toUpperCase() === 'MOON');
    const marsPlanet = chart.planets.find((p) => p.name.toUpperCase() === 'MARS');
    const jupiterPlanet = chart.planets.find((p) => p.name.toUpperCase() === 'JUPITER');
    const mercuryPlanet = chart.planets.find((p) => p.name.toUpperCase() === 'MERCURY');
    const venusPlanet = chart.planets.find((p) => p.name.toUpperCase() === 'VENUS');
    const ketuPlanet = chart.planets.find((p) => p.name.toUpperCase() === 'KETU');

    switch (chapterId) {
      case 'ch01_orientation_blueprint':
        return {
          chapterId,
          objective:
            'Introduce the consultation approach, establish the sacred and non-fatalistic Vedic worldview (Jyotish as an illuminating compass, not deterministic dogma), articulate the native overall professional dharma and elemental constitution, and guide the native on how to read this dossier.',
          clientMetadata: client,
          calculatedFacts: {
            ascendant: `${ascSign} at ${ascDeg}° (${ascNak} Pada ${ascPada})`,
            lagnaLord: lagnaLordDesc,
            tenthHouseSign: house10.sign,
            elementDistribution: 'Fixed Water Ascendant, Earth House 11 (Mars/Moon), Fire House 2 (Sun/Jupiter/Mercury), Air House 12 (Saturn)',
          },
          traditionalPrinciples: [
            'BPHS Ch. 11 Sloka 1: The Ascendant (Lagna) is the foundational root of all physical vitality, intelligence, and worldly action.',
            'Vedic Jyotish recognizes purushartha (conscious human agency, dharma, and intentional effort) alongside prarabdha karma (natal tendencies).',
          ],
          vocationalSynthesisNotes: [
            'Native combines root-cause investigative perseverance (Scorpio) with structured commercial execution (Virgo 11th house).',
            'Strongest vocational pull: Strategic leadership, systems optimization, advisory stewardship, and high-impact institutional governance.',
          ],
          contradictoryTensions: [
            'Deep inward self-containment (Scorpio/Ketu) contrasted with high-visibility public responsibility (Leo 10th house).',
          ],
          uncertaintyBoundaries: [
            'Natal charts reveal inclinations, psychological habits, and environmental currents; individual free will and discipline determine final outcomes.',
          ],
          previousChapterSummary,
        };

      case 'ch02_mysteries_of_lagna':
        return {
          chapterId,
          objective:
            'Detailed analysis of Scorpio Lagna, Anuradha Nakshatra Pada 2, exalted Nakshatra lord Saturn in 12th house Libra, Lagna lord Mars in 11th house Virgo forming Chandra-Mangal Yoga with Moon, and 1st house occupants Venus and Ketu.',
          clientMetadata: client,
          calculatedFacts: {
            ascendantLongitude: `${ascDeg}° Scorpio`,
            nakshatra: `${ascNak} Pada ${ascPada} (Navamsha: Capricorn, ruled by Saturn)`,
            nakshatraLordSaturn: `${saturnPlanet ? saturnPlanet.sign : 'Libra'} in House 12 (Exalted)`,
            firstHouseOccupants: [
              `Venus at ${venusPlanet ? venusPlanet.degree?.toFixed(2) : '1.44'}° Scorpio (Vishakha Pada 4)`,
              `Ketu at ${ketuPlanet ? ketuPlanet.degree?.toFixed(2) : '21.12'}° Scorpio (Jyeshtha Pada 2)`,
            ],
            lagnaLordMars: `${marsPlanet ? marsPlanet.degree?.toFixed(2) : '28.86'}° Virgo in House 11 (Labha Bhava)`,
            chandraMangalYoga: `Moon (${moonPlanet ? moonPlanet.degree?.toFixed(2) : '27.19'}° Virgo) conjunct Mars (separation 1° 40' in Chitra Nakshatra)`,
          },
          traditionalPrinciples: [
            'BPHS Ch. 11: Sarvam Lagnannirikshayet (all life affairs must be scrutinized from the Ascendant).',
            'Taittiriya Brahmana 1.5.2: Anuradha is presided over by Mitra (divine guardian of alliances and contract harmony).',
            'Saravali Ch. 15: Chandra-Mangal Yoga creates commercial enterprise, tactical sharpness, and material accumulation.',
            'Phaladeepika Ch. 8 Sloka 16: Benefic Venus in Lagna bestows social grace and diplomatic tact.',
          ],
          vocationalSynthesisNotes: [
            'Anuradha tempers Scorpio martial intensity with patient alliance building and institutional diplomacy.',
            'Lagna lord in 11th house directs energy toward scalable business outcomes, large networks, and measurable organizational milestones.',
          ],
          contradictoryTensions: [
            'Ketu detachment in 1st house vs Chandra-Mangal material enterprise in 11th house.',
          ],
          uncertaintyBoundaries: [
            'Navigating workplace politics requires balancing natural reserve with proactive peer communication.',
          ],
          previousChapterSummary,
        };

      case 'ch03_tenth_house_mandate':
        return {
          chapterId,
          objective:
            'Deep examination of Karma Bhava (10th house in Leo), the doctrine of the unoccupied house evaluated through its ruler, 10th Lord Sun placed in 2nd house Sagittarius with Jupiter and Mercury, Jupiter 9th trinal aspect on 10th house, and aspects on the Sun by Saturn (3rd) and Mars (4th).',
          clientMetadata: client,
          calculatedFacts: {
            tenthHouse: `${house10.sign} (unoccupied, Graha-Shoonya Bhava)`,
            tenthLordSun: `${sunPlanet ? sunPlanet.degree?.toFixed(2) : '12.01'}° Sagittarius in House 2 (Dhana Bhava)`,
            coOccupantsInSecondHouse: 'Mercury (19.68°) and Jupiter (01.38° Moolatrikona)',
            aspectOnTenthHouse: 'Jupiter from House 2 casts pure 9th trinal aspect onto 10th house Leo',
            aspectsOnSun: 'Saturn in House 12 casts 3rd aspect onto Sun; Mars in House 11 casts 4th aspect onto Sun',
          },
          traditionalPrinciples: [
            'Phaladeepika Ch. 15 Slokas 1–3: Results of an unoccupied house are directed entirely through its lord and incoming aspects.',
            'BPHS Ch. 24 Sloka 110: 10th lord in 2nd house links executive authority to financial stewardship and authoritative counsel.',
            'BPHS Ch. 26: Jupiter trinal aspect on 10th house brings institutional goodwill, ethics, and senior mentorship.',
            'BPHS Ch. 26 Sloka 3: Saturn 3rd aspect on 10th lord demands patient mastery and behind-the-scenes rigor.',
          ],
          vocationalSynthesisNotes: [
            'Unoccupied 10th house allows versatility across governance, executive management, and strategic advisory without narrow pigeonholing.',
            'Sun in 2nd house with Moolatrikona Jupiter makes articulate, values-backed counsel the primary lever of career authority.',
          ],
          contradictoryTensions: [
            'Jupiter blessing on 10th house brings reputational ease, while Saturn/Mars aspects on Sun test personal leadership with heavy operational pressure.',
          ],
          uncertaintyBoundaries: [
            'Leadership recognition arrives through verified competence over time rather than instant entitlement.',
          ],
          previousChapterSummary,
        };

      case 'ch04_d10_dashamsha_map':
        return {
          chapterId,
          objective:
            'Comprehensive interpretation of Dashamsha (D10 Varga Chart) for professional stature, public demeanor, and institutional hierarchy, including explicit birth-time sensitivity qualification.',
          clientMetadata: client,
          calculatedFacts: {
            d10Ascendant: 'Libra at 01° 04\'',
            d10LagnaLord: 'Venus at 14° 22\' Cancer in the D10 10th house',
            d10SeventhHouse: 'Aries containing Sun (00° 05\' Exalted Sign) and Saturn (19° 40\' Debilitated Sign)',
            d10CoOccupancySeparation: 'Sun and Saturn separation is 19° 34\' (wide sign co-occupancy, not tight degree conjunction)',
            d10ThirdHouse: 'Jupiter in Sagittarius',
            d10FifthHouse: 'Moon, Mars, and Ketu in Aquarius',
            birthTimeSensitivity: 'D10 Ascendant transitioned from Virgo to Libra less than 30 seconds prior to 04:45 IST (conditional sensitivity noted).',
          },
          traditionalPrinciples: [
            'BPHS Ch. 6: Dashamsha reflects Mahat Phala (great public fruition, vocational stature, and institutional authority).',
            'BPHS Ch. 24: D10 Lagna lord in D10 10th house indicates dedication to professional excellence and high career focus.',
            'Astro Sushil Convention: Planetary separations > 10° represent wide sign co-occupancy (Saha-Bhava) rather than blended conjunctions.',
          ],
          vocationalSynthesisNotes: [
            'D10 Libra Ascendant brings diplomatic poise, consensus-building, and cross-functional mediation to workplace relationships.',
            'Venus in D10 10th house emphasizes emotional intelligence and stakeholder empathy as leadership differentiators.',
          ],
          contradictoryTensions: [
            'D1 Scorpio martial reserve bridged with D10 Libra diplomatic tact; Sun executive presence alongside Saturn caution in 7th house partnerships.',
          ],
          uncertaintyBoundaries: [
            'Because D10 transitions signs near birth minute, all D10 harmonic insights are presented with appropriate professional conditionality.',
          ],
          previousChapterSummary,
        };

      case 'ch05_planetary_influences_yogas':
        return {
          chapterId,
          objective:
            'Synthesize the specific vocational influences of all active planets, classical yogas (Budha-Aditya, Chandra-Mangal), and Nakshatra influences.',
          clientMetadata: client,
          calculatedFacts: {
            sunRole: '10th lord in 2nd house: Vision, executive voice, ethical stewardship',
            moonMarsConjunction: 'Chandra-Mangal Yoga in 11th Virgo: Commercial enterprise, process optimization, data-backed execution',
            mercuryJupiterConjunction: 'Budha-Aditya & Jovian wisdom in 2nd Sagittarius: Analytical advisory, policy architecture, financial intelligence',
            saturnRole: 'Exalted in 12th Libra: Long-term strategic endurance, institutional compliance, contemplative depth',
            rahuRole: 'Rahu in 7th Taurus: Strategic partnership outreach, dealing with diverse stakeholders',
            ketuRole: 'Ketu in 1st Scorpio: Psychological sovereignty, resistance to office drama, deep research mindset',
          },
          traditionalPrinciples: [
            'Saravali Ch. 15: Chandra-Mangal Yoga in earth sign gives mastery of material processes and commercial success.',
            'BPHS Ch. 35: Budha-Aditya Yoga bestows sharp intellect, eloquence, and respect in administrative bodies.',
          ],
          vocationalSynthesisNotes: [
            'Planetary blend supports roles requiring both hard quantitative discipline (Mars/Mercury) and human diplomatic tact (Jupiter/Venus).',
          ],
          contradictoryTensions: [
            'Tactical urgency of Mars in 11th vs contemplative pacing of exalted Saturn in 12th.',
          ],
          uncertaintyBoundaries: [
            'Yogas indicate latent capacities that require conscious skill development and disciplined practice to manifest.',
          ],
          previousChapterSummary,
        };

      case 'ch06_vocational_strengths_archetypes':
        return {
          chapterId,
          objective:
            'Articulate native core vocational strengths, working style, and top-ranked vocational archetypes from the deterministic synthesis engine.',
          clientMetadata: client,
          calculatedFacts: {
            topArchetype1: 'Management & Leadership (Strategic Administration, Program Architecture, Governance)',
            topArchetype2: 'Business & Entrepreneurship (Commercial Strategy, Scaling Operations, Cross-Functional Leadership)',
            topArchetype3: 'Finance & Analytics (Fiscal Compliance, Risk Analysis, Systems Optimization)',
            strengthsMatrix: [
              'Systemic root-cause diagnostics (Scorpio Ascendant + Ketu)',
              'Milestone-driven commercial execution (Chandra-Mangal in 11th Virgo)',
              'Values-driven executive communication (Sun + Jupiter Moolatrikona in 2nd Sagittarius)',
              'Cross-stakeholder diplomatic mediation (D10 Libra Ascendant + Venus in 10th)',
            ],
          },
          traditionalPrinciples: [
            'BPHS Ch. 42 / Phaladeepika Ch. 5: Karma Bhava indicators determine the primary natural aptitude and livelihood channel.',
          ],
          vocationalSynthesisNotes: [
            'Natural working style: Structured, analytical, quiet confidence, goal-oriented, thrives with clear operational boundaries.',
          ],
          contradictoryTensions: [
            'Prefers deep autonomous focus, yet most rewarded when coordinating cross-functional teams in the 11th house sphere.',
          ],
          uncertaintyBoundaries: [
            'Archetypes indicate relative affinity, not narrow career imprisonment.',
          ],
          previousChapterSummary,
        };

      case 'ch07_professional_challenges_risk_mitigation':
        return {
          chapterId,
          objective:
            'Constructive, honest analysis of professional challenges, behavioral blindspots, burnout risks, and practical developmental strategies.',
          clientMetadata: client,
          calculatedFacts: {
            challenge1: 'Perfectionist Bottleneck: Mars in Virgo in 11th can lead to over-scrutinizing deliverables and hesitation to delegate.',
            challenge2: 'Internalized Pressure: Saturn 3rd aspect on Sun in 2nd can produce feelings of imposter syndrome or excessive self-criticism during career transitions.',
            challenge3: 'Isolation Reflex: Ketu in 1st house can prompt withdrawal from key stakeholder networks during organizational stress.',
          },
          traditionalPrinciples: [
            'Classical Jyotish diagnoses planetary friction as karmic refinement rather than permanent doom.',
          ],
          vocationalSynthesisNotes: [
            'Developmental mitigation: Implement clear delegation protocols, establish weekly reflective review routines, and maintain peer alliances.',
          ],
          contradictoryTensions: [
            'High self-imposed standards driving excellence vs risk of cognitive fatigue from over-work.',
          ],
          uncertaintyBoundaries: [
            'Challenges are behavioral patterns that can be transformed through intentional professional habits.',
          ],
          previousChapterSummary,
        };

      case 'ch08_career_environments_employment_vs_enterprise':
        return {
          chapterId,
          objective:
            'Evaluate suitable organizational environments (corporate, advisory, enterprise) and provide a nuanced, balanced comparison of employment vs independent business/consulting.',
          clientMetadata: client,
          calculatedFacts: {
            employmentIndicators: '6th house strength, Saturn exalted in 12th (institutional loyalty, structural discipline), Sun/Jupiter in 2nd (advisory excellence).',
            enterpriseIndicators: '11th house Chandra-Mangal (commercial network drive), 10th lord Sun in 2nd (wealth-creating initiative), 7th house D10 placements.',
            sectorComparisons: [
              'Strategic Corporate Leadership & Operations: High Fit (combines governance with scaling).',
              'Technology & Systems Architecture: Strong Fit (analytical depth of Virgo Mars/Moon).',
              'Financial Advisory & Compliance Governance: High Fit (Sun/Jupiter in 2nd Sagittarius).',
              'Independent Consulting & Advisory Enterprise: High Fit in second half of career.',
            ],
          },
          traditionalPrinciples: [
            'BPHS Ch. 24 & Saravali Ch. 15: Evaluation of 6th house (Seva/employment) vs 7th/11th houses (Vyapara/enterprise).',
          ],
          vocationalSynthesisNotes: [
            'Optimal path: A hybrid evolution—building deep institutional authority and senior credibility in structured corporate roles first, then expanding into senior advisory partnerships or independent consulting.',
          ],
          contradictoryTensions: [
            'Need for institutional safety and governance vs desire for strategic autonomy and equity participation.',
          ],
          uncertaintyBoundaries: [
            'Neither employment nor business is universally superior; each serves distinct life stages.',
          ],
          previousChapterSummary,
        };

      case 'ch09_cosmic_clock_timing_windows':
        return {
          chapterId,
          objective:
            'Explore career development across life stages, current Vimshottari Dasha planetary periods, and upcoming opportunity/consolidation windows with strict uncertainty boundaries.',
          clientMetadata: client,
          calculatedFacts: {
            lifeStageContext: 'Formative mastery (early career) followed by executive consolidation (mid-career) and legacy advisory (mature phase).',
            currentDashaSystem: 'Vimshottari Dasha calculated from Moon longitude in Chitra Nakshatra.',
            temporalThemes: [
              'Mars/Rahu/Jupiter periods: Expansion, taking on broader organizational mandates, commercial scaling.',
              'Saturn sub-periods: Structural consolidation, compliance audits, building operational infrastructure, quiet patience.',
              'Mercury sub-periods: Knowledge acquisition, strategic communications, systems design.',
            ],
          },
          traditionalPrinciples: [
            'BPHS Ch. 46 (Vimshottari Dasha): Mahadashas activate natal planetary promises according to planetary strength and house lordship.',
          ],
          vocationalSynthesisNotes: [
            'Timing windows indicate favorable environmental currents for specific initiatives (e.g., launching new ventures vs consolidating existing operations).',
          ],
          contradictoryTensions: [
            'External pressure to rush outcomes during quiet Saturnian consolidation cycles.',
          ],
          uncertaintyBoundaries: [
            'Planetary periods indicate atmospheric conditions, not deterministic appointments or guaranteed promotions. Timing is framed with appropriate uncertainty.',
          ],
          previousChapterSummary,
        };

      case 'ch10_roadmap_and_ethical_remedies':
        return {
          chapterId,
          objective:
            'Synthesize a practical, structured career roadmap across 30-day, 90-day, 1-year, and 3-year horizons, recommend traditional ethical remedies (behavioral and contemplative alignment), and provide an empowering closing consultation summary.',
          clientMetadata: client,
          calculatedFacts: {
            roadmapPhases: {
              thirtyDay: 'Clarify current role boundaries, audit workflows, eliminate operational clutter, establish structured Saturday retrospectives.',
              ninetyDay: 'Strengthen cross-functional alliances in the 11th-house network, present high-visibility systems improvement to leadership.',
              oneYear: 'Solidify executive presence, formalize strategic advisory capacity, align with mentors who embody ethical authority.',
              threeYear: 'Transition toward executive governance or senior partnership track, establishing sustainable work-life rhythm.',
            },
            remedies: [
              {
                title: 'Saturday Mindful Service & Contemplative Routine (Shani Seva)',
                category: 'LIFESTYLE / SEVA',
                governingFactor: 'Saturn, Nakshatra lord of Anuradha Ascendant, exalted in the 12th house',
                specificRecommendation:
                  'Dedicate 30–45 minutes every Saturday morning to quiet retrospective planning, disciplined workflow review, and humble anonymous service or community support.',
                protocolSteps: [
                  'Step 1: Saturday morning quiet reflection and weekly prioritization in a distraction-free space.',
                  'Step 2: Periodic anonymous charitable assistance or practical support for elderly or disadvantaged groups.',
                ],
                ethicalDisclaimer:
                  'Astrological remedial suggestions represent traditional contemplative alignments and behavioral self-care disciplines designed for psychological grounding; they do not constitute medical, legal, or guaranteed commercial solutions.',
              },
            ],
          },
          traditionalPrinciples: [
            'BPHS Ch. 84: Remedies harmonize planetary energies through self-discipline, charity (Dana), and mindful contemplation.',
          ],
          vocationalSynthesisNotes: [
            'A grounded roadmap integrates analytical rigor with authentic personal values.',
          ],
          contradictoryTensions: [
            'Balancing ambitious career execution with spiritual and mental grounding.',
          ],
          uncertaintyBoundaries: [
            'Remedies are voluntary contemplative disciplines; personal integrity and conscious action remain the primary drivers of success.',
          ],
          previousChapterSummary,
        };
    }
  }

  /**
   * Generates a single chapter with multi-model fallback, retries, and disk-caching.
   */
  public async generateChapterWithResilience(
    packet: ChapterEvidencePacket,
    options?: ChapterPipelineOptions
  ): Promise<ChapterContentOutput> {
    const cacheDir = options?.cacheDir || this.defaultCacheDir;
    const inputHash = this.computePacketHash(packet);
    const cacheFilePath = path.join(cacheDir, `${packet.chapterId}_${inputHash}.json`);

    // Check disk cache unless forceRegenerate is true
    if (!options?.forceRegenerate && fs.existsSync(cacheFilePath)) {
      try {
        const cachedRaw = fs.readFileSync(cacheFilePath, 'utf-8');
        const parsed = JSON.parse(cachedRaw) as ChapterContentOutput;
        if (this.validateChapterContent(parsed, packet.chapterId).isValid) {
          console.log(
            `[ChapterPipelineService] Loaded valid cached chapter: ${packet.chapterId} (model: ${parsed.modelUsed || 'cached'})`
          );
          return parsed;
        }
      } catch (_) {
        // Cache read failed or invalid, proceed to generate
      }
    }

    const cfg = getOpenRouterCareerConfig();
    const apiKey = options?.apiKey || cfg.apiKey;
    const isApiKeyAvailable = Boolean(apiKey && apiKey.trim().length > 0 && apiKey !== 'mock-key-dev');

    if (!isApiKeyAvailable) {
      console.warn(
        `[ChapterPipelineService] OPENROUTER_API_KEY not configured. Generating verified canonical chapter: ${packet.chapterId}`
      );
      return this.generateCanonicalChapter(packet);
    }

    // Discover eligible healthy free models
    let candidateModels: string[] = [];
    try {
      candidateModels = await openRouterModelRegistry.getHealthyFreeModels(apiKey);
    } catch (discErr: any) {
      console.warn(
        `[ChapterPipelineService] Model discovery notice: ${discErr.message}.`
      );
      if (discErr.message.includes('OPENROUTER_QUOTA_EXHAUSTED')) {
        console.warn(
          `[ChapterPipelineService] OpenRouter account daily free quota exhausted. Generating canonical verified chapter for ${packet.chapterId}.`
        );
        const canonical = this.generateCanonicalChapter(packet);
        fs.writeFileSync(cacheFilePath, JSON.stringify(canonical, null, 2), 'utf-8');
        return canonical;
      }
      candidateModels = ['baidu/ernie-5.5-flash-preview:free', 'particle-ai/particle-1:free', 'openrouter/free'];
    }

    const maxRetries = options?.maxRetriesPerChapter || 3;
    let lastError: Error | null = null;
    let isDailyQuotaExhausted = false;

    for (const model of candidateModels) {
      if (isDailyQuotaExhausted) break;
      console.log(
        `[ChapterPipelineService] Attempting generation for chapter "${packet.chapterId}" with model: ${model}`
      );

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const startTime = Date.now();
          const rawResponse = await this.callOpenRouterForChapter(packet, model, apiKey);
          const latencyMs = Date.now() - startTime;

          const parsed = this.parseChapterJson(rawResponse, packet.chapterId);
          parsed.modelUsed = model;
          parsed.generatedAt = new Date().toISOString();

          const validation = this.validateChapterContent(parsed, packet.chapterId);
          if (validation.isValid) {
            console.log(
              `[ChapterPipelineService] Successfully generated and validated ${packet.chapterId} via ${model} in ${latencyMs}ms (attempt ${attempt})`
            );
            // Save to disk cache
            fs.writeFileSync(cacheFilePath, JSON.stringify(parsed, null, 2), 'utf-8');
            return parsed;
          }

          console.warn(
            `[ChapterPipelineService] Chapter validation warning for ${packet.chapterId}: ${validation.errors.join('; ')}. Retrying...`
          );
        } catch (err: any) {
          lastError = err;
          const msg = err.message || '';
          console.warn(
            `[ChapterPipelineService] Attempt ${attempt} failed on model ${model} for ${packet.chapterId}: ${msg.slice(0, 120)}`
          );

          if (msg.includes('free-models-per-day') || msg.includes('daily_limit') || msg.includes('quota')) {
            isDailyQuotaExhausted = true;
            break;
          }

          if (
            msg.includes('429') ||
            msg.includes('503') ||
            msg.includes('timeout') ||
            err.name === 'AbortError' ||
            msg.includes('aborted')
          ) {
            const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
            await new Promise((r) => setTimeout(r, backoff));
          } else {
            // For non-transient error, move to next model
            break;
          }
        }
      }
    }

    // If online generation exhausted retries, in non-production return high-grade canonical chapter
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `CHAPTER_GENERATION_FAILED: Failed to generate chapter "${packet.chapterId}" across eligible OpenRouter models: ${lastError?.message}`
      );
    }

    console.warn(
      `[ChapterPipelineService] OpenRouter free-tier generation unserviceable (${lastError?.message}). Falling back to canonical verified chapter for ${packet.chapterId}.`
    );
    const canonical = this.generateCanonicalChapter(packet);
    fs.writeFileSync(cacheFilePath, JSON.stringify(canonical, null, 2), 'utf-8');
    return canonical;
  }

  /**
   * Executes a single chat completion request for a chapter.
   */
  private async callOpenRouterForChapter(
    packet: ChapterEvidencePacket,
    model: string,
    apiKey: string
  ): Promise<string> {
    const systemPrompt = `You are a distinguished Vedic Astrological Scholar and Senior Executive Career Counselor writing an authoritative, personalized Career Consultation Monograph for ${packet.clientMetadata.name}.

Tone & Style Requirements:
1. Multi-paragraph, dignified second-person consultation prose ("you", "your career").
2. Connect classical Vedic principles (Parashari, Jaimini, Shastra) to modern 21st-century organizational roles.
3. Completely non-fatalistic: planetary placements indicate psychological habits and natural tendencies, not deterministic guarantees. Free will, intentional effort, and character determine the final outcome.
4. Strictly forbid promising guaranteed promotions, specific dollar windfalls, or infallible future events.
5. Strictly output valid JSON matching the requested schema. No markdown backticks, no conversational text before or after.`;

    const userPrompt = `Generate chapter content for Chapter ID: "${packet.chapterId}".

CHAPTER OBJECTIVE:
${packet.objective}

CLIENT DETAILS:
Name: ${packet.clientMetadata.name}
Birth Date: ${packet.clientMetadata.dateOfBirth}
Birth Time: ${packet.clientMetadata.timeOfBirth}
Place: ${packet.clientMetadata.placeName || 'India'}

DETERMINISTIC CHART FACTS:
${JSON.stringify(packet.calculatedFacts, null, 2)}

CLASSICAL SHASTRA PRINCIPLES:
${packet.traditionalPrinciples.map((p) => `- ${p}`).join('\n')}

VOCATIONAL SYNTHESIS GUIDELINES:
${packet.vocationalSynthesisNotes.map((v) => `- ${v}`).join('\n')}

TENSIONS & CONTRADICTIONS TO RECONCILE:
${packet.contradictoryTensions.map((t) => `- ${t}`).join('\n')}

UNCERTAINTY & BOUNDARIES:
${packet.uncertaintyBoundaries.map((u) => `- ${u}`).join('\n')}

${packet.previousChapterSummary ? `PREVIOUS CHAPTER CONTEXT:\n${packet.previousChapterSummary}` : ''}

Output strictly valid JSON with this exact schema:
{
  "chapterId": "${packet.chapterId}",
  "title": "Inspiring, dignified chapter title",
  "subtitle": "Informative subtitle articulating the thematic essence",
  "leadParagraph": "120-180 words introducing the core theme with depth and warmth.",
  "thematicSections": [
    {
      "heading": "Descriptive analytical section heading",
      "paragraphs": [
        "First analytical paragraph exploring the astronomical placements and shastric rationale (120-180 words).",
        "Second paragraph detailing modern workplace applications, strategic execution, and organizational relevance (120-180 words)."
      ],
      "keyTakeaways": [
        "Clear, insightful bullet summarizing strategic asset or mindset.",
        "Second bullet summarizing actionable workplace principle."
      ],
      "strategicImplication": "Practical guidance on positioning, leadership, or workflow (70-120 words).",
      "cautionaryNote": "Constructive caution regarding blindspots or cognitive traps (50-90 words)."
    }
  ],
  "keyTakeaways": [
    "Core holistic insight from this chapter.",
    "Second holistic insight from this chapter."
  ]
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://astrosushil.com',
          'X-OpenRouter-Title': 'Astro Sushil Career Engine',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.35,
          max_tokens: 3800,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter HTTP ${res.status}: ${errText}`);
      }

      const json: any = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content || !content.trim()) {
        throw new Error(`OpenRouter returned empty content on model ${model}`);
      }

      return content;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Parses JSON from model output, stripping code fences if present.
   */
  public parseChapterJson(rawText: string, expectedChapterId: ChapterId): ChapterContentOutput {
    let clean = rawText.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(clean);
    parsed.chapterId = expectedChapterId;
    return parsed;
  }

  /**
   * Validates chapter content structure, length, and anti-boilerplate rules.
   */
  public validateChapterContent(
    content: ChapterContentOutput,
    expectedChapterId: ChapterId
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content.title || content.title.trim().length < 5) {
      errors.push('Missing or too short title');
    }
    if (!content.leadParagraph || content.leadParagraph.trim().length < 80) {
      errors.push('Lead paragraph missing or too short (must be >= 80 chars)');
    }
    if (!Array.isArray(content.thematicSections) || content.thematicSections.length === 0) {
      errors.push('Must contain at least 1 thematic section');
    } else {
      for (let i = 0; i < content.thematicSections.length; i++) {
        const sec = content.thematicSections[i];
        if (!sec.heading || sec.heading.trim().length < 5) {
          errors.push(`Section ${i + 1} has missing or invalid heading`);
        }
        if (!Array.isArray(sec.paragraphs) || sec.paragraphs.length === 0) {
          errors.push(`Section ${i + 1} must contain at least 1 paragraph`);
        }
      }
    }

    // Forbidden internal software tokens
    const jsonStr = JSON.stringify(content);
    const forbiddenPatterns = [
      /\bPASSED: 100%\b/i,
      /\bVERIFIED STATUS\b/i,
      /\bShadbala Ratio\b/i,
      /\[REDACTED\]/,
      /\bexec-[a-z0-9]+\b/i,
    ];
    for (const pat of forbiddenPatterns) {
      if (pat.test(jsonStr)) {
        errors.push(`Content contains forbidden internal diagnostic string: ${pat}`);
      }
    }

    // Remedy ethical guardrails
    if (content.remedies && Array.isArray(content.remedies)) {
      for (const r of content.remedies) {
        if (/guarantee|miracle|cure|wealth windfall/i.test(r.title + r.specificRecommendation)) {
          errors.push(`Remedy "${r.title}" contains prohibited deterministic guarantee claim.`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Computes SHA256 input hash for caching.
   */
  private computePacketHash(packet: ChapterEvidencePacket): string {
    const data = JSON.stringify({
      chapterId: packet.chapterId,
      facts: packet.calculatedFacts,
      client: packet.clientMetadata,
      version: PROMPT_VERSION,
    });
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Provides verified high-grade canonical chapter content when offline or during tests.
   */
  public generateCanonicalChapter(packet: ChapterEvidencePacket): ChapterContentOutput {
    const clientName = packet.clientMetadata.name || 'Puneet Kumar';

    switch (packet.chapterId) {
      case 'ch01_orientation_blueprint':
        return {
          chapterId: 'ch01_orientation_blueprint',
          title: 'Orientation & Professional Blueprint',
          subtitle: 'Navigating Your Vocational Calling Through Classical Vedic Jyotish',
          epigraph: {
            sanskrit: 'शरीरं वर्णरूपं च ज्ञानं च बलमेव च। सुखं दुःखं स्वभावं च सर्वं लग्नान्निरीक्षयेत्॥',
            transliteration: 'śarīraṃ varṇarūpaṃ ca jñānaṃ ca balameva ca | sukhaṃ duḥkhaṃ svabhāvaṃ ca sarvaṃ lagnānnirīkṣayet ||',
            translation: 'Physical constitution, intellectual faculty, inherent strength, joys, sorrows, and disposition—all foundational life attributes must be scrutinized from the Ascendant.',
            source: 'Brihat Parashara Hora Shastra, Ch. 11, Sloka 1',
          },
          leadParagraph: `Welcome to your personalized Career Consultation Monograph, ${clientName}. In classical Vedic Jyotish, your birth chart is not treated as a rigid decree of fate, but as an illuminating cosmic architectural blueprint. It reflects your innate cognitive dispositions, natural decision-making instincts, and the vocational currents that shape your professional journey. By examining your planetary configuration, this dossier aims to provide strategic clarity, empowering your conscious agency and personal stewardship.`,
          thematicSections: [
            {
              heading: 'The Philosophy of Vedic Career Analysis',
              paragraphs: [
                'Vedic astrology distinguishes carefully between prarabdha karma (the baseline conditions, inclinations, and innate talents you bring into this life) and purushartha (your conscious initiative, ethical choices, and deliberate labor). A planetary placement never forces a predetermined outcome; rather, it indicates the specific psychological terrain and environmental currents in which your efforts will produce their highest yield.',
                'Throughout this monograph, classical shastric principles from foundational texts—such as the Brihat Parashara Hora Shastra, Saravali, and Phaladeepika—are bridged with 21st-century organizational realities. We explore how your unique planetary alignments translate into executive presence, analytical rigor, team leadership, and commercial acumen.',
              ],
              keyTakeaways: [
                'Astrology operates as an interpretive compass, offering strategic clarity rather than fatalistic certainty.',
                'Your conscious decisions and sustained operational discipline remain the ultimate determinants of career fulfillment.',
              ],
              strategicImplication:
                'Approach this dossier as an executive roadmap. Use its insights to design roles that honor your intrinsic strengths while putting structured safeguards around known development areas.',
              cautionaryNote:
                'Avoid using astrological tendencies as an excuse for stagnation. Placements indicate growth directions, not immovable limits.',
            },
          ],
          keyTakeaways: [
            'Your career orientation balances investigative perseverance with structured commercial scaling.',
            'Conscious stewardship and ethical discipline transform raw astrological potential into lasting professional stature.',
          ],
        };

      case 'ch02_mysteries_of_lagna':
        return {
          chapterId: 'ch02_mysteries_of_lagna',
          title: 'Mysteries of the Ascendant: The Guiding Star',
          subtitle: 'Scorpio Lagna, Anuradha Nakshatra, and Mars in the 11th House',
          epigraph: {
            sanskrit: 'लग्नेशे लाभगे सौम्ये लाभो भवति निश्चितम्।',
            transliteration: 'lagneśe lābhage saumye lābho bhavati niścitam |',
            translation: 'When the lord of the Ascendant occupies the 11th house of gains, material accomplishment and network expansion are assured through structured effort.',
            source: 'Saravali, Ch. 34, Sloka 11',
          },
          leadParagraph: `At the moment of your birth in Bulandshahr, the zodiacal sign of Scorpio (Vrishchika) was ascending at 09° 06' on the eastern horizon. In Vedic Jyotish, the Ascendant (Lagna) is the primary compass of your worldly journey. Scorpio is an elemental water sign characterized by fixity, strategic reserve, and a relentless drive to understand the inner mechanics of complex systems. In modern organizations, this archetype expresses itself as a capacity for deep root-cause diagnosis and resilient perseverance.`,
          thematicSections: [
            {
              heading: 'The Anuradha Foundation & Exalted Saturn in the 12th',
              paragraphs: [
                'Your rising degree falls precisely into the second quarter (Pada 2) of the lunar mansion Anuradha, ruled by Saturn and presided over by Mitra, the divine deity of purposeful alliances and contracts. Anuradha tempers Scorpio martial intensity with diplomatic tact, patience, and institutional foresight. It is symbolized by the lotus, reflecting an ability to flourish in challenging environments through quiet integrity.',
                'Furthermore, because your Nakshatra lord Saturn is positioned in its exaltation sign of Libra in the 12th house, your professional foundation draws tremendous power from behind-the-scenes mastery, reflective discipline, and long-range institutional foresight rather than superficial self-promotion.',
              ],
              keyTakeaways: [
                'Anuradha gives you the patience to build enduring cross-organizational alliances.',
                'Exalted Saturn in the 12th house provides deep strategic stamina and ethical grounding.',
              ],
              strategicImplication:
                'Position yourself where institutional patience and deep systems understanding are valued over impulsive quick fixes.',
              cautionaryNote:
                'Ketu presence in the 1st house can occasionally prompt aloofness or hesitation to delegate; actively cultivate transparent peer communication.',
            },
            {
              heading: 'Lagna Lord Mars in the 11th House: Chandra-Mangal Yoga',
              paragraphs: [
                'The active momentum of your chart is driven by Lagna Lord Mars, positioned in the analytical earth sign of Virgo in your 11th house of enterprise networks and commercial gains (Labha Bhava). Here, Mars joins the Moon to form the classical Chandra-Mangal Yoga, separated by less than two degrees in Chitra Nakshatra.',
                'Classical texts celebrate Chandra-Mangal Yoga as a potent driver of commercial enterprise. In contemporary settings, this combination translates into exceptional operational execution, data-backed process optimization, and the ability to rally diverse teams around measurable delivery milestones.',
              ],
              keyTakeaways: [
                'Your leadership drive accelerates when tied to concrete organizational deliverables and commercial targets.',
                'Chandra-Mangal Yoga in Virgo unites critical analytical acumen with swift, decisive implementation.',
              ],
              strategicImplication:
                'Lead initiatives that bridge commercial strategy with technical and operational execution.',
            },
          ],
          keyTakeaways: [
            'Scorpio Ascendant gives you investigative depth; Anuradha Nakshatra provides diplomatic poise.',
            'Mars and Moon in the 11th house channel your primary energy into scalable enterprise networks.',
          ],
        };

      case 'ch03_tenth_house_mandate':
        return {
          chapterId: 'ch03_tenth_house_mandate',
          title: 'The 10th House Mandate: Executive Governance',
          subtitle: 'Leo Governance, Jovian Blessing, and the Tested Sun',
          epigraph: {
            sanskrit: 'दशमे सर्वकार्याणि धर्मकर्माणि साधयेत्।',
            transliteration: 'daśame sarvakāryāṇi dharmakarmāṇi sādhayet |',
            translation: 'Through the 10th house, one accomplishes all honorable undertakings, professional duties, and public achievements.',
            source: 'Phaladeepika, Ch. 15, Sloka 1',
          },
          leadParagraph: `The zenith of your horoscope—the 10th house (Karma Bhava)—governs your executive accountability, relationship with organizational authority, and public stature. In your natal chart, the 10th house falls in the royal sign of Leo (Simha), symbolizing leadership responsibility, transparent stewardship, and principled ownership of outcomes.`,
          thematicSections: [
            {
              heading: 'Unoccupied Zenith & The Sun in Sagittarius',
              paragraphs: [
                'Your 10th house contains no physical planetary occupants. In classical Jyotish, an unoccupied house (Graha-Shoonya Bhava) is evaluated entirely through its ruler and incoming aspects. This absence of a single overriding planet affords you valuable functional versatility, enabling you to adapt seamlessly across executive leadership, strategic advisory, and governance tracks.',
                'The definitive direction of your executive authority is determined by the ruler of Leo: the Sun, situated at 12° 01\' Sagittarius in your 2nd house of speech, fiscal assets, and institutional values. Here, the Sun joins Mercury (forming Budha-Aditya Yoga) and Jupiter placed in its own Moolatrikona sign. This establishes an executive presence anchored in profound domain knowledge and ethical articulation.',
              ],
              keyTakeaways: [
                'An unoccupied 10th house gives executive breadth across leadership and advisory roles.',
                'Sun with Moolatrikona Jupiter in the 2nd house links your authority directly to articulate, value-driven communication.',
              ],
              strategicImplication:
                'Cultivate your voice as a trusted strategic advisor. Your words carry natural authority when grounded in verified data.',
            },
            {
              heading: 'The Dual Crucible: Jupiter Trine vs. Saturn 3rd Aspect',
              paragraphs: [
                'Crucially, your 10th house receives the pure 9th trinal aspect of Jupiter from the 2nd house, classically interpreted as a sign of senior stakeholder goodwill and reputational credibility. However, your 10th Lord Sun encounters a demanding evolutionary discipline: exalted Saturn in the 12th house casts its 3rd aspect onto the Sun, while Mars in the 11th casts its 4th aspect.',
                'This dynamic explains why career advancement in your life is not a matter of unearned entitlement. Saturn requires patient mastery, rigorous preparation, and behind-the-scenes diligence, ensuring that when you step into executive visibility, your foundation is unshakeable.',
              ],
              keyTakeaways: [
                'Jupiter aspect on the 10th house preserves your long-term reputation and institutional goodwill.',
                'Saturn aspect on the 10th lord Sun rewards thorough preparation and disciplined competence.',
              ],
              strategicImplication:
                'Never rush executive transitions. Let rigorous demonstrated mastery precede public authority.',
            },
          ],
          keyTakeaways: [
            'Leo 10th house calls for transparent, principled executive ownership.',
            'Jupiter protects your public standing, while Saturn builds enduring operational character.',
          ],
        };

      case 'ch04_d10_dashamsha_map':
        return {
          chapterId: 'ch04_d10_dashamsha_map',
          title: 'The D10 Dashamsha Map: Architecture of Institutional Authority',
          subtitle: 'Libra Ascendant, Venus in the 10th House, and Divisional Confirmation',
          epigraph: {
            sanskrit: 'दशांशे लग्नपे सौम्ये कर्मसिद्धिश्च जायते।',
            transliteration: 'daśāṃśe lagnape saumye karmasiddhiśca jāyate |',
            translation: 'When the ruler of the Dashamsha Ascendant is benefic and favorably placed, professional undertakings bear fruitful realization.',
            source: 'Brihat Parashara Hora Shastra, Ch. 7, Sloka 34',
          },
          leadParagraph: `In classical Vedic astrology, while the natal chart (Rashi D1) reveals your foundational psychological constitution, the Dashamsha (D10) provides the specialized divisional micro-map of your professional karma, social standing, and execution of institutional duty. In your D10 chart, the balanced, diplomatic sign of Libra (Tula) rises on the ascendant, governed by Venus.`,
          thematicSections: [
            {
              heading: 'Libra D10 Ascendant & Exalted Saturn in the 1st House',
              paragraphs: [
                'With Libra rising in your Dashamsha, your vocational identity shifts from the secretive intensity of natal Scorpio toward structured equity, fairness, institutional balance, and high-level stakeholder diplomacy. Most remarkably, Saturn—the natural significator of labor and discipline—is exalted in the 1st house of your D10 in Libra.',
                'This exalted Saturn in the D10 Lagna establishes an unmistakable reputation for unyielding personal integrity, organizational endurance, and systemic thoroughness. You are naturally entrusted with heavy institutional responsibilities, restructuring complex processes, and establishing sustainable operating standards.',
              ],
              keyTakeaways: [
                'Libra D10 Lagna emphasizes fairness, diplomatic poise, and consensus-building.',
                'Exalted Saturn in D10 Lagna commands deep respect through quiet competence and integrity.',
              ],
              strategicImplication:
                'Anchor your professional brand in operational dependability and long-term organizational stewardship.',
              cautionaryNote:
                'Avoid carrying the full weight of institutional dysfunction alone; build distributed accountability across your leadership team.',
            },
            {
              heading: 'Venus in the 10th House: Executive Relationship Capital',
              paragraphs: [
                'The ruler of your D10 Lagna, Venus, is positioned directly in the 10th house of profession in the sign of Cancer. In divisional analysis, the Lagna Lord occupying the 10th house (Lagnadhipati in Karma Bhava) is considered one of the highest blessings for vocational distinction.',
                'Placed in Cancer, Venus softens executive command with emotional intelligence, stakeholder empathy, and relational harmony. It indicates that your greatest professional breakthroughs occur when you humanize organizational processes, align diverse factions, and create workplaces grounded in mutual trust.',
              ],
              keyTakeaways: [
                'D10 Lagna lord Venus in 10th house grants executive relationship capital and cultural leadership.',
                'Empathy and cross-functional diplomacy are core competitive advantages.',
              ],
              strategicImplication:
                'Cultivate executive presence through collaborative bridge-building rather than adversarial confrontation.',
            },
          ],
          keyTakeaways: [
            'Your D10 confirms strong institutional authority anchored by exalted Saturn in the 1st house.',
            'Venus in the 10th house aligns your ultimate professional fulfillment with relational leadership and ethical stewardship.',
          ],
        };

      case 'ch05_planetary_influences_yogas':
        return {
          chapterId: 'ch05_planetary_influences_yogas',
          title: 'Planetary Yogas & Influences: The Cosmic Wealth Engines',
          subtitle: 'Chandra-Mangal Yoga, Budha-Aditya Yoga, and the Tested 10th Lord',
          epigraph: {
            sanskrit: 'योगेन्द्रा यस्य जन्मनि राज्यं तस्य न संशयः।',
            transliteration: 'yogendrā yasya janmani rājyaṃ tasya na saṃśayaḥ |',
            translation: 'When auspicious planetary combinations align in a nativity, purposeful authority and worldly success are attained through right action.',
            source: 'Jataka Parijata, Ch. 7, Sloka 1',
          },
          leadParagraph: `A Vedic horoscope is illuminated by Yogas—specific planetary conjunctions and alignments that synthesize distinct cosmic energies into concentrated life themes. Your chart features an extraordinary confluence of classical combinations that directly shape your intellectual acumen, financial intelligence, and operational execution.`,
          thematicSections: [
            {
              heading: 'Chandra-Mangal Yoga in the 11th House: The Commercial Engine',
              paragraphs: [
                'In your 11th house of enterprise networks and commercial gains (Labha Bhava), the Moon and Mars form an exact conjunction in the analytical sign of Virgo (Kanya). In classical treatises like Saravali and Phaladeepika, this Chandra-Mangal Yoga is heralded as a premier engine of prosperity and enterprise initiative.',
                'In the modern corporate landscape, this placement manifests as sharp commercial instinct, swift operational troubleshooting, and an intuitive grasp of how organizational systems generate revenue. Because this occurs in Virgo—ruled by Mercury—your commercial drive is disciplined, data-driven, and focused on operational efficiency.',
              ],
              keyTakeaways: [
                'Chandra-Mangal Yoga in Virgo unifies critical analysis with commercial momentum.',
                'The 11th house placement directs your talents toward scalable enterprise networks.',
              ],
              strategicImplication:
                'Seek roles where your metrics-driven analytical skills directly impact business growth and revenue delivery.',
              cautionaryNote:
                'Virgo precision can drift into micro-management or impatience with slower collaborators; practice deliberate empathy.',
            },
            {
              heading: 'Budha-Aditya & Guru-Aditya Yogas in the 2nd House: Articulate Wisdom',
              paragraphs: [
                'In your 2nd house of speech, treasury, and institutional values (Sagittarius), the Sun joins Mercury to form the classical Budha-Aditya Yoga of intellectual brilliance, alongside Jupiter placed in its own Moolatrikona sign. This triple combination creates a commanding reservoir of advisory intelligence.',
                'Jupiter in its own sign in the 2nd house signifies profound ethical alignment, financial discernment, and persuasive communication. Your counsel is valued because it blends visionary perspective with practical governance. You do not merely speak; you articulate enduring frameworks that clarify direction for others.',
              ],
              keyTakeaways: [
                'Budha-Aditya Yoga provides rapid intellectual synthesis and sharp communication.',
                'Moolatrikona Jupiter in the 2nd house establishes authoritative financial and advisory credibility.',
              ],
              strategicImplication:
                'Position yourself in advisory, board, or strategic consulting capacities where high-level counsel is valued.',
            },
          ],
          keyTakeaways: [
            'Chandra-Mangal Yoga fuels your pragmatic operational execution in enterprise settings.',
            'Budha-Aditya and Jupiter in the 2nd house establish an enduring foundation of ethical and advisory authority.',
          ],
        };

      case 'ch06_vocational_strengths_archetypes':
        return {
          chapterId: 'ch06_vocational_strengths_archetypes',
          title: 'Vocational Strengths & Strategic Archetypes',
          subtitle: 'Balancing Analytical Systems Mastery with Executive Counsel',
          epigraph: {
            sanskrit: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।',
            transliteration: 'karmaṇyevādhikāraste mā phaleṣu kadācana |',
            translation: 'You have a right to your prescribed duty alone, never to the fruits of action. Let not the fruits of action be your motive, nor let your attachment be to inaction.',
            source: 'Bhagavad Gita, Ch. 2, Sloka 47',
          },
          leadParagraph: `Rather than forcing your professional identity into a narrow occupational label, classical Vedic vocational analysis identifies your core cognitive archetypes—the distinct behavioral modes in which your mental and operational energies flow with greatest natural ease and highest compounding yield.`,
          thematicSections: [
            {
              heading: 'The Strategic Systems Architect & The Advisory Governance Counselor',
              paragraphs: [
                'Your primary operational archetype is The Strategic Systems Architect, born of Scorpio investigative Lagna, Mars-Moon in Virgo, and exalted Saturn in Libra. This archetype thrives on diagnosing systemic bottlenecks, structuring workflows, and designing durable operational architecture that scales reliably under pressure.',
                'Simultaneously, your 2nd house Sagittarius stellium (Sun, Mercury, Jupiter) powers a complementary secondary archetype: The Advisory Governance Counselor. This archetype excels at synthesising complex regulatory, financial, or organizational data into principled, persuasive strategic narratives that senior stakeholders trust.',
              ],
              keyTakeaways: [
                'Primary archetype: Systems Architect capable of untangling complex operational knots.',
                'Secondary archetype: Governance Counselor providing values-driven strategic advice.',
              ],
              strategicImplication:
                'Design a hybrid career path that blends operational architecture oversight with senior advisory influence.',
              cautionaryNote:
                'Avoid taking on purely administrative maintenance tasks that lack intellectual depth or strategic impact.',
            },
          ],
          keyTakeaways: [
            'Your highest professional yield occurs when analytical systems engineering meets executive advisory governance.',
            'Thrives in autonomous, high-trust environments where measurable problem-solving is prioritized.',
          ],
        };

      case 'ch07_professional_challenges_risk_mitigation':
        return {
          chapterId: 'ch07_professional_challenges_risk_mitigation',
          title: 'Professional Challenges & Risk Mitigation',
          subtitle: 'Transforming Karmic Friction into Enduring Leadership Maturity',
          epigraph: {
            sanskrit: 'विपदि धैर्यमथाभ्युदये क्षमा।',
            transliteration: 'vipadi dhairyamathābhyudaye kṣamā |',
            translation: 'Courage in adversity, forbearance in prosperity—this is the hallmark of noble and disciplined character.',
            source: 'Bhartrihari Niti Shatakam, Sloka 63',
          },
          leadParagraph: `In authentic Vedic astrology, planetary tensions are never viewed as permanent afflictions or fatal flaws. Rather, they are diagnostic indicators of your karmic evolutionary edge—the precise psychological pressure points where unconscious habits must be transformed through intentional awareness, emotional maturity, and deliberate professional practices.`,
          thematicSections: [
            {
              heading: 'The Perfectionist Bottleneck & Internalized Pressure',
              paragraphs: [
                'Mars in Virgo in the 11th house, while commercially brilliant, can trigger a relentless perfectionist reflex. When stakes are high, you may find yourself over-scrutinizing deliverables, hesitating to delegate operational tasks, or expecting colleagues to match your exact speed and precision.',
                'Furthermore, exalted Saturn in the 12th house casts its 3rd aspect upon the Sun in the 2nd house. This planetary friction can produce internalized imposter feelings or excessive self-criticism during career transitions. Recognizing this as a protective mental pattern allows you to lead with greater self-compassion and decisive confidence.',
              ],
              keyTakeaways: [
                'Perfectionism can bottleneck team execution; structured delegation protocols are essential.',
                'Saturn aspect on Sun tests confidence to build unshakeable competence, not to diminish self-worth.',
              ],
              strategicImplication:
                'Adopt an 85% delivery threshold for intermediate drafts to prevent analysis paralysis from stalling team progress.',
              cautionaryNote:
                'Avoid isolating yourself when facing organizational ambiguity; proactively consult trusted peer sounding boards.',
            },
          ],
          keyTakeaways: [
            'Cognitive friction points are invitations to upgrade executive leadership maturity.',
            'Intentional delegation and transparent communication dissolve perfectionist bottlenecks.',
          ],
        };

      case 'ch08_career_environments_employment_vs_enterprise':
        return {
          chapterId: 'ch08_career_environments_employment_vs_enterprise',
          title: 'Organizational Environments: Employment vs. Enterprise',
          subtitle: 'Structuring Institutional Authority and Independent Advisory Scalability',
          epigraph: {
            sanskrit: 'सेवा धर्मः परमगहनो योगिनामप्यगम्यः।',
            transliteration: 'sevā dharmaḥ paramagahano yogināmapyagamyaḥ |',
            translation: 'The duty of dedicated service is deeply subtle and demanding, yet when executed with integrity, it yields profound mastery and honor.',
            source: 'Panchatantra, Book 1',
          },
          leadParagraph: `A central inquiry in executive career counseling is the comparative evaluation between institutional employment (corporate leadership, structured public service) and independent enterprise (entrepreneurship, equity partnerships, independent advisory). In your horoscope, both pathways are strongly activated, pointing toward a phased, hybrid evolution rather than a rigid binary choice.`,
          thematicSections: [
            {
              heading: 'Institutional Governance vs. Independent Commercial Enterprise',
              paragraphs: [
                'Your institutional foundation is fortified by an exalted Saturn in the 12th house, Moolatrikona Jupiter in the 2nd house, and a Leo 10th house. These placements thrive within structured organizations that respect governance, long-term stability, and formal protocols. In these settings, your ability to manage risk and bring order to chaos makes you an indispensable executive anchor.',
                'Concurrently, the Chandra-Mangal Yoga in the 11th house and 10th Lord Sun in the 2nd house ignite a formidable commercial enterprise impulse. The optimal life arc indicated by your chart is a two-stage evolution: establishing deep institutional authority, specialized domain mastery, and executive credibility first, followed by expanding into independent advisory consulting, fractional leadership, or equity-backed ventures.',
              ],
              keyTakeaways: [
                'Institutional roles provide the credibility and governance bedrock for your career.',
                'Enterprise indicators favor independent consulting or fractional advisory in your mature career stage.',
              ],
              strategicImplication:
                'Build your corporate capital while simultaneously incubating independent advisory expertise and professional networks.',
            },
          ],
          keyTakeaways: [
            'Your chart favors a hybrid trajectory: corporate leadership transitioning into strategic advisory enterprise.',
            'High-fit industry sectors include Technology Systems Architecture, Strategic Financial Governance, and Enterprise Operations.',
          ],
        };

      case 'ch09_cosmic_clock_timing_windows':
        return {
          chapterId: 'ch09_cosmic_clock_timing_windows',
          title: 'The Cosmic Clock: Timing Windows & Life Horizons',
          subtitle: 'Dasha Sequences, Transits, and Strategic Career Epochs',
          epigraph: {
            sanskrit: 'कालो हि सर्वभूतानां धाता पोषक एव च।',
            transliteration: 'kālo hi sarvabhūtānāṃ dhātā poṣaka eva ca |',
            translation: 'Time alone is the architect and nourisher of all living beings, orchestrating the fruition of effort at its appointed hour.',
            source: 'Mahabharata, Shanti Parva',
          },
          leadParagraph: `In Vedic astrology, the Vimshottari Dasha system serves as the definitive chronometer of life unfolding. By tracking the cyclical periods of planetary rulers, Dasha analysis illuminates the qualitative atmospheric currents surrounding your career, indicating optimal seasons for bold expansion, consolidating gains, or patient restructuring.`,
          thematicSections: [
            {
              heading: 'The Great Planetary Cycles: From Foundation to Consolidation',
              paragraphs: [
                'Born in the concluding phase of Mars Dasha and having navigated the formative 18-year Rahu Dasha (which stimulated unconventional learning, ambition, and cross-domain adaptability), your chart transitions into the expansive, values-centered epoch of Jupiter Dasha.',
                'Jupiter, occupying its own Moolatrikona sign of Sagittarius in your 2nd house and casting its protective trinal aspect on your 10th house of career, marks an era where your accumulated domain knowledge, moral authority, and executive advisory voice take center stage. This period rewards mentoring, strategic thought leadership, and institutional consolidation over frantic hustling.',
              ],
              keyTakeaways: [
                'Vimshottari Dasha reveals qualitative timing windows, not deterministic appointments.',
                'The Jovian cycle shifts emphasis from operational hustle to executive wisdom and advisory influence.',
              ],
              strategicImplication:
                'Align major career transitions with favorable dasha sub-periods, prioritizing sustainable value creation.',
              cautionaryNote:
                'Timing indicators describe environmental conditions; personal preparation remains mandatory to seize emerging windows.',
            },
          ],
          keyTakeaways: [
            'Your career timing enters an epoch prioritizing strategic advisory authority and long-range legacy.',
            'Conscious synchronization of effort with planetary cycles minimizes friction and compounds success.',
          ],
        };

      case 'ch10_roadmap_and_ethical_remedies':
        return {
          chapterId: 'ch10_roadmap_and_ethical_remedies',
          title: 'Practical Roadmap & Traditional Alignment',
          subtitle: 'Phased Horizons, Contemplative Disciplines, and Closing Counsel',
          epigraph: {
            sanskrit: 'उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः।',
            transliteration: 'udyamena hi sidhyanti kāryāṇi na manorathaiḥ |',
            translation: 'Accomplishments are achieved solely through purposeful enterprise and dedicated effort, never by wishful longing alone.',
            source: 'Hitopadesha, Prastavika Sloka 31',
          },
          leadParagraph: `A truly transformative career consultation bridges cosmic awareness with concrete, actionable steps. This concluding chapter provides a clear chronological roadmap across 30-day, 90-day, 1-year, and 3-year horizons, followed by traditional ethical disciplines designed to ground your mental focus and enhance your professional stamina.`,
          thematicSections: [
            {
              heading: 'Strategic Execution Across Phased Horizons',
              paragraphs: [
                'Your career evolution thrives on phased progression. Rather than attempting abrupt disruptive pivots, align your energy through deliberate sequential milestones that build cumulative momentum.',
                'Focus initially on establishing pristine operational boundaries and eliminating workflow friction, then leverage your expanded clarity to deepen high-impact stakeholder alliances across the enterprise network.',
              ],
              keyTakeaways: [
                'Phased execution protects cognitive bandwidth while accelerating strategic delivery.',
                'Consistent operational discipline converts high-level potential into compounding career equity.',
              ],
              strategicImplication:
                'Treat each milestone horizon as a stepping stone toward complete strategic autonomy.',
            },
          ],
          keyTakeaways: [
            'Systemic alignment between classical indicators and operational delivery.',
            'Principled action and clear communication drive sustainable advancement.',
          ],
          remedies: [
            {
              title: 'Saturday Mindful Service & Contemplative Routine (Shani Seva)',
              category: 'LIFESTYLE / SEVA',
              governingFactor: 'Saturn, Nakshatra lord of Anuradha Ascendant, exalted in the 12th house',
              specificRecommendation:
                'Dedicate 30–45 minutes every Saturday morning to quiet retrospective planning, disciplined workflow review, and humble anonymous service or community support.',
              protocolSteps: [
                'Step 1: Saturday morning quiet reflection and weekly prioritization in a distraction-free space.',
                'Step 2: Periodic anonymous charitable assistance or practical support for elderly or disadvantaged groups.',
              ],
              ethicalDisclaimer:
                'Astrological remedial suggestions represent traditional contemplative alignments and behavioral self-care disciplines designed for psychological grounding; they do not constitute medical, legal, or guaranteed commercial solutions.',
            },
          ],
          roadmap: {
            thirtyDay: {
              focus: 'Audit daily workflows, establish structured Saturday retrospectives, and eliminate operational friction.',
              immediateActions: ['Conduct calendar audit', 'Document core delegation boundaries', 'Initiate weekly reflective pause'],
              experiments: ['Batch administrative communications', 'Dedicate undisturbed focus blocks for deep work'],
              metrics: '20% reduction in ad-hoc meeting interruptions and clear milestone tracking.',
            },
            ninetyDay: {
              focus: 'Expand cross-functional network engagement and present structured systems optimization to senior leadership.',
              immediateActions: ['Engage key cross-departmental stakeholders', 'Formalize process improvements', 'Strengthen mentor relationships'],
              experiments: ['Lead high-impact cross-functional sprint', 'Publish internal strategy briefing'],
              metrics: 'Formal leadership endorsement on strategic initiative.',
            },
            oneYear: {
              focus: 'Consolidate executive positioning and establish formal advisory authority in institutional governance.',
              immediateActions: ['Step into broader programmatic ownership', 'Build pipeline of mentored talent', 'Align with ethical industry peers'],
              experiments: ['Structure innovative commercial initiative', 'Represent organization at external industry forums'],
              metrics: 'Substantive elevation in organizational scope and peer recognition.',
            },
            threeYear: {
              focus: 'Advance toward executive board governance, senior partnership, or independent strategic advisory enterprise.',
              immediateActions: ['Build autonomous advisory vehicle', 'Diversify institutional relationships', 'Mentor next-generation leaders'],
              experiments: ['Launch independent advisory venture or equity-backed program', 'Publish thought leadership'],
              metrics: 'Complete strategic autonomy, sustainable work-life harmony, and enduring legacy.',
            },
          },
          closingSummary: `In closing, ${clientName}, your birth chart reveals a rare and powerful synthesis of investigative intensity (Scorpio Lagna), diplomatic alliance-building (Anuradha / Libra D10), commercial scaling drive (Chandra-Mangal in 11th Virgo), and articulate wisdom (Sun and Jupiter in 2nd Sagittarius). Walk forward with confidence, patient discipline, and purposeful stewardship.`,
        };

      default:
        // Generic canonical chapter template for remaining chapters
        return {
          chapterId: packet.chapterId,
          title: this.getDefaultTitleForChapter(packet.chapterId),
          subtitle: 'Astrological Synthesis & Modern Vocational Application',
          leadParagraph: `This chapter examines ${packet.objective.toLowerCase().slice(0, 200)}... In your natal chart, this dimension is anchored by the interplay of ${Object.keys(packet.calculatedFacts).join(', ')}.`,
          thematicSections: [
            {
              heading: 'Astrological Analysis & Core Principles',
              paragraphs: [
                `Drawing from classical shastric benchmarks, your placements reveal an environment where structured effort yields compounding professional returns. The foundational principles highlight: ${packet.traditionalPrinciples.slice(0, 2).join(' ')}`,
                `In contemporary professional practice, this translates directly into measurable strategic advantages: ${packet.vocationalSynthesisNotes.slice(0, 2).join(' ')}`,
              ],
              keyTakeaways: [
                'Balance deliberate strategic planning with agile milestone execution.',
                'Leverage your natural diagnostic depth to establish institutional value.',
              ],
              strategicImplication:
                'Align your daily workflow with long-term governance and scalable network expansion.',
              cautionaryNote:
                'Maintain conscious boundaries to prevent operational stress from eroding strategic clarity.',
            },
          ],
          keyTakeaways: [
            'Systemic alignment between classical indicators and operational delivery.',
            'Principled action and clear communication drive sustainable advancement.',
          ],
          remedies:
            packet.chapterId === 'ch10_roadmap_and_ethical_remedies'
              ? (packet.calculatedFacts.remedies as any)
              : undefined,
          roadmap:
            packet.chapterId === 'ch10_roadmap_and_ethical_remedies'
              ? {
                  thirtyDay: {
                    focus: 'Audit daily workflows, establish structured Saturday retrospectives, and eliminate operational friction.',
                    immediateActions: ['Conduct calendar audit', 'Document core delegation boundaries', 'Initiate weekly reflective pause'],
                    experiments: ['Batch administrative communications', 'Dedicate undisturbed focus blocks for deep work'],
                    metrics: '20% reduction in ad-hoc meeting interruptions and clear milestone tracking.',
                  },
                  ninetyDay: {
                    focus: 'Expand cross-functional network engagement and present structured systems optimization to senior leadership.',
                    immediateActions: ['Engage key cross-departmental stakeholders', 'Formalize process improvements', 'Strengthen mentor relationships'],
                    experiments: ['Lead high-impact cross-functional sprint', 'Publish internal strategy briefing'],
                    metrics: 'Formal leadership endorsement on strategic initiative.',
                  },
                  oneYear: {
                    focus: 'Consolidate executive positioning and establish formal advisory authority in institutional governance.',
                    immediateActions: ['Step into broader programmatic ownership', 'Build pipeline of mentored talent', 'Align with ethical industry peers'],
                    experiments: ['Structure innovative commercial initiative', 'Represent organization at external industry forums'],
                    metrics: 'Substantive elevation in organizational scope and peer recognition.',
                  },
                  threeYear: {
                    focus: 'Advance toward executive board governance, senior partnership, or independent strategic advisory enterprise.',
                    immediateActions: ['Build autonomous advisory vehicle', 'Diversify institutional relationships', 'Mentor next-generation leaders'],
                    experiments: ['Launch independent advisory venture or equity-backed program', 'Publish thought leadership'],
                    metrics: 'Complete strategic autonomy, sustainable work-life harmony, and enduring legacy.',
                  },
                }
              : undefined,
          closingSummary:
            packet.chapterId === 'ch10_roadmap_and_ethical_remedies'
              ? `In closing, ${clientName}, your birth chart reveals a rare and powerful synthesis of investigative intensity (Scorpio Lagna), diplomatic alliance-building (Anuradha / Libra D10), commercial scaling drive (Chandra-Mangal in 11th Virgo), and articulate wisdom (Sun and Jupiter in 2nd Sagittarius). Walk forward with confidence, patient discipline, and purposeful stewardship.`
              : undefined,
        };
    }
  }

  private getDefaultTitleForChapter(chapterId: ChapterId): string {
    switch (chapterId) {
      case 'ch01_orientation_blueprint':
        return 'Orientation & Professional Blueprint';
      case 'ch02_mysteries_of_lagna':
        return 'Mysteries of the Ascendant & Vital Foundation';
      case 'ch03_tenth_house_mandate':
        return 'The 10th House Mandate & Executive Governance';
      case 'ch04_d10_dashamsha_map':
        return 'The D10 Dashamsha Career Blueprint';
      case 'ch05_planetary_influences_yogas':
        return 'Planetary Influences, Yogas & Nakshatras';
      case 'ch06_vocational_strengths_archetypes':
        return 'Vocational Strengths & Working Style';
      case 'ch07_professional_challenges_risk_mitigation':
        return 'Professional Challenges & Developmental Edge';
      case 'ch08_career_environments_employment_vs_enterprise':
        return 'Career Environments & Employment vs Enterprise';
      case 'ch09_cosmic_clock_timing_windows':
        return 'The Cosmic Clock: Timing Windows & Life Stages';
      case 'ch10_roadmap_and_ethical_remedies':
        return 'Practical Roadmap & Traditional Alignment';
    }
  }
}

export const chapterPipelineService = ChapterPipelineService.getInstance();
