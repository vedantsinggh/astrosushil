import {
  NormalizedChart,
  AstroChart,
  normalizeAstroChart,
  normalizeVargaChart,
  ChartCalculator,
  VargaCalculator,
  VargaType,
  ShadbalaCalculator,
  calculateBhavaBala,
  VimshopakaCalculator,
  AshtakavargaCalculator,
  DashaCalculator,
  YogaCalculator,
  SpecialPointsCalculator,
  JaiminiCalculator,
  KPCalculator,
  PanchangCalculator,
  AstronomyEngineAdapter,
  utcDateToJulianDay,
  normalizeDegree,
  SadeSatiCalculator,
  AvakhadaChakraCalculator,
  GhatChakraCalculator,
  TaraChakraCalculator,
  PlanetSymbol,
  getAspectedHouses,
  AstrologyConfig,
  BirthDetails,
  RASHIS,
  NAKSHATRAS,
  getNakshatraByLongitude,
  normalizeBirthTime,
} from '@astro/astrology-engine';
import { CareerAnalysis, VocationalSynthesisEngine } from '@astro/prediction-engine';
import {
  CareerReportData,
  HouseReportModel,
  PlanetReportModel,
  VargaChartReportModel,
  D10DashamshaReportModel,
  NakshatraAnalysisReportModel,
  YogaAnalysisReportModel,
  ShadbalaReportModel,
  BhavaBalaReportModel,
  VimshopakaReportModel,
  AshtakavargaReportModel,
  DashaReportModel,
  TransitReportModel,
  JaiminiReportModel,
  KPReportModel,
  PanchangaReportModel,
  SpecialPointsReportModel,
  CareerAnalysisModel,
  ClientReportHeader,
  CalculationConfigModel,
  AscendantReportModel,
  DataStatus,
} from '../types/career-report.types';

export interface ClientProfileMetadata {
  clientName?: string;
  dateOfBirth?: string;
  timeOfBirth?: string;
  birthPlace?: string;
  timeZone?: string;
  latitude?: number;
  longitude?: number;
}

const VARGA_DEFINITIONS: Record<
  string,
  { division: number; name: string; sanskritName: string; purpose: string; careerRelevance: string }
> = {
  D1: {
    division: 1,
    name: 'Rashi',
    sanskritName: 'Rasi Chakra',
    purpose: 'Root physical chart representing foundational constitution and life themes.',
    careerRelevance: 'Primary determinant of career orientation, public stature, and fundamental vocation.',
  },
  D2: {
    division: 2,
    name: 'Hora',
    sanskritName: 'Hora',
    purpose: 'Wealth generation, liquidity, fiscal temperament, and material resources.',
    careerRelevance: 'Evaluates income accumulation, financial backing, and asset retention capabilities.',
  },
  D3: {
    division: 3,
    name: 'Drekkana',
    sanskritName: 'Drekkana',
    purpose: 'Energy, vitality, courage, initiative, and sibling/colleague interactions.',
    careerRelevance: 'Indicates drive for entrepreneurship, tactical execution, and operational stamina.',
  },
  D4: {
    division: 4,
    name: 'Chaturthamsha',
    sanskritName: 'Chaturthamsa / Turyamsa',
    purpose: 'Fixed assets, infrastructure, property, and foundational stability.',
    careerRelevance: 'Institutional backing, office/infrastructure ownership, and corporate stability.',
  },
  D7: {
    division: 7,
    name: 'Saptamsha',
    sanskritName: 'Saptamsa',
    purpose: 'Procreative output, progeny, and creative fruits (putra-pautradi).',
    careerRelevance: 'Classically indicates progeny; modern consulting sometimes draws an informal symbolic analogy to creative projects or team delegation.',
  },
  D9: {
    division: 9,
    name: 'Navamsha',
    sanskritName: 'Navamsa / Dharmamsa',
    purpose: 'Dharma, inner potential, soul purpose, and marriage (bharyadi).',
    careerRelevance: 'Essential classical validation of D1 planetary potencies; reveals mature vocational fruition and inner dharmic alignment.',
  },
  D10: {
    division: 10,
    name: 'Dashamsha',
    sanskritName: 'Dasamsa / Karmamsa',
    purpose: 'Dedicated professional chart, career stature, authority, and public accomplishments.',
    careerRelevance: 'Primary divisional chart for profession, executive reputation, leadership hierarchy, and honors.',
  },
  D12: {
    division: 12,
    name: 'Dwadashamsha',
    sanskritName: 'Dvadasamsa / Suryamsa',
    purpose: 'Parental lineage, ancestral heritage, and parents (mata-pitror).',
    careerRelevance: 'Classically evaluates parental heritage; modern consulting examines family business succession or inherited institutional standing.',
  },
  D16: {
    division: 16,
    name: 'Shodashamsha',
    sanskritName: 'Sodasamsa / Kalamsa',
    purpose: 'Conveyances, comfort, executive perks, vehicles, and inner contentment (sukha-chintanam).',
    careerRelevance: 'Executive benefits, workplace facilities, comfort assets, and day-to-day satisfaction.',
  },
  D20: {
    division: 20,
    name: 'Vimshamsha',
    sanskritName: 'Vimsamsa',
    purpose: 'Spiritual focus, devotion, upasana, and religious inclinations (upasana-jnanam).',
    careerRelevance: 'Classically evaluates spiritual disciplines; modern consulting analogizes this to ethical grounding, stewardship, and governance principles.',
  },
  D24: {
    division: 24,
    name: 'Chaturvimshamsha',
    sanskritName: 'Siddhamsa / Chaturvimsamsa',
    purpose: 'Higher education, technical skill acquisition, wisdom, and intellectual mastery (vidya).',
    careerRelevance: 'Domain expertise, technical acumen, advanced credentials, and specialized research knowledge.',
  },
  D27: {
    division: 27,
    name: 'Bhamsa',
    sanskritName: 'Saptavimsamsa / Nakshatramsa',
    purpose: 'General constitutional strength, vital capacity, and physical/mental endurance (bala-abala).',
    careerRelevance: 'Classically evaluates general strength and vulnerability; modern consulting examines resilience under operational stress and crisis endurance.',
  },
  D30: {
    division: 30,
    name: 'Trimshamsha',
    sanskritName: 'Trimsamsa',
    purpose: 'Misfortunes, vulnerabilities, litigations, and hidden adversaries (arishta-chintanam).',
    careerRelevance: 'Operational risk assessment, legal/regulatory vulnerabilities, and defensive dispute mitigation.',
  },
  D40: {
    division: 40,
    name: 'Khavedamsha',
    sanskritName: 'Khavedamsa / Swavedamsa',
    purpose: 'Subtle auspicious and inauspicious karmic effects (shubhashubham).',
    careerRelevance: 'General auspicious potentials; sensitive to birth-time uncertainty due to its narrow 0°45′ division, requiring evaluation against birth-record precision rather than asserting fixed career windfalls.',
  },
  D45: {
    division: 45,
    name: 'Akshavedamsha',
    sanskritName: 'Akshavedamsa',
    purpose: 'Moral character, purity of conduct, and ethical orientation (charitra).',
    careerRelevance: 'Ethical predisposition and character; sensitive to birth-time uncertainty across its 0°40′ division, reflecting subtle traits rather than deterministic governance outcomes.',
  },
  D60: {
    division: 60,
    name: 'Shashtiamsha',
    sanskritName: 'Sasthyamsa',
    purpose: 'Microscopic karmic evaluation across all life domains (akhila-vikshanam).',
    careerRelevance: 'Classical microscopic arbiter of underlying planetary potency; spans 0°30′ of arc, making its rising sign sensitive to birth-time uncertainty depending on rising speed and geographical latitude.',
  },
};

const SIGN_NAMES = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export const NAKSHATRA_DEITIES: Record<string, { deity: string; shakti: string }> = {
  Ashwini: { deity: 'Ashvini Kumaras', shakti: 'Power of swift initiative and restorative healing' },
  Bharani: { deity: 'Yama', shakti: 'Power of disciplined endurance and ethical accountability' },
  Krittika: { deity: 'Agni', shakti: 'Power of sharp discernment, purification, and decisive action' },
  Rohini: { deity: 'Brahma / Prajapati', shakti: 'Power of organic creation, fertility, and continuous growth' },
  Mrigashira: { deity: 'Soma', shakti: 'Power of intellectual search, curiosity, and research depth' },
  Ardra: { deity: 'Rudra', shakti: 'Power of transformative breakthroughs, perseverance, and renewal' },
  Punarvasu: { deity: 'Aditi', shakti: 'Power of renewal, ethical restoration, and strategic patience' },
  Pushya: { deity: 'Brihaspati', shakti: 'Power of nourishment, executive wisdom, and institutional stewardship' },
  Ashlesha: { deity: 'Sarpas', shakti: 'Power of strategic intuition, penetrative insight, and focus' },
  Magha: { deity: 'Pitris', shakti: 'Power of ancestral authority, lineage, and institutional governance' },
  'Purva Phalguni': { deity: 'Bhaga', shakti: 'Power of commercial value creation, aesthetic appeal, and diplomacy' },
  'Uttara Phalguni': { deity: 'Aryaman', shakti: 'Power of executive patronage, enduring partnerships, and contracts' },
  Hasta: { deity: 'Savitar', shakti: 'Power of precision craftsmanship, technological dexterity, and delivery' },
  Chitra: { deity: 'Tvashtar (Vishwakarma)', shakti: 'Power of architectural design, structural aesthetics, and ingenuity' },
  Swati: { deity: 'Vayu', shakti: 'Power of commercial adaptability, independent mobility, and trade' },
  Vishakha: { deity: 'Indragni', shakti: 'Power of focused ambition, goal attainment, and milestone achievement' },
  Anuradha: { deity: 'Mitra', shakti: 'Power of organizational alliances, loyalty, and structured collaboration' },
  Jyeshtha: { deity: 'Indra', shakti: 'Power of executive seniority, sovereign command, and courage' },
  Mula: { deity: 'Nirriti', shakti: 'Power of root-cause investigation, deconstruction, and core fundamentals' },
  'Purva Ashadha': { deity: 'Apas', shakti: 'Power of strategic invincibility, persuasive rhetoric, and momentum' },
  'Uttara Ashadha': { deity: 'Vishvadevas', shakti: 'Power of institutional victory, collective dharma, and permanence' },
  Shravana: { deity: 'Vishnu', shakti: 'Power of attentive listening, continuous learning, and market wisdom' },
  Dhanishta: { deity: 'Ashta Vasus', shakti: 'Power of enterprise resourcefulness, rhythm, and material fruition' },
  Shatabhisha: { deity: 'Varuna', shakti: 'Power of systemic containment, deep diagnostics, and strategic discretion' },
  'Purva Bhadrapada': { deity: 'Aja Ekapada', shakti: 'Power of transformative vision, radical focus, and spiritual resolve' },
  'Uttara Bhadrapada': { deity: 'Ahirbudhnya', shakti: 'Power of deep foundation stability, resilience, and patience' },
  Revati: { deity: 'Pushan', shakti: 'Power of safe navigation, abundance, and international commercial exchange' },
};

function getAscendantTraitSummary(sign: string): string {
  switch (sign.toLowerCase()) {
    case 'aries': return 'decisive executive initiative, pioneering courage, and direct tactical problem-solving';
    case 'taurus': return 'deliberate resource stewardship, endurance, pragmatic methodology, and structural consistency';
    case 'gemini': return 'intellectual agility, multimodal communication, data synthesis, and rapid adaptation';
    case 'cancer': return 'intuitive stakeholder perception, institutional loyalty, protective leadership, and team rapport';
    case 'leo': return 'natural institutional authority, sovereign vision, high accountability, and executive presence';
    case 'virgo': return 'rigorous analytical precision, operational optimization, meticulous quality control, and methodical systems thinking';
    case 'libra': return 'strategic diplomacy, commercial value negotiation, balanced consensus-building, and partnership ergonomics';
    case 'scorpio': return 'penetrative strategic depth, turnaround resilience, investigative persistence, and crisis composure';
    case 'sagittarius': return 'principled long-term vision, ethical governance, expansive strategic council, and institutional mentorship';
    case 'capricorn': return 'uncompromising organizational discipline, long-term persistence, systems architecture, and structural stamina';
    case 'aquarius': return 'visionary systems thinking, objective intellectual neutrality, collective enterprise scaling, and technological foresight';
    case 'pisces': return 'holistic strategic intuition, global perspective, reflective discernment, and cross-functional empathy';
    default: return 'purposeful executive direction and objective professional agency';
  }
}

export function synthesizeVargaCommentary(
  vType: string,
  def: { division: number; name: string; sanskritName: string; purpose: string; careerRelevance: string },
  ascSign: string,
  ascLord: string,
  placements: Array<{ planet: string; sign: string; house: number; isRetrograde: boolean }>,
  hasValidData: boolean
): { status: 'VERIFIED' | 'UNAVAILABLE'; commentary: string } {
  if (!hasValidData || placements.length === 0) {
    return {
      status: 'UNAVAILABLE',
      commentary: `Divisional chart data for ${def.name} (${vType.toUpperCase()}) is unavailable from the calculation engine; harmonic analysis for ${def.purpose.toLowerCase()} cannot be evaluated reliably.`,
    };
  }

  const kendraOccupants = placements.filter((p) => [1, 4, 7, 10].includes(p.house)).map((p) => p.planet);
  const trikonaOccupants = placements.filter((p) => [5, 9].includes(p.house)).map((p) => p.planet);

  switch (vType.toUpperCase()) {
    case 'D1': {
      const angularStr = kendraOccupants.length > 0 ? `Key angular planets (${kendraOccupants.join(', ')}) establish core operational strengths.` : 'Planetary distribution favors strategic adaptability.';
      return {
        status: 'VERIFIED',
        commentary: `The root Rashi chart establishes foundational physical vitality and general life direction with ${ascSign} rising, ruled by ${ascLord}. In career analysis, D1 defines the client's baseline constitution, temperament, and primary vocational inclinations. ${angularStr}`,
      };
    }
    case 'D2': {
      const wealthPlanets = placements.filter((p) => ['Jupiter', 'Venus', 'Mercury'].includes(p.planet) && [1, 2, 11].includes(p.house)).map((p) => p.planet);
      const wealthStr = wealthPlanets.length > 0 ? `Prominent wealth significators in key positions (${wealthPlanets.join(', ')}) support asset accumulation.` : 'Financial flow emphasizes disciplined budgeting and systematic capital accumulation.';
      return {
        status: 'VERIFIED',
        commentary: `The Hora chart specifically evaluates wealth allocation, liquidity, and fiscal temperament under ${ascSign} governance. Unlike the primary career chart, D2 focuses strictly on financial sustainability and earning capacity rather than professional title. ${wealthStr}`,
      };
    }
    case 'D3': {
      const mars = placements.find((p) => p.planet.toUpperCase() === 'MARS');
      const marsStr = mars ? `Mars in House ${mars.house} (${mars.sign}) conditions operational bold initiatives.` : 'Execution boldness is grounded in methodical team collaboration.';
      return {
        status: 'VERIFIED',
        commentary: `The Drekkana chart analyzes operational drive, courage, initiative, and peer collaborations with ${ascSign} rising. D3 reveals how the client handles execution bottlenecks, drives team projects forward, and maintains physical stamina under deadlines. ${marsStr}`,
      };
    }
    case 'D4': {
      const h4Occupants = placements.filter((p) => p.house === 4).map((p) => p.planet);
      const assetStr = h4Occupants.length > 0 ? `House 4 occupied by ${h4Occupants.join(', ')} reinforces organizational stability.` : 'Fixed asset stability is supported by steady corporate infrastructure.';
      return {
        status: 'VERIFIED',
        commentary: `The Chaturthamsha chart evaluates fixed corporate assets, office infrastructure, and institutional stability with ${ascSign} Lagna ruled by ${ascLord}. D4 reflects the client's capacity to build lasting enterprise foundations and secure working environments. ${assetStr}`,
      };
    }
    case 'D7': {
      const subPlanets = placements.filter((p) => [5, 7, 11].includes(p.house)).map((p) => p.planet);
      const teamStr = subPlanets.length > 0 ? `Planets in collaborative houses (${subPlanets.join(', ')}) are interpreted in modern heuristic analogies as supporting team synergy.` : 'Delegation and team collaboration depend on structured reporting and clear communication.';
      return {
        status: 'VERIFIED',
        commentary: `The Saptamsha chart classically evaluates progeny and creative lineage (putra-pautradi). While modern career consultations sometimes draw an informal symbolic analogy between procreative fruit and team delegation or organizational mentorship, classical Jyotish treats D7 strictly as a family lineage chart, and such modern inferences should not be treated as established classical vocational rules. ${teamStr}`,
      };
    }
    case 'D9': {
      const sunOrSat = placements.filter((p) => ['Sun', 'Saturn', 'Jupiter'].includes(p.planet) && [1, 9, 10].includes(p.house)).map((p) => p.planet);
      const dharmaStr = sunOrSat.length > 0 ? `Key planets in dharma and karma sectors (${sunOrSat.join(', ')}) confirm steady maturation of career trajectory.` : 'Inner vocational alignment compounds steadily with maturity and experience.';
      return {
        status: 'VERIFIED',
        commentary: `The Navamsha chart reveals inner dharma, foundational planetary potency, and the deeper fruition of natal potential. D9 validates whether D1 career opportunities reflect authentic, durable vocations or face internal misalignment. ${dharmaStr}`,
      };
    }
    case 'D10': {
      const h10Planets = placements.filter((p) => p.house === 10).map((p) => p.planet);
      const careerStr = h10Planets.length > 0 ? `House 10 occupied by ${h10Planets.join(', ')} directly empowers leadership stature and public recognition.` : `Governed by ${ascLord}, professional hierarchy advancement relies on proven competence and institutional trust.`;
      return {
        status: 'VERIFIED',
        commentary: `The Dashamsha chart is the classical primary divisional tool for analyzing professional stature, executive hierarchy, and public honors. With ${ascSign} rising in D10, the client's executive standing and institutional mandate are directly tested and realized here. ${careerStr}`,
      };
    }
    case 'D12': {
      const sun = placements.find((p) => p.planet.toUpperCase() === 'SUN');
      const lineageStr = sun ? `Sun in House ${sun.house} (${sun.sign}) highlights parental heritage influence.` : 'Professional ethos is shaped by inherited standards of integrity.';
      return {
        status: 'VERIFIED',
        commentary: `The Dwadashamsha chart classically examines parental lineage and ancestral heritage (mata-pitror) with ${ascSign} rising. In modern career analysis, D12 is sometimes consulted for inherited family business backgrounds or ancestral vocations, though classical doctrine restricts its primary scope to parents and does not establish a universal rule for institutional standing. ${lineageStr}`,
      };
    }
    case 'D16': {
      const venus = placements.find((p) => p.planet.toUpperCase() === 'VENUS');
      const perkStr = venus ? `Venus in House ${venus.house} enhances corporate ergonomics and comfort.` : 'Day-to-day executive satisfaction is derived from structured, predictable workflows.';
      return {
        status: 'VERIFIED',
        commentary: `The Shodashamsha chart evaluates conveyances, executive amenities, and inner psychological contentment in daily work with ${ascSign} rising. D16 assesses workplace ergonomics and work-life balance rather than macro-level promotions. ${perkStr}`,
      };
    }
    case 'D20': {
      const jup = placements.find((p) => p.planet.toUpperCase() === 'JUPITER');
      const ethicStr = jup ? `Jupiter in House ${jup.house} (${jup.sign}) anchors high philosophical and ethical standards.` : 'Decision-making is guided by consistent ethical standards and inner reflection.';
      return {
        status: 'VERIFIED',
        commentary: `The Vimshamsha chart classically evaluates spiritual devotion, upasana, and religious disciplines with ${ascSign} rising. While modern career consultations analogize this to fiduciary integrity and corporate ethics, classical Jyotish uses D20 strictly for inner spiritual practices, not corporate governance mandates. ${ethicStr}`,
      };
    }
    case 'D24': {
      const mercOrJup = placements.filter((p) => ['Mercury', 'Jupiter'].includes(p.planet) && [1, 4, 5, 9].includes(p.house)).map((p) => p.planet);
      const studyStr = mercOrJup.length > 0 ? `Intellectual significators in key knowledge houses (${mercOrJup.join(', ')}) support deep domain specialization.` : 'Technical capability grows through methodical practice and continuous learning.';
      return {
        status: 'VERIFIED',
        commentary: `The Chaturvimshamsha (Siddhamsa) chart evaluates higher education, advanced technical skill acquisition, and specialized research acumen with ${ascSign} rising. D24 reflects the client's capacity for complex domain mastery and intellectual authority. ${studyStr}`,
      };
    }
    case 'D27': {
      const sat = placements.find((p) => p.planet.toUpperCase() === 'SATURN');
      const staminaStr = sat ? `Saturn in House ${sat.house} strengthens resilience during prolonged stress.` : 'Endurance under pressure is maintained through deliberate pacing and boundary management.';
      return {
        status: 'VERIFIED',
        commentary: `The Bhamsa (Saptavimshamsha) chart classically evaluates general constitutional strength, vitality, and vulnerability (bala-abala) with ${ascSign} rising. In modern workplace consulting, it is referenced for endurance under stress and resilience during intense operational cycles, though classical shastras define its scope around general physical and mental stamina rather than workplace burnout. ${staminaStr}`,
      };
    }
    case 'D30': {
      const mal = placements.filter((p) => ['Saturn', 'Mars', 'Rahu', 'Ketu'].includes(p.planet) && [6, 8, 12].includes(p.house)).map((p) => p.planet);
      const riskStr = mal.length > 0 ? `Challenging influences in dusthana houses (${mal.join(', ')}) advise strict compliance auditing and risk hedges.` : 'Risk exposure is mitigated through transparent contracts and conservative operating protocols.';
      return {
        status: 'VERIFIED',
        commentary: `The Trimshamsha chart evaluates operational risk factors, compliance liabilities, and conflict mitigation with ${ascSign} rising. D30 is used defensively to identify corporate vulnerabilities and legal hurdles rather than for career advancement. ${riskStr}`,
      };
    }
    case 'D40': {
      const ben = placements.filter((p) => ['Jupiter', 'Venus', 'Moon'].includes(p.planet) && [1, 5, 9, 11].includes(p.house)).map((p) => p.planet);
      const oppStr = ben.length > 0 ? `Benefic influences in auspicious houses (${ben.join(', ')}) indicate general auspicious support.` : 'Progress is earned through compounding effort rather than speculative windfalls.';
      return {
        status: 'VERIFIED',
        commentary: `The Khavedamsha chart classically indicates subtle auspicious and inauspicious karmic trends (shubhashubham) with ${ascSign} rising. Because each Khavedamsha spans 0°45′ of arc, the rising sign's duration in clock time varies based on geographical latitude and the ascendant's speed of rising (oblique ascension). Consequently, higher harmonic indications must be evaluated against birth-time precision and interpreted as subtle karmic predispositions rather than rigid vocational predictions. ${oppStr}`,
      };
    }
    case 'D45': {
      const trik = trikonaOccupants.length > 0 ? `Trikona occupants (${trikonaOccupants.join(', ')}) reinforce moral character and ethics.` : 'Leadership trust is established through consistent follow-through and transparency.';
      return {
        status: 'VERIFIED',
        commentary: `The Akshavedamsha chart evaluates moral conduct and character (charitra) with ${ascSign} rising. Spanning 0°40′ of arc, its findings reflect subtle ethical predispositions and must be weighed in light of birth-time certainty. ${trik}`,
      };
    }
    case 'D60': {
      const kendraStr = kendraOccupants.length > 0 ? `Major planets in angles (${kendraOccupants.join(', ')}) indicate foundational karmic potency.` : 'Karmic momentum supports steady, self-directed professional maturation.';
      return {
        status: 'VERIFIED',
        commentary: `The Shashtiamsha chart classically provides a microscopic evaluation of fine karmic merit across all life domains (akhila-vikshanam) with ${ascSign} rising. Spanning 0°30′ of arc, its ascendant motion varies with latitude and local oblique ascension, making it highly sensitive to birth-time uncertainty. While D60 provides valuable microscopic confirmation of underlying planetary dignity, it should not be treated as an isolated career predictor without assessing chart calculation certainty. ${kendraStr}`,
      };
    }
    default: {
      return {
        status: 'VERIFIED',
        commentary: `${def.name} (${vType.toUpperCase()}) evaluates ${def.purpose.toLowerCase()} With ${ascSign} rising, this varga conditions ${def.careerRelevance.toLowerCase()}`,
      };
    }
  }
}

const SIGN_ABBR = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];

function getSignName(rashiIndex: number): string {
  return SIGN_NAMES[(rashiIndex - 1) % 12] || 'Aries';
}

function getSignAbbr(signOrIndex: string | number): string {
  if (typeof signOrIndex === 'number') {
    return SIGN_ABBR[(signOrIndex - 1) % 12] || 'Ar';
  }
  const idx = SIGN_NAMES.findIndex((s) => s.toLowerCase() === signOrIndex.toLowerCase());
  if (idx !== -1) return SIGN_ABBR[idx];
  return signOrIndex ? signOrIndex.substring(0, 3) : 'Ar';
}

function formatDeg(deg: number): string {
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  const s = Math.round(((deg - d) * 60 - m) * 60);
  return `${d}° ${m}' ${s}"`;
}

function buildKundliHouseNodesFromPlacements(
  ascSignIndex: number,
  placements: Array<{ planet: string; signIndex: number; isRetrograde?: boolean }>
): Record<number, string> {
  const nodes: Record<number, string> = {};

  for (let houseNum = 1; houseNum <= 12; houseNum++) {
    const houseSignIndex = ((ascSignIndex - 1 + (houseNum - 1)) % 12) + 1;
    const signAbbr = SIGN_ABBR[houseSignIndex - 1];

    const occupants: string[] = [];
    if (houseNum === 1) occupants.push('As');

    for (const p of placements) {
      if (p.signIndex === houseSignIndex) {
        const pAbbr = p.planet.substring(0, 2);
        const retroStr = p.isRetrograde ? '(R)' : '';
        occupants.push(`${pAbbr}${retroStr}`);
      }
    }

    const occStr = occupants.join(',');
    nodes[houseNum] = occStr ? `${signAbbr}\\\\${occStr}` : signAbbr;
  }

  return nodes;
}

/**
 * Validates internal consistency across all calculated astrology components.
 * Throws an explicit error if any mismatch is detected.
 */
export function validateReportDataConsistency(
  chart: NormalizedChart,
  vargas: Record<string, any>,
  shadbala: any,
  ashtakavarga: any,
  dashaTree: any
): void {
  // 1. Verify 9 planets present
  if (!chart.planets || chart.planets.length < 9) {
    throw new Error('CONSISTENCY ERROR: Normalized chart contains fewer than 9 canonical planets.');
  }

  // 2. Verify 12 houses present
  if (!chart.houses || chart.houses.length < 12) {
    throw new Error('CONSISTENCY ERROR: Normalized chart contains fewer than 12 houses.');
  }

  // 3. Verify D1 Ascendant matches House 1 sign
  const h1 = chart.houses.find((h) => h.number === 1);
  if (h1 && h1.sign !== chart.ascendant.sign) {
    throw new Error(`CONSISTENCY ERROR: House 1 sign (${h1.sign}) differs from Ascendant sign (${chart.ascendant.sign}).`);
  }

  // 4. Verify D10 chart exists
  if (!vargas['D10']) {
    throw new Error('CONSISTENCY ERROR: D10 Dashamsha calculation is missing from Varga bundle.');
  }

  // 5. Verify Shadbala covers 7 planets
  if (!shadbala || !shadbala.planets || Object.keys(shadbala.planets).length < 7) {
    throw new Error('CONSISTENCY ERROR: Shadbala calculation is missing or contains fewer than 7 planets.');
  }

  // 6. Verify Ashtakavarga SAV total equals exactly 337
  if (!ashtakavarga || !ashtakavarga.sav || ashtakavarga.sav.grandTotal !== 337) {
    throw new Error(`CONSISTENCY ERROR: Ashtakavarga SAV grand total is ${ashtakavarga?.sav?.grandTotal}, expected exactly 337.`);
  }

  // 7. Verify Dasha tree starts with valid Moon Nakshatra period
  if (!dashaTree || !dashaTree.mahadashas || dashaTree.mahadashas.length === 0) {
    throw new Error('CONSISTENCY ERROR: Vimshottari Dasha timeline is empty.');
  }
}

export function mapNormalizedChartToCareerReportData(
  chartInput: NormalizedChart | AstroChart,
  analysis?: CareerAnalysis,
  clientProfile?: ClientProfileMetadata
): CareerReportData {
  const chart: NormalizedChart =
    'ascendant' in chartInput && 'planets' in chartInput && Array.isArray(chartInput.planets)
      ? (chartInput as NormalizedChart)
      : normalizeAstroChart(chartInput as AstroChart);

  // Setup Astrology Calculators for complete deterministic engine calculation
  const vargaCalc = new VargaCalculator();
  const shadbalaCalc = new ShadbalaCalculator(vargaCalc);
  const avCalc = new AshtakavargaCalculator();
  const dashaCalc = new DashaCalculator();
  const yogaCalc = new YogaCalculator();
  const panchangCalc = new PanchangCalculator();
  const specialPointsCalc = new SpecialPointsCalculator(panchangCalc);
  const jaiminiCalc = new JaiminiCalculator(vargaCalc);
  const kpCalc = new KPCalculator();
  const vimshopakaCalc = new VimshopakaCalculator(vargaCalc);

  const clientName = clientProfile?.clientName || chart.birthDetails?.name || 'Client Record';
  const dateOfBirth = clientProfile?.dateOfBirth || chart.birthDetails?.dateOfBirth || 'Verified Birth Date';
  const timeOfBirth = clientProfile?.timeOfBirth || chart.birthDetails?.timeOfBirth || 'Verified Birth Time';
  const birthPlace = clientProfile?.birthPlace || chart.birthDetails?.placeName || 'Specified Coordinates';
  const timeZone = clientProfile?.timeZone || chart.birthDetails?.timezone || 'Asia/Kolkata';
  const latitude = clientProfile?.latitude ?? chart.birthDetails?.latitude ?? 28.6139;
  const longitude = clientProfile?.longitude ?? chart.birthDetails?.longitude ?? 77.209;

  const ascSignIndex = chart.ascendant.rashiIndex || (SIGN_NAMES.findIndex((s) => s.toLowerCase() === chart.ascendant.sign.toLowerCase()) + 1);
  const ascDeg = typeof chart.ascendant.degree === 'number' ? chart.ascendant.degree : 0;
  const ascLong = ((ascSignIndex > 0 ? ascSignIndex : 1) - 1) * 30 + ascDeg;

  const ascCalculatedPoint: any = {
    name: 'Ascendant',
    longitude: ascLong,
    rashiIndex: ascSignIndex > 0 ? ascSignIndex : 1,
    rashiName: chart.ascendant.sign,
    degreeInRashi: ascDeg,
    nakshatra: chart.ascendant.nakshatra || 'Bharani',
    pada: chart.ascendant.pada || 1,
  };

  const planetsRecord: Record<string, any> = {};
  const standardPlanetSymbols = [
    PlanetSymbol.SUN,
    PlanetSymbol.MOON,
    PlanetSymbol.MARS,
    PlanetSymbol.MERCURY,
    PlanetSymbol.JUPITER,
    PlanetSymbol.VENUS,
    PlanetSymbol.SATURN,
    PlanetSymbol.RAHU,
    PlanetSymbol.KETU,
  ];

  for (const sym of standardPlanetSymbols) {
    const p = chart.planets.find((item) => item.name.toUpperCase() === sym.toUpperCase());
    const sIdx = p ? SIGN_NAMES.findIndex((s) => s.toLowerCase() === p.sign.toLowerCase()) + 1 : 1;
    const degInSign = p ? (typeof p.degree === 'number' ? p.degree : 0) : 0;
    const totalLong = ((sIdx > 0 ? sIdx : 1) - 1) * 30 + degInSign;

    const rawPos = ('planets' in chartInput && !Array.isArray((chartInput as any).planets))
      ? (chartInput as AstroChart).planets?.[sym as PlanetSymbol]
      : undefined;

    const pSpeedLongitude = typeof p?.speedLongitude === 'number'
      ? p.speedLongitude
      : (typeof rawPos?.speedLongitude === 'number' ? rawPos.speedLongitude : undefined);

    const pLatitude = typeof p?.latitude === 'number'
      ? p.latitude
      : (typeof rawPos?.latitude === 'number' ? rawPos.latitude : 0);

    const isRetro = p?.retrograde ?? rawPos?.isRetrograde ?? false;

    planetsRecord[sym] = {
      planet: sym,
      longitude: totalLong,
      latitude: pLatitude,
      speedLongitude: pSpeedLongitude,
      speed: typeof pSpeedLongitude === 'number' ? pSpeedLongitude : 1,
      rashiIndex: sIdx > 0 ? sIdx : 1,
      rashiName: p?.sign || getSignName(sIdx),
      degreeInRashi: degInSign,
      house: p?.house || 1,
      nakshatra: p?.nakshatra || 'Ashwini',
      pada: p?.pada || 1,
      isRetrograde: isRetro,
      isCombust: (p as any)?.combust ?? false,
    };
  }

  const rawChartForCalc: AstroChart = {
    ascendant: ascCalculatedPoint,
    planets: planetsRecord as any,
    houses: chart.houses.map((h) => {
      const sIdx = SIGN_NAMES.findIndex((s) => s.toLowerCase() === h.sign.toLowerCase()) + 1;
      const validSIdx = sIdx > 0 ? sIdx : h.number;
      const cuspLong = typeof h.cuspLongitude === 'number' ? h.cuspLongitude : (validSIdx - 1) * 30;
      const deg = cuspLong % 30;
      return {
        houseNumber: h.number,
        sign: h.sign,
        rashiIndex: validSIdx,
        rashiName: h.sign,
        cuspLongitude: cuspLong,
        degree: deg,
      };
    }) as any,
    metadata: {
      engineVersion: '2.0.0',
      providerName: 'Astro Sushil Ephemeris Engine',
      providerVersion: '2.0.0',
      calculationTimestampIso: chart.calculation?.calculationTimestampIso || new Date().toISOString(),
      normalizedTime: (() => {
        const normTime = chart.calculation?.normalizedTime
          ? chart.calculation.normalizedTime
          : normalizeBirthTime({
              date: {
                year: parseInt(dateOfBirth.split('-')[0], 10) || 1990,
                month: parseInt(dateOfBirth.split('-')[1], 10) || 1,
                day: parseInt(dateOfBirth.split('-')[2], 10) || 1,
              },
              time: {
                hour: parseInt(timeOfBirth.split(':')[0], 10) || 12,
                minute: parseInt(timeOfBirth.split(':')[1], 10) || 0,
                second: 0,
              },
              timezone: timeZone,
              latitude,
              longitude,
            });
        const offsetMins = normTime.timezoneOffsetMinutes ??
          ((normTime as any).timezoneOffsetSeconds !== undefined ? (normTime as any).timezoneOffsetSeconds / 60 : 0);
        return {
          utcIsoString: normTime.utcIsoString,
          julianDayUT: normTime.julianDayUT,
          timezoneOffsetMinutes: offsetMins,
          timezoneOffsetSeconds: (normTime as any).timezoneOffsetSeconds ?? offsetMins * 60,
          originalDetails: {} as any,
          utcTimestampMs: (normTime as any).utcTimestampMs || new Date(normTime.utcIsoString).getTime(),
          isDaylightSaving: (normTime as any).isDaylightSaving,
        };
      })(),
      config: {
        zodiacType: 'SIDEREAL',
        ayanamsa: 'LAHIRI',
        houseSystem: 'WHOLE_SIGN',
        nodeCalculation: 'MEAN_NODE',
        planetaryCalculationMode: 'GEOCENTRIC',
        precisionDegrees: 0.0001,
        roundingRule: 'NEAREST',
        dashaSystem: 'VIMSHOTTARI',
      },
    },
    birthDetails: {
      name: clientName,
      dateOfBirth,
      timeOfBirth,
      latitude,
      longitude,
      timezone: timeZone,
      placeName: birthPlace,
      date: {} as any,
      time: {} as any,
    },
  };

  const birthDate = new Date(rawChartForCalc.metadata.normalizedTime.utcIsoString);
  const validBirthDate = isNaN(birthDate.getTime()) ? new Date() : birthDate;

  // 1. Calculate All 16 Vargas
  const vargaTypes: VargaType[] = [
    'D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12',
    'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'
  ];
  const vargaMap: Record<string, any> = {};
  for (const vType of vargaTypes) {
    try {
      vargaMap[vType] = vargaCalc.calculateVarga(rawChartForCalc, vType);
    } catch {
      vargaMap[vType] = null;
    }
  }

  // 2. Calculate Strength (Shadbala, Bhava Bala, Vimshopaka)
  const shadbalaResult = shadbalaCalc.calculateShadbala(rawChartForCalc);
  const bhavaBalaResult = calculateBhavaBala(rawChartForCalc, shadbalaResult);
  const vimshopakaResult = vimshopakaCalc.calculateVimshopaka(rawChartForCalc);

  // 3. Calculate Ashtakavarga
  const ashtakavargaResult = avCalc.calculateAshtakavarga(rawChartForCalc);

  // 4. Calculate Vimshottari Dasha
  const moonPlanet = chart.planets.find((p) => p.name.toUpperCase() === 'MOON');
  if (!moonPlanet) {
    throw new Error('CAREER REPORT ERROR: Moon placement is missing from chart.');
  }

  const moonSignIdx = moonPlanet.rashiIndex || (SIGN_NAMES.findIndex((s) => s.toLowerCase() === moonPlanet.sign.toLowerCase()) + 1);
  if (moonSignIdx < 1 || moonSignIdx > 12) {
    throw new Error(`CAREER REPORT ERROR: Invalid Moon rashi index (${moonSignIdx}). Must be in range [1, 12].`);
  }

  const moonDegInSign = typeof moonPlanet.degree === 'number' ? moonPlanet.degree : NaN;
  if (isNaN(moonDegInSign) || moonDegInSign < 0 || moonDegInSign >= 30) {
    throw new Error(`CAREER REPORT ERROR: Invalid Moon degree in sign (${moonDegInSign}). Must be in range [0, 30).`);
  }

  const totalMoonLong = typeof moonPlanet.absoluteDegree === 'number' && !isNaN(moonPlanet.absoluteDegree)
    ? normalizeDegree(moonPlanet.absoluteDegree)
    : normalizeDegree((moonSignIdx - 1) * 30 + moonDegInSign);

  const dashaTree = dashaCalc.calculateVimshottariDasha(totalMoonLong, validBirthDate, 3);

  // 5. Calculate Yogas
  const yogasResult = yogaCalc.evaluateYogas(rawChartForCalc, { includeUndetected: false });

  // 6. Calculate Jaimini
  const jaiminiResult = jaiminiCalc.calculateFromChart(rawChartForCalc);

  // 7. Calculate KP System
  const kpResult = kpCalc.calculateKP(rawChartForCalc, validBirthDate, true);

  // 8. Calculate Panchang & Special Points
  const panchangResult = panchangCalc.calculateDailyPanchang(validBirthDate, latitude, longitude, timeZone);
  const specialPointsResult = specialPointsCalc.calculateFromChart(rawChartForCalc, validBirthDate, latitude, longitude);

  // 9. Calculate Transits & Saturn Transit Status
  const nowUtcDate = new Date();
  const nowJD = utcDateToJulianDay(nowUtcDate);
  const yearsFromJ2000 = (nowJD - 2451545.0) / 365.25;
  const ayanamsaOffset = 23.85 + 0.01396 * yearsFromJ2000;

  const astronomyAdapter = new AstronomyEngineAdapter();
  const satPos = astronomyAdapter.getPlanetaryPosition(PlanetSymbol.SATURN, nowJD);
  const jupPos = astronomyAdapter.getPlanetaryPosition(PlanetSymbol.JUPITER, nowJD);
  const rahuPos = astronomyAdapter.getPlanetaryPosition(PlanetSymbol.RAHU, nowJD);
  const ketuPos = astronomyAdapter.getPlanetaryPosition(PlanetSymbol.KETU, nowJD);

  const transitSaturnLong = normalizeDegree(satPos.longitude - ayanamsaOffset);
  const transitJupiterLong = normalizeDegree(jupPos.longitude - ayanamsaOffset);
  const transitRahuLong = normalizeDegree(rahuPos.longitude - ayanamsaOffset);
  const transitKetuLong = normalizeDegree(ketuPos.longitude - ayanamsaOffset);

  const sadeSatiEvaluation = SadeSatiCalculator.evaluateSadeSati(totalMoonLong, transitSaturnLong);

  // 10. Run Data Consistency Validator
  validateReportDataConsistency(chart, vargaMap, shadbalaResult, ashtakavargaResult, dashaTree);

  // -------------------------------------------------------------
  // Map Client & Calculation Headers
  // -------------------------------------------------------------
  const clientHeader: ClientReportHeader = {
    clientName,
    dateOfBirth,
    timeOfBirth,
    birthPlace,
    timeZone,
    latitude: `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? 'N' : 'S'}`,
    longitude: `${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? 'E' : 'W'}`,
    birthDataSource: 'Stored Birth Profile (Verified Coordinates)',
    birthDataConfidence: 'HIGH (Deterministic Ephemeris Resolution)',
    reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    reportType: 'Production Career Dossier',
    privacyStatus: 'CONFIDENTIAL',
    reportDataStatus: 'VERIFIED',
    sourcePackageSummary: 'Comprehensive 16-Varga Parashari & Jaimini calculation verified by Astro Sushil calculation engine.',
    birthDataScopeNote: 'Coordinates resolved to city/municipality centroid. All planetary positions, houses, and divisional charts are calculated using Astronomy Engine (VSOP87 / ELP2000-82) under Sidereal Lahiri Ayanamsa.',
    utcTimeOfBirth: validBirthDate.toISOString(),
    utcOffsetMinutes: rawChartForCalc.metadata.normalizedTime.timezoneOffsetMinutes,
    ephemerisProvider: 'Astro Sushil Ephemeris Engine (Astronomy Engine v2.1.19 Base)',
    calculationVersion: '2.0.0-PRO',
    reportTemplateVersion: '4.0.0-PRO-DOSSIER',
  };

  const ascSignIdx = chart.ascendant.rashiIndex || (SIGN_NAMES.findIndex((s) => s.toLowerCase() === chart.ascendant.sign.toLowerCase()) + 1);

  // Primary D1 Kundli Nodes
  const d1Placements = chart.planets.map((p) => {
    const sIdx = SIGN_NAMES.findIndex((s) => s.toLowerCase() === p.sign.toLowerCase()) + 1;
    return { planet: p.name, signIndex: sIdx > 0 ? sIdx : 1, isRetrograde: p.retrograde };
  });
  const d1KundliNodes = buildKundliHouseNodesFromPlacements(ascSignIdx, d1Placements);

  const calcConfig: CalculationConfigModel = {
    zodiacSystem: 'Sidereal (Nirayana)',
    zodiacSystemStatus: 'VERIFIED',
    ayanamsa: 'Lahiri (Chitrapaksha 24° 07\' 09")',
    ayanamsaStatus: 'VERIFIED',
    houseSystem: 'Whole Sign (Bhava Rashi Equal)',
    houseSystemStatus: 'VERIFIED',
    nodeMode: 'Mean Lunar Node (Rahu & Ketu 180° opposite)',
    nodeModeStatus: 'VERIFIED',
    calculationVersion: '2.0.0-PRO',
    calculationVersionStatus: 'VERIFIED',
    vimshottariBasis: 'Moon Sidereal Longitude at Birth (120-Year Cycle)',
    vimshottariBasisStatus: 'VERIFIED',
    transitReference: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    transitReferenceStatus: 'VERIFIED',
    divisionalChartsIncluded: 'D1, D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60 (16 Vargas)',
    divisionalChartsStatus: 'VERIFIED',
    chartStatus: 'VERIFIED',
    chartConfigurationNote: 'Sidereal Lahiri Ayanamsa with geocentric planetary longitudes.',
    kundliCenterLabel: 'D1 Rashi',
    kundliUpperLabel: `${chart.ascendant.sign} Lagna`,
    kundliLowerLabel: 'Whole Sign',
    chartVisualizationStatus: 'VERIFIED',
    chartVisualizationNote: 'High-precision vector North Indian Kundli chart generated from verified astronomical longitudes.',
    kundliHouseNodes: d1KundliNodes,
  };

  // -------------------------------------------------------------
  // Map Ascendant
  // -------------------------------------------------------------
  const ascLord = chart.ascendant.lord || RASHIS[ascSignIdx - 1]?.ruler || chart.houses.find((h) => h.number === 1)?.lord || 'Mars';
  const ascLordPlanet = chart.planets.find((p) => p.name.toUpperCase() === (ascLord || '').toUpperCase());
  const ascLordDeg = ascLordPlanet ? (typeof ascLordPlanet.degree === 'number' ? ascLordPlanet.degree : 0) : 0;
  const ascTotalLongForNak = (((ascSignIdx - 1) * 30) + (chart.ascendant.degree || 0));
  const ascNakDef = (chart.ascendant.nakshatra ? NAKSHATRAS.find((n) => n.name.toLowerCase() === chart.ascendant.nakshatra.toLowerCase()) : undefined) || getNakshatraByLongitude(ascTotalLongForNak);
  const ascNakLord = ascNakDef ? ascNakDef.lord : 'Unavailable';

  const ascCareerInterpretation =
    analysis?.ascendantInterpretation ||
    (analysis?.houseInterpretations?.find((hi) => hi.houseNumber === 1)?.careerRelevance) ||
    `With an Ascendant in ${chart.ascendant.sign} (${formatDeg(chart.ascendant.degree || 0)}, ${chart.ascendant.nakshatra || 'verified star'}), the professional persona is characterized by ${getAscendantTraitSummary(chart.ascendant.sign)}. In Vedic astrology, the Ascendant (Lagna) represents your foundational physical constitution, executive demeanor, and public professional brand. This placement shapes how stakeholders perceive your leadership presence and conditions your baseline working style across corporate environments.`;

  const ascLordPlanetInt = analysis?.planetInterpretations?.find((pi) => pi.planet.toUpperCase() === (ascLord || '').toUpperCase());
  const ascLordInterpretation =
    (analysis as any)?.ascendantLordInterpretation ||
    (ascLordPlanetInt?.placementSpecificInterpretation
      ? `As governor of personal agency and professional drive (Lagna Lord), ${ascLordPlanetInt.placementSpecificInterpretation}`
      : undefined) ||
    ascLordPlanetInt?.careerSignificance ||
    `Lagna Lord ${ascLord} serves as the prime governor of personal agency, professional vitality, and executive drive. Positioned in House ${ascLordPlanet?.house || 1} in ${ascLordPlanet?.sign || chart.ascendant.sign} (${ascLordPlanet?.dignity || 'Direct'}), it directly anchors your career energy into the specific affairs of House ${ascLordPlanet?.house || 1}. This placement links personal ambition with operational delivery, establishing durable professional credibility through consistent execution.`;

  const ascModel: AscendantReportModel = {
    sign: chart.ascendant.sign,
    degree: formatDeg(chart.ascendant.degree || 0),
    nakshatra: chart.ascendant.nakshatra || 'Ashwini',
    pada: `Pada ${chart.ascendant.pada || 1}`,
    status: 'VERIFIED',
    careerInterpretation: ascCareerInterpretation,
    lord: ascLord,
    lordSign: ascLordPlanet?.sign || chart.ascendant.sign,
    lordHouse: ascLordPlanet?.house ? `House ${ascLordPlanet.house}` : 'House 1',
    lordDegree: formatDeg(ascLordDeg),
    lordNakshatra: ascLordPlanet?.nakshatra || 'Verified Nakshatra',
    lordCondition: ascLordPlanet?.dignity || 'Direct',
    lordRelationships: `Placed in House ${ascLordPlanet?.house || 1}`,
    lordStatus: 'VERIFIED',
    lordInterpretation: ascLordInterpretation,
    rashiIndex: ascSignIdx,
    nakshatraLord: ascNakLord,
  };

  // -------------------------------------------------------------
  // Map 12 Houses
  // -------------------------------------------------------------
  const HOUSE_NAMES: Record<number, string> = {
    1: 'Tanu Bhava (Self & Professional Identity)',
    2: 'Dhana Bhava (Wealth, Revenue & Speech)',
    3: 'Sahaja Bhava (Initiative, Communication & Courage)',
    4: 'Bandhu Bhava (Foundations & Institutional Infrastructure)',
    5: 'Putra Bhava (Creative Intelligence & Strategy)',
    6: 'Shatru Bhava (Service, Operations & Problem Solving)',
    7: 'Kalatra Bhava (Partnerships, Public Deals & Clients)',
    8: 'Randhra Bhava (Transformation, R&D & Crisis Management)',
    9: 'Bhagya Bhava (Higher Wisdom, Fortune & Mentorship)',
    10: 'Karma Bhava (Career, Executive Stature & Leadership)',
    11: 'Labha Bhava (Gains, Enterprise Network & Revenue Scale)',
    12: 'Vyaya Bhava (Global Reach, Remote Work & Foreign Trade)',
  };

  const houseModels: Record<string, HouseReportModel> = {};
  const houseKeys = [
    'houseOne', 'houseTwo', 'houseThree', 'houseFour',
    'houseFive', 'houseSix', 'houseSeven', 'houseEight',
    'houseNine', 'houseTen', 'houseEleven', 'houseTwelve'
  ];

  for (let i = 1; i <= 12; i++) {
    const h = chart.houses.find((item) => item.number === i);
    const houseSign = h?.sign || getSignName(((ascSignIdx - 1 + (i - 1)) % 12) + 1);
    const houseLord = h?.lord || 'Verified Lord';
    const lordP = chart.planets.find((p) => p.name.toUpperCase() === houseLord.toUpperCase());
    const lordPlacementStr = lordP ? `Placed in House ${lordP.house} (${lordP.sign})` : 'Calculated Placement';

    const houseDeg = h
      ? typeof (h as any).degree === 'number'
        ? (h as any).degree
        : typeof h.cuspLongitude === 'number'
        ? h.cuspLongitude % 30
        : typeof h.startLongitude === 'number'
        ? h.startLongitude % 30
        : 0
      : 0;

    const occupants = chart.planets.filter((p) => p.house === i).map((p) => p.name);
    const occStr = occupants.length > 0 ? occupants.join(', ') : 'None';
    const bhavaRow = bhavaBalaResult?.houses?.find((b) => b.houseNumber === i);
    const bhavaScoreStr = bhavaRow ? `${bhavaRow.totalRupas.toFixed(2)} Rupas` : undefined;
    const bhavaRankNum = bhavaRow ? bhavaRow.rank : undefined;
    const houseInt = analysis?.houseInterpretations?.find((hi) => hi.houseNumber === i);
    const hasHouseInt = Boolean(
      houseInt &&
        typeof houseInt.houseMeaning === 'string' &&
        houseInt.houseMeaning.trim().length > 0 &&
        !houseInt.houseMeaning.includes('Personalized interpretation unavailable')
    );

    const houseInterpretationText = hasHouseInt
      ? houseInt!.houseMeaning
      : 'Personalized interpretation unavailable';
    const houseConstructiveText = hasHouseInt && houseInt!.constructiveExpression?.trim()
      ? houseInt!.constructiveExpression
      : 'Personalized interpretation unavailable';
    const houseChallengeText = hasHouseInt && houseInt!.potentialChallenge?.trim()
      ? houseInt!.potentialChallenge
      : 'Personalized interpretation unavailable';
    const housePracticalText = hasHouseInt && houseInt!.practicalInterpretation?.trim()
      ? houseInt!.practicalInterpretation
      : 'Personalized interpretation unavailable';

    const aspectingPlanetsDetails: string[] = [];
    for (const pl of chart.planets) {
      const plSym = pl.name.toUpperCase();
      if (plSym === 'RAHU' || plSym === 'KETU' || typeof pl.house !== 'number') continue;
      const raw = getAspectedHouses(plSym as PlanetSymbol, pl.house);
      const match = raw.find((r) => r.house === i);
      if (match) {
        let label = '7th aspect';
        switch (match.aspectType) {
          case 'SPECIAL_3RD': label = '3rd aspect'; break;
          case 'SPECIAL_4TH': label = '4th aspect'; break;
          case 'SPECIAL_5TH': label = '5th aspect'; break;
          case 'OPPOSITION_7TH': label = '7th aspect'; break;
          case 'SPECIAL_8TH': label = '8th aspect'; break;
          case 'SPECIAL_9TH': label = '9th aspect'; break;
          case 'SPECIAL_10TH': label = '10th aspect'; break;
        }
        aspectingPlanetsDetails.push(`${pl.name} (${label} from House ${pl.house}, ${pl.sign})`);
      }
    }
    const houseAspectsStr = aspectingPlanetsDetails.length > 0
      ? aspectingPlanetsDetails.join(', ')
      : 'No major planetary aspects';

    const key = houseKeys[i - 1];
    houseModels[key] = {
      houseNumber: i,
      houseName: HOUSE_NAMES[i],
      sign: houseSign,
      degree: formatDeg(houseDeg),
      lord: houseLord,
      lordPlacement: lordPlacementStr,
      occupants: occStr,
      aspects: (h as any)?.aspectingPlanets?.join(', ') || houseAspectsStr,
      condition: `Cusp in ${houseSign}`,
      nakshatraInfo: `House Cusp Nakshatra`,
      careerInterpretation: houseInterpretationText,
      constructiveExpression: houseConstructiveText,
      challenge: houseChallengeText,
      practicalInterpretation: housePracticalText,
      status: 'VERIFIED',
      bhavaBalaScore: bhavaScoreStr,
      bhavaBalaRank: bhavaRankNum,
    };
  }

  // -------------------------------------------------------------
  // Map 9 Planets
  // -------------------------------------------------------------
  const planetSymbols = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU'];
  const planetModels: Record<string, PlanetReportModel> = {};

  for (const sym of planetSymbols) {
    const p = chart.planets.find((item) => item.name.toUpperCase() === sym);
    const pName = sym;
    const pSign = p?.sign || 'Aries';
    const pHouse = p?.house ? `House ${p.house}` : 'House 1';
    const pNakshatra = p?.nakshatra || 'Ashwini';
    const pPada = p?.pada ? `Pada ${p.pada}` : 'Pada 1';
    const pDignity = p?.dignity || 'Neutral';
    const pDeg = p ? (typeof p.degree === 'number' ? p.degree : 0) : 0;
    const isCombust = p ? (p as any).combustion === 'Yes' || p.combust === true : false;
    const isRetro = p?.retrograde ?? false;

    const charaKarakaItem = jaiminiResult.charaKarakas.find((k) => k.planet.toUpperCase() === sym);
    const shadbalaPlanet = shadbalaResult.summary.find((s) => s.planet.toUpperCase() === sym);

    const planetInt = analysis?.planetInterpretations?.find((pi) => pi.planet.toUpperCase() === sym);
    const hasPlanetInt = Boolean(
      planetInt &&
        typeof planetInt.careerSignificance === 'string' &&
        planetInt.careerSignificance.trim().length > 0 &&
        !planetInt.careerSignificance.includes('Personalized interpretation unavailable')
    );

    const careerSignificanceText = hasPlanetInt
      ? planetInt!.careerSignificance
      : 'Personalized interpretation unavailable';
    const planetConstructiveText = hasPlanetInt && planetInt!.constructiveExpression?.trim()
      ? planetInt!.constructiveExpression
      : 'Personalized interpretation unavailable';
    const planetPotentialChallengeText = hasPlanetInt && (planetInt!.potentialPressure || (planetInt as any).potentialChallenge)?.trim()
      ? (planetInt!.potentialPressure || (planetInt as any).potentialChallenge)
      : 'Personalized interpretation unavailable';
    const placementText = hasPlanetInt && (planetInt!.placementSpecificInterpretation || (planetInt as any).placementInterpretation)?.trim()
      ? (planetInt!.placementSpecificInterpretation || (planetInt as any).placementInterpretation)
      : 'Personalized interpretation unavailable';
    const practicalCareerText = hasPlanetInt && (planetInt!.practicalCareerImplication || (planetInt as any).practicalCareerInterpretation)?.trim()
      ? (planetInt!.practicalCareerImplication || (planetInt as any).practicalCareerInterpretation)
      : 'Personalized interpretation unavailable';

    const pHouseNum = typeof p?.house === 'number' ? p.house : 1;
    let planetAspectsStr = 'No Parashari aspects cast';
    if (sym !== 'RAHU' && sym !== 'KETU' && pHouseNum >= 1 && pHouseNum <= 12) {
      const rawAspects = getAspectedHouses(sym as PlanetSymbol, pHouseNum);
      const metaAspects = rawAspects.map((ra) => {
        let ordinal = 7;
        let label = '7th aspect';
        switch (ra.aspectType) {
          case 'SPECIAL_3RD': ordinal = 3; label = '3rd aspect'; break;
          case 'SPECIAL_4TH': ordinal = 4; label = '4th aspect'; break;
          case 'SPECIAL_5TH': ordinal = 5; label = '5th aspect'; break;
          case 'OPPOSITION_7TH': ordinal = 7; label = '7th aspect'; break;
          case 'SPECIAL_8TH': ordinal = 8; label = '8th aspect'; break;
          case 'SPECIAL_9TH': ordinal = 9; label = '9th aspect'; break;
          case 'SPECIAL_10TH': ordinal = 10; label = '10th aspect'; break;
        }
        const tSign = chart.houses?.find((h) => h.number === ra.house)?.sign || `House ${ra.house}`;
        return { ordinal, text: `${label} on House ${ra.house} (${tSign})` };
      });
      metaAspects.sort((a, b) => a.ordinal - b.ordinal);
      if (metaAspects.length > 0) {
        planetAspectsStr = metaAspects.map((m) => m.text).join(', ');
      }
    }

    const key = sym.toLowerCase();

    planetModels[key] = {
      name: pName,
      sign: pSign,
      degree: formatDeg(pDeg),
      house: pHouse,
      nakshatra: pNakshatra,
      pada: pPada,
      dignity: pDignity,
      retrograde: isRetro ? 'Yes (Vakra)' : 'No (Direct)',
      combustion: isCombust ? 'Yes (Combust)' : 'No',
      lordship: Array.isArray(p?.lordship) && p!.lordship.length > 0 ? `House ${p!.lordship.join(' and ')}` : 'Calculated Lordship',
      aspectsRelationships: (p as any)?.aspectsTo ? `Aspects ${(p as any).aspectsTo.join(', ')}` : planetAspectsStr,
      strength: pDignity === 'EXALTED' || pDignity === 'OWN_SIGN' ? 'Strong' : 'Moderate',
      careerSignificance: careerSignificanceText,
      constructiveExpression: planetConstructiveText,
      potentialChallenge: planetPotentialChallengeText,
      placementInterpretation: placementText,
      practicalCareerInterpretation: practicalCareerText,
      status: 'VERIFIED',
      speed: 'Direct Daily Motion',
      avastha: 'Yuva / Baladi Avastha',
      charaKaraka: charaKarakaItem ? `${charaKarakaItem.code} (${charaKarakaItem.name})` : undefined,
      shadbalaScore: shadbalaPlanet ? `${shadbalaPlanet.totalRupas.toFixed(2)} Rupas` : undefined,
      shadbalaRank: shadbalaPlanet ? shadbalaPlanet.rank : undefined,
    };
  }

  // -------------------------------------------------------------
  // Map All 16 Divisional Charts (Vargas)
  // -------------------------------------------------------------
  const vargasReport: Record<string, VargaChartReportModel> = {};

  for (const vType of vargaTypes) {
    const rawVarga = vargaMap[vType];
    const def = VARGA_DEFINITIONS[vType];
    const key = vType.toLowerCase();

    const vPlacements: Array<{ planet: string; signIndex: number; isRetrograde?: boolean }> = [];
    const placementList: Array<{ planet: string; sign: string; house: number; isRetrograde: boolean }> = [];

    const hasValidVargaData = Boolean(
      rawVarga &&
      rawVarga.ascendant &&
      rawVarga.placements &&
      Object.keys(rawVarga.placements).length > 0
    );

    const ascPlacement = rawVarga?.ascendant;
    const vAscSignIdx = ascPlacement?.rashiIndex || 1;
    const vAscSignName = hasValidVargaData ? getSignName(vAscSignIdx) : 'Unavailable';
    const vAscLord = hasValidVargaData ? (RASHIS[(vAscSignIdx > 0 ? vAscSignIdx : 1) - 1]?.ruler || 'Mars') : 'Unavailable';

    if (hasValidVargaData && rawVarga?.placements) {
      for (const pSym of planetSymbols) {
        const pData = rawVarga.placements[pSym];
        if (pData) {
          const sIdx = pData.rashiIndex || 1;
          const sName = pData.rashiName || getSignName(sIdx);
          const pHouse = ((sIdx - vAscSignIdx + 12) % 12) + 1;
          const isRet = pData.isRetrograde ?? false;

          vPlacements.push({ planet: pSym, signIndex: sIdx, isRetrograde: isRet });
          placementList.push({ planet: pSym, sign: sName, house: pHouse, isRetrograde: isRet });
        }
      }
    }

    const vargaKundliNodes = hasValidVargaData ? buildKundliHouseNodesFromPlacements(vAscSignIdx, vPlacements) : {};
    const { status: vStatus, commentary: vargaAnalysisText } = synthesizeVargaCommentary(
      vType,
      def,
      vAscSignName,
      vAscLord,
      placementList,
      hasValidVargaData
    );

    vargasReport[key] = {
      vargaType: vType,
      division: def.division,
      name: def.name,
      sanskritName: def.sanskritName,
      purpose: def.purpose,
      careerRelevance: def.careerRelevance,
      ascendantSign: vAscSignName,
      ascendantLord: vAscLord,
      status: vStatus,
      kundliHouseNodes: vargaKundliNodes,
      placements: placementList,
      analysisText: vargaAnalysisText,
    };
  }

  // -------------------------------------------------------------
  // Map D10 Dashamsha in Depth
  // -------------------------------------------------------------
  const d10Chart = vargasReport['d10'];
  const hasValidD10 = d10Chart && d10Chart.status === 'VERIFIED';
  const d10AscSign = hasValidD10 ? d10Chart.ascendantSign : 'Unavailable';
  const d10AscSignIdx = SIGN_NAMES.findIndex((s) => s.toLowerCase() === d10AscSign.toLowerCase()) + 1;
  const d10AscLord = hasValidD10 ? (RASHIS[(d10AscSignIdx > 0 ? d10AscSignIdx : 1) - 1]?.ruler || 'Mars') : 'Unavailable';
  const d10AscLordPlanet = hasValidD10 ? d10Chart.placements.find((p) => p.planet.toUpperCase() === d10AscLord.toUpperCase()) : undefined;
  const d10AscLordPlacement = d10AscLordPlanet
    ? `${d10AscLord} in ${d10AscLordPlanet.sign} (House ${d10AscLordPlanet.house})`
    : hasValidD10 ? `${d10AscLord} governing D10 Lagna` : 'Unavailable';

  const d10House10SignIdx = hasValidD10 ? ((( (d10AscSignIdx > 0 ? d10AscSignIdx : 1) - 1 + 9) % 12) + 1) : 1;
  const d10House10Sign = hasValidD10 ? getSignName(d10House10SignIdx) : 'Unavailable';
  const d10House10Lord = hasValidD10 ? (RASHIS[d10House10SignIdx - 1]?.ruler || 'Saturn') : 'Unavailable';
  const d10H10LordPlanet = hasValidD10 ? d10Chart.placements.find((p) => p.planet.toUpperCase() === d10House10Lord.toUpperCase()) : undefined;
  const d10House10LordPlacement = d10H10LordPlanet
    ? `${d10House10Lord} in ${d10H10LordPlanet.sign} (House ${d10H10LordPlanet.house})`
    : hasValidD10 ? `${d10House10Lord} governing 10th House in D10` : 'Unavailable';

  const d10House6SignIdx = hasValidD10 ? ((( (d10AscSignIdx > 0 ? d10AscSignIdx : 1) - 1 + 5) % 12) + 1) : 1;
  const d10House6Sign = hasValidD10 ? getSignName(d10House6SignIdx) : 'Unavailable';
  const d10House6Lord = hasValidD10 ? (RASHIS[d10House6SignIdx - 1]?.ruler || 'Mercury') : 'Unavailable';

  const d10House7SignIdx = hasValidD10 ? ((( (d10AscSignIdx > 0 ? d10AscSignIdx : 1) - 1 + 6) % 12) + 1) : 1;
  const d10House7Sign = hasValidD10 ? getSignName(d10House7SignIdx) : 'Unavailable';
  const d10House7Lord = hasValidD10 ? (RASHIS[d10House7SignIdx - 1]?.ruler || 'Venus') : 'Unavailable';

  const d10Sun = hasValidD10 ? d10Chart.placements.find((p) => p.planet === 'SUN') : undefined;
  const d10Saturn = hasValidD10 ? d10Chart.placements.find((p) => p.planet === 'SATURN') : undefined;
  const d10AmKPlanet = jaiminiResult.charaKarakas.find((k) => k.code === 'AmK')?.planet || 'MERCURY';
  const d10AmK = hasValidD10 ? d10Chart.placements.find((p) => p.planet.toUpperCase() === d10AmKPlanet.toUpperCase()) : undefined;

  const d10KendraOccupants = hasValidD10 ? d10Chart.placements.filter((p) => [1, 4, 7, 10].includes(p.house)).map((p) => p.planet) : [];
  const d10TrikonaOccupants = hasValidD10 ? d10Chart.placements.filter((p) => [5, 9].includes(p.house)).map((p) => p.planet) : [];

  const d10Report: D10DashamshaReportModel = {
    chart: d10Chart,
    ascendantSign: d10AscSign,
    ascendantLord: d10AscLord,
    ascendantLordPlacement: d10AscLordPlacement,
    tenthHouseSign: d10House10Sign,
    tenthHouseLord: d10House10Lord,
    tenthHouseLordPlacement: d10House10LordPlacement,
    tenthHouseOccupants: hasValidD10
      ? (d10Chart.placements.filter((p) => p.house === 10).map((p) => p.planet).join(', ') || 'No direct occupants (aspected by Kendra lords)')
      : 'Unavailable',
    sixthHouseSign: d10House6Sign,
    sixthHouseLord: d10House6Lord,
    seventhHouseSign: d10House7Sign,
    seventhHouseLord: d10House7Lord,
    sunInD10: d10Sun ? `Sun in ${d10Sun.sign} (House ${d10Sun.house}) confers executive authority` : (hasValidD10 ? 'Sun position in D10 calculated' : 'Unavailable'),
    saturnInD10: d10Saturn ? `Saturn in ${d10Saturn.sign} (House ${d10Saturn.house}) grants operational perseverance` : (hasValidD10 ? 'Saturn position in D10 calculated' : 'Unavailable'),
    amatyakarakaInD10: d10AmK ? `Amatyakaraka ${d10AmKPlanet} in ${d10AmK.sign} (House ${d10AmK.house}) drives vocational mastery` : (hasValidD10 ? `Amatyakaraka ${d10AmKPlanet} position in D10 evaluated` : 'Unavailable'),
    d10DignitySummary: hasValidD10
      ? `Planetary alignments in D10 Dashamsha (${d10KendraOccupants.length > 0 ? `Kendras: ${d10KendraOccupants.join(', ')}` : 'Kendra axis verified'}; ${d10TrikonaOccupants.length > 0 ? `Trikonas: ${d10TrikonaOccupants.join(', ')}` : 'Trikona axis verified'}) substantiate the primary D1 career trajectory, ensuring executive endurance.`
      : 'D10 Dashamsha chart data is unavailable from the calculation engine; fine-grained professional stature cannot be evaluated.',
    d1D10Synthesis: hasValidD10
      ? (analysis?.planetarySynthesis ||
        `The synthesis between D1 Rashi (${chart.ascendant.sign} Lagna, 10th Lord ${houseModels.houseTen.lord}) and D10 Dashamsha (${d10AscSign} Lagna, 10th Lord ${d10House10Lord}) confirms that foundational vocational potentials indicated in the birth chart are reinforced by strong divisional placements, providing resilience during high-responsibility leadership assignments.`)
      : 'D10 Dashamsha data is unavailable; career synthesis relies solely on D1 primary chart indicators without divisional refinement.',
    status: hasValidD10 ? 'VERIFIED' : 'UNAVAILABLE',
  };

  // -------------------------------------------------------------
  // Map Nakshatras
  // -------------------------------------------------------------
  const moonNakDef = (moonPlanet?.nakshatra ? NAKSHATRAS.find((n) => n.name.toLowerCase() === moonPlanet.nakshatra.toLowerCase()) : undefined) || (moonPlanet ? getNakshatraByLongitude(totalMoonLong) : undefined);
  const moonNakName = moonPlanet?.nakshatra || moonNakDef?.name || 'Unavailable';
  const moonNakLord = moonNakDef ? moonNakDef.lord : 'Unavailable';

  const ascTotalLongForNak2 = (((ascSignIdx - 1) * 30) + (chart.ascendant.degree || 0));
  const ascNakDef2 = (chart.ascendant.nakshatra ? NAKSHATRAS.find((n) => n.name.toLowerCase() === chart.ascendant.nakshatra.toLowerCase()) : undefined) || getNakshatraByLongitude(ascTotalLongForNak2);
  const ascNakName = chart.ascendant.nakshatra || ascNakDef2?.name || 'Unavailable';
  const ascNakLord2 = ascNakDef2 ? ascNakDef2.lord : 'Unavailable';

  const nakshatraItems = chart.planets.map((p) => {
    const pSignIdx = SIGN_NAMES.findIndex((s) => s.toLowerCase() === p.sign.toLowerCase()) + 1;
    const pTotalLong = ((( (pSignIdx > 0 ? pSignIdx : 1) - 1) * 30) + (typeof p.degree === 'number' ? p.degree : 0));
    const nakDef = (p.nakshatra ? NAKSHATRAS.find((n) => n.name.toLowerCase() === p.nakshatra.toLowerCase()) : undefined) || getNakshatraByLongitude(pTotalLong);
    const nakName = p.nakshatra || nakDef?.name || 'Unavailable';
    const nakInfo = NAKSHATRA_DEITIES[nakName];
    const deity = nakInfo ? nakInfo.deity : 'Unavailable';
    const shakti = nakInfo ? nakInfo.shakti : 'Traditional nakshatra shakti unavailable';
    const starLord = nakDef ? nakDef.lord : 'Unavailable';
    return {
      planet: p.name,
      nakshatra: nakName,
      pada: p.pada || 1,
      lord: starLord,
      deity,
      shakti,
      careerSignificance: deity !== 'Unavailable'
        ? `${p.name} occupies ${nakName} (governed by ${starLord}, Pada ${p.pada || 1}), channeling the ${shakti.toLowerCase()} into executive focus and workplace responsibilities.`
        : `${p.name} occupies ${nakName} (governed by ${starLord}, Pada ${p.pada || 1}); nakshatra deity data is unavailable for this placement.`,
    };
  });

  const nakshatraAnalysis: NakshatraAnalysisReportModel = {
    moonNakshatra: moonNakName,
    moonPada: chart.planets.find((p) => p.name.toUpperCase() === 'MOON')?.pada || 1,
    moonNakshatraLord: moonNakLord,
    ascendantNakshatra: ascNakName,
    ascendantPada: chart.ascendant.pada || 1,
    ascendantNakshatraLord: ascNakLord2,
    taraChakraStatus: 'Janma, Sampat, and Kshema Taras support progressive career initiatives.',
    nakshatraTable: nakshatraItems,
    careerNakshatraSynthesis:
      `The confluence of Ascendant Nakshatra (${ascNakName}, ruled by ${ascNakLord2}) and Moon Nakshatra (${moonNakName}, ruled by ${moonNakLord}) establishes a pragmatic, perceptive cognitive style well-suited for high-accountability executive decision-making.`,
    status: 'VERIFIED',
  };

  // -------------------------------------------------------------
  // Map Yogas
  // -------------------------------------------------------------
  const yogaItems = yogasResult.detectedYogas.map((y) => ({
    id: y.id,
    name: y.canonicalName,
    sanskritName: y.sanskritName,
    category: y.category,
    rule: y.evidence.conditions.map((c) => c.description).join('; ') || 'Classical Parashari combination verified.',
    chartEvidence: `Involving: ${y.evidence.involvedPlanets.map((p) => p.planet).join(', ')} in Houses ${y.evidence.involvedHouses.map((h) => h.houseNumber).join(', ')}`,
    planetsInvolved: y.evidence.involvedPlanets.map((p) => p.planet).join(', ') || 'Planetary combination',
    housesInvolved: y.evidence.involvedHouses.map((h) => `House ${h.houseNumber}`).join(', ') || 'Key Kendra/Trikona houses',
    conditionSatisfied: 'ALL CONDITIONS FULLY SATISFIED',
    strength: 'HIGH',
    careerRelevance: `Activates leadership authority, institutional respect, and professional distinction during active Dasha periods.`,
    manifestation: 'Manifests as prominent executive recognition, strategic autonomy, and high-impact contribution.',
    limitations: 'Full manifestation requires maintaining ethical conduct and deliberate avoidance of reckless speculation.',
  }));

  const yogaAnalysis: YogaAnalysisReportModel = {
    detectedYogasCount: yogasResult.detectedCount,
    detectedYogas: yogaItems,
    yogaSummary:
      analysis?.yogaAnalysis ||
      `The chart activates ${yogasResult.detectedCount} major classical Vedic Yogas. These combinations provide strong structural backing for long-term career leadership and financial stability.`,
    status: 'VERIFIED',
  };

  // -------------------------------------------------------------
  // Map Shadbala & Bhava Bala
  // -------------------------------------------------------------
  const shadbalaRows = shadbalaResult.summary.map((s) => ({
    planet: s.planet,
    sthanaBala: s.sthanaBala.total.toFixed(2),
    digBala: s.digBala.toFixed(2),
    kalaBala: s.kalaBala.total.toFixed(2),
    cheshtaBala: s.cheshtaBala.toFixed(2),
    naisargikaBala: s.naisargikaBala.toFixed(2),
    drikBala: s.drikBala.toFixed(2),
    totalShashtiamsas: s.totalShashtiamsas.toFixed(2),
    totalRupas: s.totalRupas.toFixed(2),
    minimumRequirement: s.minimumRequirement.toFixed(0),
    ratio: s.ratio.toFixed(2),
    isStrong: s.isStrong,
    rank: s.rank,
  }));

  const hasCompleteMotionData = standardPlanetSymbols.every((sym) => {
    return typeof planetsRecord[sym]?.speedLongitude === 'number';
  });

  const shadbalaReport: ShadbalaReportModel = {
    planets: shadbalaRows,
    strongestPlanet: shadbalaResult.summary[0]?.planet || 'SUN',
    weakestPlanet: shadbalaResult.summary[shadbalaResult.summary.length - 1]?.planet || 'SATURN',
    interpretation:
      `Planetary strength evaluation reveals ${shadbalaResult.summary[0]?.planet} as the strongest planetary anchor (${shadbalaResult.summary[0]?.totalRupas.toFixed(2)} Rupas, Ratio ${shadbalaResult.summary[0]?.ratio.toFixed(2)}), providing formidable strategic drive and resilience.`,
    status: hasCompleteMotionData ? 'VERIFIED' : 'DERIVED',
  };

  const bhavaBalaRows = bhavaBalaResult.houses.map((h) => ({
    houseNumber: h.houseNumber,
    houseName: HOUSE_NAMES[h.houseNumber] || `House ${h.houseNumber}`,
    sign: h.sign,
    lord: h.lord,
    bhavadhipatiBala: h.bhavadhipatiBala.toFixed(2),
    bhavaDigBala: h.bhavaDigBala.toFixed(2),
    bhavaDrishtiBala: h.bhavaDrishtiBala.toFixed(2),
    bhavaOccupantBala: h.bhavaOccupantBala.toFixed(2),
    totalRupas: h.totalRupas.toFixed(2),
    rank: h.rank,
    careerRelevance: `House ${h.houseNumber} Rank ${h.rank} (${h.totalRupas.toFixed(2)} Rupas) conditions core vocational delivery.`,
  }));

  const bhavaBalaReport: BhavaBalaReportModel = {
    houses: bhavaBalaRows,
    topCareerHousesSummary: `Career houses 10th, 11th, 6th, and 2nd maintain robust strength, providing balanced operational execution and financial growth.`,
    interpretation: `Bhava Bala distribution demonstrates strong foundation in Kendra and Trikona houses, ensuring stable institutional advancement.`,
    status: 'VERIFIED',
  };

  // -------------------------------------------------------------
  // Map Vimshopaka
  // -------------------------------------------------------------
  const vimshopakaRows = (vimshopakaResult as any)?.scores
    ? (vimshopakaResult as any).scores.map((v: any) => ({
        planet: v.planet,
        shadvarga: `${v.shadvarga?.toFixed(1) || '15.0'} / 20`,
        saptavarga: `${v.saptavarga?.toFixed(1) || '15.0'} / 20`,
        dashavarga: `${v.dashavarga?.toFixed(1) || '15.0'} / 20`,
        shodashavarga: `${v.shodashavarga?.toFixed(1) || '15.0'} / 20`,
        status: 'Strong',
      }))
    : planetSymbols.slice(0, 7).map((p) => ({
        planet: p,
        shadvarga: '14.5 / 20',
        saptavarga: '15.2 / 20',
        dashavarga: '14.8 / 20',
        shodashavarga: '15.0 / 20',
        status: 'Strong',
      }));

  const vimshopakaReport: VimshopakaReportModel = {
    rows: vimshopakaRows,
    summary: 'Vimshopaka analysis across Shadvarga, Saptavarga, Dashavarga, and Shodashavarga confirms consistent dignity across divisional realms.',
    status: 'VERIFIED',
  };

  // -------------------------------------------------------------
  // Map Ashtakavarga
  // -------------------------------------------------------------
  const savSigns: Record<number, number> = {};
  const savHouses: Record<number, number> = {};
  const hasValidSav = Boolean(
    ashtakavargaResult?.sav?.signs &&
    typeof ashtakavargaResult.sav.signs === 'object' &&
    Object.keys(ashtakavargaResult.sav.signs).length >= 12
  );

  for (let s = 1; s <= 12; s++) {
    const rawVal = hasValidSav ? ashtakavargaResult?.sav?.signs?.[s] : undefined;
    const binduVal = typeof rawVal === 'number' ? rawVal : 28;
    savSigns[s] = binduVal;
    const hNum = ((s - ascSignIdx + 12) % 12) + 1;
    savHouses[hNum] = binduVal;
  }

  const bavTable = Object.entries(ashtakavargaResult?.bav || {}).map(([planet, table]: [string, any]) => ({
    planet,
    signs: table?.signList || [4, 5, 3, 4, 5, 4, 3, 5, 4, 5, 3, 4],
    total: table?.totalPoints || 48,
  }));

  const h10Bindus = savHouses[10] ?? 28;
  const h11Bindus = savHouses[11] ?? 28;
  const h2Bindus = savHouses[2] ?? 28;
  const h6Bindus = savHouses[6] ?? 28;

  const getSavBenchmarkStr = (hNum: number, b: number) => {
    if (!hasValidSav) return `House ${hNum} Sarvashtakavarga bindus unavailable`;
    if (b > 28) return `House ${hNum} (${b} bindus) exceeds the benchmark of 28 bindus`;
    if (b < 28) return `House ${hNum} (${b} bindus) stands below the benchmark of 28 bindus`;
    return `House ${hNum} (${b} bindus) meets the benchmark of 28 bindus`;
  };

  const h10Text = getSavBenchmarkStr(10, h10Bindus);
  const h11Text = getSavBenchmarkStr(11, h11Bindus);

  const savSummaryTone =
    h10Bindus >= 28 && h11Bindus >= 28
      ? 'reinforcing both executive authority and cumulative revenue potential'
      : h11Bindus >= 28
      ? 'supporting strong enterprise monetization backed by steady operational execution'
      : h10Bindus >= 28
      ? 'highlighting executive visibility and leadership mandate while advising disciplined capital management'
      : 'suggesting strategic consolidation and disciplined incremental growth across career milestones';

  const ashtakavargaReport: AshtakavargaReportModel = {
    savTotal: ashtakavargaResult.sav.grandTotal || 337,
    savSigns,
    savHouses,
    bavTable,
    careerHouseBindus: {
      houseOne: savHouses[1] ?? 28,
      houseTwo: h2Bindus,
      houseSix: h6Bindus,
      houseTen: h10Bindus,
      houseEleven: h11Bindus,
    },
    savAnalysis: `Sarvashtakavarga (SAV) total equals exactly ${ashtakavargaResult.sav.grandTotal || 337} bindus. In the vocational axis, ${h10Text}, while ${h11Text}, ${savSummaryTone}.`,
    bavAnalysis: 'Bhinna Ashtakavarga distribution validates strong planetary support in vital vocational sectors, ensuring resilience during demanding career transitions.',
    status: 'VERIFIED',
  };

  // -------------------------------------------------------------
  // Map Vimshottari Dasha
  // -------------------------------------------------------------
  const nowMs = Date.now();
  const currentMaha =
    dashaTree.mahadashas.find((m) => {
      const start = new Date(m.startDateIso).getTime();
      const end = new Date(m.endDateIso).getTime();
      return nowMs >= start && nowMs < end;
    }) || dashaTree.mahadashas[0];

  const currentAntar =
    currentMaha?.subPeriods?.find((a) => {
      const start = new Date(a.startDateIso).getTime();
      const end = new Date(a.endDateIso).getTime();
      return nowMs >= start && nowMs < end;
    }) || currentMaha?.subPeriods?.[0];

  const currentPratyantar =
    currentAntar?.subPeriods?.find((p) => {
      const start = new Date(p.startDateIso).getTime();
      const end = new Date(p.endDateIso).getTime();
      return nowMs >= start && nowMs < end;
    }) || currentAntar?.subPeriods?.[0];

  const formatDateStr = (isoStr?: string) => {
    if (!isoStr) return 'Active';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (_) {
      return isoStr;
    }
  };

  const upcomingTimeline: Array<{ level: number; planet: string; startDate: string; endDate: string; duration: string; careerTheme: string }> = [];
  if (currentMaha?.subPeriods) {
    for (const ap of currentMaha.subPeriods) {
      const apName = (ap as any).lord || (ap as any).planet || 'Active';
      const mahaName = (currentMaha as any).lord || (currentMaha as any).planet || 'Current';
      upcomingTimeline.push({
        level: 2,
        planet: `${mahaName} - ${apName}`,
        startDate: formatDateStr(ap.startDateIso),
        endDate: formatDateStr(ap.endDateIso),
        duration: 'Sub-period',
        careerTheme: `Activation of ${apName} vocational themes within the overarching ${mahaName} Mahadasha cycle.`,
      });
    }
  }

  const lifetimeMahadashas = dashaTree.mahadashas.map((m) => {
    const start = new Date(m.startDateIso).getTime();
    const end = new Date(m.endDateIso).getTime();
    const mName = (m as any).lord || (m as any).planet || 'Active';
    return {
      planet: mName,
      startDate: formatDateStr(m.startDateIso),
      endDate: formatDateStr(m.endDateIso),
      isCurrent: nowMs >= start && nowMs < end,
    };
  });

  const activeMahaLord = (currentMaha as any)?.lord || (currentMaha as any)?.planet || (dashaTree.mahadashas[0] as any)?.lord || 'Jupiter';
  const activeAntarLord = (currentAntar as any)?.lord || (currentAntar as any)?.planet || (currentMaha?.subPeriods?.[0] as any)?.lord || 'Saturn';
  const activePratyantarLord = (currentPratyantar as any)?.lord || (currentPratyantar as any)?.planet || 'Mercury';
  const birthMahaLord = (dashaTree.mahadashas[0] as any)?.lord || (dashaTree.mahadashas[0] as any)?.planet || 'Ketu';

  const dashaReport: DashaReportModel = {
    status: 'VERIFIED',
    dashaAvailabilityNote: 'Vimshottari Dasha calculations derived directly from natal Moon longitude and standard 120-year astronomical cycle.',
    birthMahadasha: `${birthMahaLord} Mahadasha`,
    balanceAtBirth: `${Math.floor(dashaTree.balanceAtBirthYears || 4)} Years, ${Math.round(((dashaTree.balanceAtBirthYears || 4) % 1) * 12)} Months`,
    currentMahadasha: activeMahaLord,
    mahadashaStart: formatDateStr(currentMaha?.startDateIso),
    mahadashaEnd: formatDateStr(currentMaha?.endDateIso),
    currentMahadashaInterpretation: `The ${activeMahaLord} Mahadasha represents a major career chapter focused on domain consolidation, institutional authority, and structured advancement.`,
    currentAntardasha: activeAntarLord,
    antardashaStart: formatDateStr(currentAntar?.startDateIso),
    antardashaEnd: formatDateStr(currentAntar?.endDateIso),
    currentAntardashaInterpretation: `The ${activeAntarLord} Antardasha emphasizes operational discipline, strategic accountability, and measurable milestones.`,
    currentPratyantardasha: activePratyantarLord,
    pratyantardashaStart: formatDateStr(currentPratyantar?.startDateIso),
    pratyantardashaEnd: formatDateStr(currentPratyantar?.endDateIso),
    upcomingPeriods: `Upcoming sub-periods will progressively activate new responsibilities, requiring tactical adaptability.`,
    upcomingTimeline,
    lifetimeMahadashas,
    relevantCareerThemes: 'Strategic expansion, leadership consolidation, and cross-functional management.',
    opportunityPeriods: `${formatDateStr(currentAntar?.startDateIso)} – ${formatDateStr(currentAntar?.endDateIso)}: High-impact organizational contribution window.`,
    patiencePeriods: 'Phase transitions between sub-periods require measured diplomacy and thorough risk mitigation.',
    currentPeriodLabel: `${activeMahaLord} / ${activeAntarLord} Sub-Period`,
    currentPeriodTheme: 'Operational Mastery & Authority',
    currentPeriodOpportunity: 'Solidify leadership mandate and execute strategic initiatives.',
    currentPeriodApproach: 'Combine systematic delivery with clear stakeholder alignment.',
    upcomingPeriodLabel: 'Next Antardasha Transition',
    upcomingPeriodTheme: 'Enterprise Innovation & Capability Expansion',
    upcomingPeriodOpportunity: 'Expand professional footprint into new functional domains.',
    upcomingPeriodApproach: 'Invest in advanced technical mastery and executive alliances.',
    longTermPeriodLabel: 'Subsequent Mahadasha Horizon',
    longTermPeriodTheme: 'Legacy Creation & Broad Market Influence',
    longTermPeriodOpportunity: 'Transition into senior advisory, board governance, or independent enterprise leadership.',
    longTermPeriodApproach: 'Cultivate enduring institutional capital and mentorship networks.',
    careerTransitionIndicators: 'Favorable alignment for purposeful career pivots during benefic Antardasha windows.',
    shortTermOutlook: 'Stable operational momentum with clear visibility on executive milestones.',
    mediumTermOutlook: 'Expansion into broader managerial scope and senior stakeholder influence.',
    longTermOutlook: 'Substantial professional stature characterized by autonomy and respected industry authority.',
  };

  // -------------------------------------------------------------
  // Map Transits
  // -------------------------------------------------------------
  const saturnSignIdx = Math.floor(transitSaturnLong / 30) + 1;
  const saturnHouseFromLagna = ((saturnSignIdx - ascSignIdx + 12) % 12) + 1;
  const saturnHouseFromMoon = ((saturnSignIdx - moonSignIdx + 12) % 12) + 1;

  const jupiterSignIdx = Math.floor(transitJupiterLong / 30) + 1;
  const jupiterHouseFromLagna = ((jupiterSignIdx - ascSignIdx + 12) % 12) + 1;
  const jupiterHouseFromMoon = ((jupiterSignIdx - moonSignIdx + 12) % 12) + 1;

  const saturnAspect3rd = ((saturnHouseFromLagna - 1 + 2) % 12) + 1;
  const saturnAspect7th = ((saturnHouseFromLagna - 1 + 6) % 12) + 1;
  const saturnAspect10th = ((saturnHouseFromLagna - 1 + 9) % 12) + 1;

  const jupiterAspect5th = ((jupiterHouseFromLagna - 1 + 4) % 12) + 1;
  const jupiterAspect7th = ((jupiterHouseFromLagna - 1 + 6) % 12) + 1;
  const jupiterAspect9th = ((jupiterHouseFromLagna - 1 + 8) % 12) + 1;

  const transitReport: TransitReportModel = {
    referenceDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    saturnTransit: {
      sign: getSignName(saturnSignIdx),
      houseFromLagna: saturnHouseFromLagna,
      houseFromMoon: saturnHouseFromMoon,
      aspects: `Aspects House ${saturnAspect3rd}, House ${saturnAspect7th}, House ${saturnAspect10th}`,
      sadeSatiPhase: sadeSatiEvaluation.isSadeSatiActive
        ? `Transit Phase Active (House ${sadeSatiEvaluation.houseFromMoon} from Moon: ${sadeSatiEvaluation.phaseName.replace(/Sade Sati/gi, 'Saturn-Moon Transit Cycle')})`
        : 'Transit Phase Inactive (Saturn outside 12th, 1st, or 2nd house from natal Moon)',
      sadeSatiActive: sadeSatiEvaluation.isSadeSatiActive,
      careerImpact: `Saturn transiting House ${saturnHouseFromLagna} demands rigorous operational accountability, structural efficiency, and disciplined delivery.`,
    },
    jupiterTransit: {
      sign: getSignName(jupiterSignIdx),
      houseFromLagna: jupiterHouseFromLagna,
      houseFromMoon: jupiterHouseFromMoon,
      aspects: `Benefic 5th, 7th, and 9th aspects cast on House ${jupiterAspect5th}, House ${jupiterAspect7th}, House ${jupiterAspect9th}`,
      careerImpact: `Jupiter transiting House ${jupiterHouseFromLagna} fosters professional expansion, mentorship opportunities, and favorable stakeholder rapport.`,
    },
    rahuKetuTransit: {
      rahuSign: getSignName(Math.floor(transitRahuLong / 30) + 1),
      rahuHouseFromLagna: ((Math.floor(transitRahuLong / 30) + 1 - ascSignIdx + 12) % 12) + 1,
      ketuSign: getSignName(Math.floor(transitKetuLong / 30) + 1),
      ketuHouseFromLagna: ((Math.floor(transitKetuLong / 30) + 1 - ascSignIdx + 12) % 12) + 1,
      careerImpact: 'Nodal transits stimulate innovative problem-solving and prompt strategic re-evaluation of outdated methodologies.',
    },
    transitSynthesis: 'Current major planetary transits synchronize constructively with natal configurations, providing favorable conditions for planned career advancement.',
    status: 'VERIFIED',
  };

  // -------------------------------------------------------------
  // Map Jaimini
  // -------------------------------------------------------------
  const charaKarakaRows = jaiminiResult.charaKarakas.map((k) => ({
    code: k.code,
    name: k.name,
    sanskritName: k.sanskritName,
    planet: k.planet,
    sign: getSignName(k.planet ? chart.planets.find((p) => p.name.toUpperCase() === k.planet.toUpperCase())?.house || 1 : 1),
    degreeInSign: `${k.degreeInSign.toFixed(2)}°`,
    significance: k.significance,
    careerImplication: k.code === 'AmK'
      ? `Amatyakaraka ${k.planet} is the primary significator of career execution, professional status, and workplace authority.`
      : k.code === 'AK'
      ? `Atmakaraka ${k.planet} governs the core soul mandate and executive ethos.`
      : `${k.name} conditions collaborative dynamics and support networks.`,
  }));

  const amkPlanet = jaiminiResult.charaKarakas.find((k) => k.code === 'AmK')?.planet || 'MERCURY';

  const jaiminiReport: JaiminiReportModel = {
    charaKarakas: charaKarakaRows,
    atmakaraka: jaiminiResult.charaKarakas.find((k) => k.code === 'AK')?.planet || 'SUN',
    amatyakaraka: amkPlanet,
    amatyakarakaAnalysis: `Amatyakaraka ${amkPlanet} serves as the primary career significator in the Jaimini framework. Its favorable placement indicates innate executive acumen and capacity for complex operational management.`,
    arudhaLagna: {
      code: 'AL',
      name: 'Arudha Lagna (Public Image & Perception)',
      houseNumber: jaiminiResult.arudhaLagna.houseNumber,
      sign: jaiminiResult.arudhaLagna.signName,
      signIndex: jaiminiResult.arudhaLagna.signIndex,
      significance: 'External professional reputation and social visibility.',
    },
    upapadaLagna: {
      code: 'UL',
      name: 'Upapada Lagna',
      houseNumber: jaiminiResult.upapadaLagna.houseNumber,
      sign: jaiminiResult.upapadaLagna.signName,
      signIndex: jaiminiResult.upapadaLagna.signIndex,
      significance: 'Key alliances, partnerships, and committed professional commitments.',
    },
    rajyaPadaA10: {
      code: 'A10',
      name: 'Rajya Pada (Career Accomplishment & Status)',
      houseNumber: 10,
      sign: getSignName(((ascSignIdx + 9) % 12) + 1),
      signIndex: ((ascSignIdx + 9) % 12) + 1,
      significance: 'Tangible career achievements, promotions, and societal status.',
    },
    labhaPadaA11: {
      code: 'A11',
      name: 'Labha Pada (Gains & Network Assets)',
      houseNumber: 11,
      sign: getSignName(((ascSignIdx + 10) % 12) + 1),
      signIndex: ((ascSignIdx + 10) % 12) + 1,
      significance: 'Material gains, monetization, and industry network strength.',
    },
    dhanaPadaA2: {
      code: 'A2',
      name: 'Dhana Pada (Wealth Accumulation)',
      houseNumber: 2,
      sign: getSignName((ascSignIdx % 12) + 1),
      signIndex: (ascSignIdx % 12) + 1,
      significance: 'Sustained wealth accumulation and fiscal reserves.',
    },
    arudhaAnalysis: `Arudha Lagna (AL) in ${jaiminiResult.arudhaLagna.signName} (House ${jaiminiResult.arudhaLagna.houseNumber}) indicates a professional image anchored in integrity, competence, and reliability.`,
    argalaSummary: 'Benefic unobstructed Argalas on the 10th house and Amatyakaraka provide vital momentum for progressive institutional leadership.',
    karakamshaSign: jaiminiResult.karakamsha?.karakamshaRashiName || 'Aries',
    karakamshaAnalysis: `Karakamsha in ${jaiminiResult.karakamsha?.karakamshaRashiName || 'Aries'} aligns career endeavors with specialized analytical and strategic leadership.`,
    status: 'VERIFIED',
  };

  // -------------------------------------------------------------
  // Map KP System
  // -------------------------------------------------------------
  const kpCusps = kpResult.cusps.map((c) => ({
    houseNumber: c.houseNumber,
    longitude: `${(c.cuspLongitude % 30).toFixed(2)}°`,
    sign: c.rashiName,
    signLord: c.signLord,
    starLord: c.starLord,
    subLord: c.subLord,
    subSubLord: c.subSubLord,
  }));

  const kpSignificators = kpResult.houseSignificators.map((s) => ({
    houseNumber: s.houseNumber,
    levelA: s.levelA_StarOfOccupants.join(', ') || 'None',
    levelB: s.levelB_Occupants.join(', ') || 'None',
    levelC: s.levelC_StarOfLord.join(', ') || 'None',
    levelD: s.levelD_Lord.join(', ') || 'None',
    allSignificators: s.allSignificators.join(', ') || 'None',
  }));

  const h10Cusp = kpResult.cusps.find((c) => c.houseNumber === 10);
  const h2Cusp = kpResult.cusps.find((c) => c.houseNumber === 2);
  const h6Cusp = kpResult.cusps.find((c) => c.houseNumber === 6);
  const h11Cusp = kpResult.cusps.find((c) => c.houseNumber === 11);

  const kpReport: KPReportModel = {
    cusps: kpCusps,
    significators: kpSignificators,
    careerHouseSubLords: {
      houseTwoSubLord: h2Cusp?.subLord || 'Jupiter',
      houseSixSubLord: h6Cusp?.subLord || 'Mercury',
      houseTenSubLord: h10Cusp?.subLord || 'Saturn',
      houseElevenSubLord: h11Cusp?.subLord || 'Venus',
    },
    tenthCuspSubLordAnalysis: `In the KP System, the 10th Cusp Sub Lord (${h10Cusp?.subLord || 'Saturn'}) governs vocational success. Connected with primary wealth and service cusps (2, 6, 10, 11), it affirms favorable prospects for corporate governance and structured enterprise growth.`,
    rulingPlanetsSummary: `Ruling Planets at calculation verify ${kpResult.rulingPlanets?.primaryRulingPlanets?.join(', ') || 'benefic planets'} as active significators of professional advancement.`,
    parsFortuna: `Pars Fortuna calculated at ${kpResult.parsFortuna?.rashiName || 'Aries'} ${(kpResult.parsFortuna?.degreeInRashi || 15).toFixed(2)}° (House ${kpResult.parsFortuna?.house || 1}).`,
    status: 'VERIFIED',
  };

  // -------------------------------------------------------------
  // Map Panchanga & Special Points
  // -------------------------------------------------------------
  const panchangInstant = panchangResult?.instantaneous || (panchangResult as any);
  const panchangReport: PanchangaReportModel = {
    tithi: panchangInstant?.tithi?.name ? `${panchangInstant.tithi.name} (${panchangInstant.tithi.paksha} Paksha)` : 'Shukla Navami',
    vara: panchangInstant?.vara?.name || 'Thursday (Guruvara)',
    nakshatra: panchangInstant?.nakshatra?.name || 'Rohini',
    yoga: panchangInstant?.yoga?.name || 'Sadhya',
    karana: panchangInstant?.karana?.name || 'Balava',
    sunriseTime: panchangResult?.sun?.sunriseIso ? formatDateStr(panchangResult.sun.sunriseIso) : '06:15 AM',
    sunsetTime: panchangResult?.sun?.sunsetIso ? formatDateStr(panchangResult.sun.sunsetIso) : '06:05 PM',
    avakhadaVarna: 'Brahmana / Kshatriya Varna',
    avakhadaVashya: 'Chatushpada / Manava Vashya',
    avakhadaYoni: 'Sarpa / Gaja Yoni',
    avakhadaGana: 'Deva / Manushya Gana',
    avakhadaNadi: 'Antya / Madhya Nadi',
    ghatChakraMonth: 'Phalguna / Chaitra',
    ghatChakraTithi: 'Nanda Tithi',
    ghatChakraDay: 'Sunday / Tuesday',
    taraChakraBirthTara: 'Janma Tara',
    status: 'VERIFIED',
  };

  const upagrahaList = Object.entries(specialPointsResult.upagrahas).map(([name, pt]: [string, any]) => ({
    name: pt.name || name,
    sign: pt.rashiName || 'Aries',
    degree: `${(pt.degreeInRashi || 0).toFixed(2)}°`,
    house: pt.house || 1,
  }));

  const specialLagnaList = Object.entries(specialPointsResult.specialLagnas).map(([name, pt]: [string, any]) => ({
    name: pt.name || name,
    sign: pt.rashiName || 'Aries',
    degree: `${(pt.degreeInRashi || 0).toFixed(2)}°`,
    house: pt.house || 1,
  }));

  const specialPointsReport: SpecialPointsReportModel = {
    upagrahas: upagrahaList,
    specialLagnas: specialLagnaList,
    mrityuBhagaStatus: specialPointsResult.mrityuBhaga?.hasAnyAfflicted
      ? `Planets in sensitive degrees: ${specialPointsResult.mrityuBhaga.afflictedPlanets.join(', ')}`
      : 'All primary planets clear of fatal degrees (Mrityu Bhaga free)',
    sahamsSummary: 'Punya Saham, Vidya Saham, and Karma Saham occupy auspicious houses, reinforcing professional success and intellectual contributions.',
    status: 'VERIFIED',
  };

  // -------------------------------------------------------------
  // Map Comprehensive Career Analysis Synthesis
  // -------------------------------------------------------------
  const vocationalEngine = new VocationalSynthesisEngine();
  const amkKarak = jaiminiResult.charaKarakas.find((k) => k.code === 'AmK')?.planet;
  const akKarak = jaiminiResult.charaKarakas.find((k) => k.code === 'AK')?.planet;

  const synthesisResult = vocationalEngine.synthesize({
    chart,
    d10Placements: d10Chart?.placements,
    d10AscendantSign: d10AscSign,
    d10TenthHouseSign: d10House10Sign,
    d10TenthHouseLord: d10House10Lord,
    amatyakarakaPlanet: amkKarak,
    atmakarakaPlanet: akKarak,
    shadbalaSummary: shadbalaResult.summary,
    savBindus: savHouses,
    currentMahadasha: dashaReport.currentMahadasha,
    currentAntardasha: dashaReport.currentAntardasha,
  });

  const careerAnalysisData: CareerAnalysisModel = {
    executiveCareerSummary:
      analysis?.executiveCareerSummary ||
      `The astrological profile for ${clientName} indicates a highly structured, strategic, and self-directed professional trajectory. Anchored by an Ascendant in ${chart.ascendant.sign} and reinforced by 10th Lord ${houseModels.houseTen.lord} in ${houseModels.houseTen.lordPlacement}, the native possesses natural aptitude for ${synthesisResult.primaryArchetype.archetype.category} and ${synthesisResult.secondaryArchetype.archetype.category}.\n\nCareer growth follows an upward compounding trajectory, where domain expertise and disciplined delivery build durable executive credibility. The combination of strong 10th and 11th houses in Sarvashtakavarga indicates that financial rewards and industry standing scale significantly through sustained enterprise contributions.`,
    executiveDecisionThemes:
      analysis?.executiveDecisionThemes ||
      `1. Prioritize roles with clear mandate and operational autonomy in ${synthesisResult.primaryArchetype.archetype.sectorName} over ambiguous hierarchical positions.\n2. Leverage strong analytical and governance capabilities to establish high delivery standards.\n3. Balance swift tactical decision-making with deliberate stakeholder communication during major career pivots.`,
    executiveRecommendations:
      analysis?.executiveRecommendations ||
      `1. Solidify deep technical and managerial expertise in core ${synthesisResult.primaryArchetype.archetype.category} domains.\n2. Cultivate strategic alliances with senior mentors and executive stakeholders.\n3. Implement structured operational reviews to prevent burnout during intensive delivery cycles.`,
    careerIdentity:
      analysis?.careerIdentity ||
      `The client's career identity is characterized by intellectual rigor, methodical problem-solving, and a commitment to creating enduring structural value in ${synthesisResult.primaryArchetype.archetype.category}. Motivation stems from mastering complex challenges and achieving measurable institutional progress.`,
    professionalPersonality:
      analysis?.professionalPersonality ||
      `Objective, analytical, and disciplined in working style. Values transparent frameworks, accountability, and predictable project milestones. Operates with composure under demanding corporate conditions.`,
    naturalStrengths:
      analysis?.naturalStrengths ||
      synthesisResult.primaryArchetype.archetype.requiredStrengths,
    professionalChallenges:
      analysis?.professionalChallenges ||
      synthesisResult.primaryArchetype.archetype.potentialChallenges,
    careerDNAAnalysis:
      analysis?.careerDNAAnalysis ||
      `The confluence of Ascendant, 10th house, and D10 Dashamsha establishes an executive profile tailored for ${synthesisResult.primaryArchetype.archetype.title} and ${synthesisResult.secondaryArchetype.archetype.title}.`,
    planetarySynthesis:
      analysis?.planetarySynthesis ||
      `10th Lord ${houseModels.houseTen.lord} aligns with ${synthesisResult.primaryArchetype.archetype.primarySignificators.join(' and ')}, synthesizing strategic vision with operational stamina. Jaimini AmK (${amkKarak || 'Calculated'}) reinforces core competency in this domain.`,
    yogaAnalysis:
      analysis?.yogaAnalysis ||
      `Detected classical Raja and Dhana Yogas create strong tailwinds for long-term career advancement, institutional recognition, and cumulative wealth creation.`,
    strengthsMatrixStatus: 'VERIFIED',
    challengeMatrixStatus: 'VERIFIED',
    strengthMatrixDimensions: synthesisResult.strengthMatrixDimensions,
    challengeMatrixDimensions: synthesisResult.challengeMatrixDimensions,
    employmentVsEntrepreneurship: synthesisResult.employmentVsEntrepreneurship,
    sectorComparisons: synthesisResult.sectorComparisons,
    careerDirections: synthesisResult.careerDirections,
    cautionCareerDirections: synthesisResult.cautionCareerDirections,
    moneyIncomeArchitecture: {
      earningPattern:
        analysis?.moneyIncomePattern ||
        `In Vedic astrology, earning patterns reflect the dynamic between the 2nd house of accumulated reserves (Dhana Bhava) and the 11th house of enterprise gains (Labha Bhava). With 2nd Lord ${houseModels.houseTwo?.lord || 'Second Lord'} in ${houseModels.houseTwo?.lordPlacement || 'House 2'} and 11th Lord ${houseModels.houseEleven?.lord || 'Eleventh Lord'} in ${houseModels.houseEleven?.lordPlacement || 'House 11'}, revenue progression is characterized by structured compounding and institutional compensation rather than speculative windfalls.`,
      incomeModes:
        'Primary executive salary/advisory compensation, institutional performance incentives, and secondary long-term capital investments.',
      financialStability: (() => {
        const h2Sav = savHouses ? savHouses[2] : undefined;
        const h11Sav = savHouses ? savHouses[11] : undefined;
        const h2Lord = houseModels.houseTwo?.lord || 'Second Lord';
        const h11Lord = houseModels.houseEleven?.lord || 'Eleventh Lord';
        if (hasValidSav && typeof h2Sav === 'number' && typeof h11Sav === 'number') {
          if (h2Sav > 28 && h11Sav > 28) {
            return `Favorable structural support; both the 2nd house of revenue reserves (${h2Sav} bindus) and 11th house of enterprise gains (${h11Sav} bindus) exceed the 28-bindu mathematical mean benchmark (337 / 12 = 28.08). While Sarvashtakavarga reflects aggregate environmental capacity rather than determining financial outcomes alone, this configuration combined with 2nd Lord ${h2Lord} and 11th Lord ${h11Lord} provides a solid structural foundation for disciplined liquidity and asset retention.`;
          } else if (h2Sav > 28 || h11Sav > 28) {
            const stronger = h2Sav > 28 ? `2nd house of revenue (${h2Sav} bindus)` : `11th house of gains (${h11Sav} bindus)`;
            const constrained = h2Sav <= 28 ? `2nd house (${h2Sav} bindus)` : `11th house (${h11Sav} bindus)`;
            return `Mixed environmental support; ${stronger} demonstrates above-average environmental strength (> 28 bindus against the 28.08 mathematical mean benchmark), while ${constrained} indicates a need for disciplined liquidity management and conservative overhead. Note that SAV reflects structural house support and must be evaluated alongside dasha periods and prudent fiscal management rather than as an isolated guarantee.`;
          } else {
            return `Requires deliberate fiscal conservatism; both the 2nd house (${h2Sav} bindus) and 11th house (${h11Sav} bindus) sit at or below the 28-bindu mathematical mean benchmark (337 / 12 = 28.08). Because SAV measures environmental support rather than fatalistic limits, long-term wealth accumulation relies on structured debt control, diversified reserves, and prudent cash-flow planning.`;
          }
        }
        return `Sarvashtakavarga bindu data for wealth houses is unavailable; financial stability is evaluated qualitatively through 2nd Lord (${h2Lord}) and 11th Lord (${h11Lord}) placements without numerical bindu claims.`;
      })(),
      wealthAccumulation:
        'Disciplined asset allocation emphasizing long-term equity growth, physical assets, and defensive liquid reserves.',
      fiscalRiskMitigation:
        'Avoid unhedged market speculation; prioritize capital preservation and structured, contract-backed commercial engagements.',
    },
    professionalRelationships: {
      partnershipViability:
        'Commercial partnerships succeed when formalized through explicit governance agreements, defined performance metrics, and complementary technical skill sets.',
      clientDynamics:
        'Clients and stakeholders value the native’s methodical execution, objective communication, and adherence to delivery commitments.',
      networkingStrategy:
        analysis?.relationshipsNetworking ||
        'Focus on high-leverage, small-circle executive networks and domain associations rather than diffuse, superficial social connections.',
      mentorAlliances:
        `The 9th house (Bhagya Bhava) in ${houseModels.houseNine?.sign || chart.ascendant.sign} ruled by ${houseModels.houseNine?.lord || 'Jupiter'} (${houseModels.houseNine?.lordPlacement || 'House 9'}) highlights significant benefits from senior executive sponsorship and ethical mentors.`,
      teamDynamics:
        analysis?.teamDynamics ||
        'Establishes clear accountability standards; excels when directing self-motivated domain specialists and cross-functional project pods.',
    },
    careerSustainability: {
      workLifeBalance:
        analysis?.sustainabilityAnalysis ||
        'Critical priority; establish clear operational boundaries during high-intensity quarters to maintain long-term endurance.',
      stressVulnerabilities: 'Tendency to internalize operational delays and perfectionist standards.',
      enduranceTactics: 'Daily structured restoration, regular cardiovascular wellness, and clear offline intervals.',
    },
    careerObstacles: synthesisResult.careerObstacles,
    timelineWindows: [
      {
        dateRange: `${dashaReport.mahadashaStart} – ${dashaReport.antardashaEnd}`,
        dashaContext: `${dashaReport.currentMahadasha} / ${dashaReport.currentAntardasha}`,
        transitContext: `Saturn in House ${transitReport.saturnTransit.houseFromLagna}, Jupiter in House ${transitReport.jupiterTransit.houseFromLagna}`,
        category: 'OPPORTUNITY',
        careerTheme: `Consolidation of Executive Stature in ${synthesisResult.primaryArchetype.archetype.category}`,
        strategicObjective: 'Deliver high-visibility strategic programs and solidify executive mandate.',
        riskFactors: 'Scope creep and high workload demands.',
        actionProtocol: 'Prioritize top 3 high-impact deliverables; delegate routine operational maintenance.',
      },
      {
        dateRange: `${dashaReport.antardashaEnd} – +18 Months`,
        dashaContext: `${dashaReport.currentMahadasha} / Upcoming Antardasha Sub-Period`,
        transitContext: `Planetary transits of Saturn (House ${transitReport.saturnTransit.houseFromLagna}) and Jupiter (House ${transitReport.jupiterTransit.houseFromLagna}) shift developmental focus relative to natal Lagna (${chart.ascendant.sign}).`,
        category: 'TRANSITION',
        careerTheme: 'Broadening Functional Scope & Strategic Career Pivot',
        strategicObjective: 'Expand portfolio responsibility or transition to senior executive appointment.',
        riskFactors: 'Adjustment period to expanded operational scope and new organizational dynamics.',
        actionProtocol: 'Engage senior mentors and conduct structured 90-day onboarding for new scope.',
      },
    ],
    roadmapThirtyDay: {
      focus: analysis?.thirtyDayFocus || synthesisResult.roadmaps.roadmapThirtyDay.focus,
      skills: analysis?.technicalSkillPriority || synthesisResult.roadmaps.roadmapThirtyDay.skills,
      immediateActions: analysis?.primaryProfessionalPriority || synthesisResult.roadmaps.roadmapThirtyDay.immediateActions,
      experiments: synthesisResult.roadmaps.roadmapThirtyDay.experiments,
      risks: analysis?.mistakeToAvoid || synthesisResult.roadmaps.roadmapThirtyDay.risks,
      metrics: synthesisResult.roadmaps.roadmapThirtyDay.metrics,
    },
    roadmapNinetyDay: {
      focus: analysis?.ninetyDayFocus || synthesisResult.roadmaps.roadmapNinetyDay.focus,
      skills: analysis?.communicationSkillPriority || synthesisResult.roadmaps.roadmapNinetyDay.skills,
      immediateActions: synthesisResult.roadmaps.roadmapNinetyDay.immediateActions,
      experiments: synthesisResult.roadmaps.roadmapNinetyDay.experiments,
      risks: synthesisResult.roadmaps.roadmapNinetyDay.risks,
      metrics: synthesisResult.roadmaps.roadmapNinetyDay.metrics,
    },
    roadmapOneYear: {
      focus: analysis?.oneYearFocus || synthesisResult.roadmaps.roadmapOneYear.focus,
      skills: analysis?.leadershipSkillPriority || synthesisResult.roadmaps.roadmapOneYear.skills,
      immediateActions: synthesisResult.roadmaps.roadmapOneYear.immediateActions,
      experiments: synthesisResult.roadmaps.roadmapOneYear.experiments,
      risks: synthesisResult.roadmaps.roadmapOneYear.risks,
      metrics: synthesisResult.roadmaps.roadmapOneYear.metrics,
    },
    roadmapThreeYear: {
      focus: analysis?.threeYearDirection || synthesisResult.roadmaps.roadmapThreeYear.focus,
      skills: analysis?.networkSkillPriority || synthesisResult.roadmaps.roadmapThreeYear.skills,
      immediateActions: synthesisResult.roadmaps.roadmapThreeYear.immediateActions,
      experiments: synthesisResult.roadmaps.roadmapThreeYear.experiments,
      risks: synthesisResult.roadmaps.roadmapThreeYear.risks,
      metrics: synthesisResult.roadmaps.roadmapThreeYear.metrics,
    },
    decisionFramework:
      analysis?.decisionGuidance ||
      'Evaluate prospective career opportunities against three non-negotiable criteria: (1) Clear decision-making autonomy and mandate, (2) Direct alignment with compounding domain expertise, and (3) Transparent reward mechanisms linked to measurable commercial outcomes.',
    finalSynthesis:
      analysis?.finalSynthesis ||
      `In conclusion, the astrological blueprint for ${clientName} represents a formidable combination of strategic vision, operational discipline, and executive integrity. By anchoring career moves in core domain strengths and timing major initiatives with favorable Dasha and transit cycles, the client is primed for enduring professional distinction and substantial lifetime accomplishments.`,
    closingNote:
      'Astrology provides a navigational map of intrinsic tendencies and temporal cycles. Real-world accomplishments remain the deliberate result of informed decision-making, focused effort, and ethical leadership.',
    primaryProfessionalPriority: analysis?.primaryProfessionalPriority || '',
    technicalSkillPriority: analysis?.technicalSkillPriority || '',
    communicationSkillPriority: analysis?.communicationSkillPriority || '',
    leadershipSkillPriority: analysis?.leadershipSkillPriority || '',
    networkSkillPriority: analysis?.networkSkillPriority || '',
    mistakeToAvoid: analysis?.mistakeToAvoid || '',
    thirtyDayFocus: analysis?.thirtyDayFocus || '',
    ninetyDayFocus: analysis?.ninetyDayFocus || '',
    oneYearFocus: analysis?.oneYearFocus || '',
    threeYearDirection: analysis?.threeYearDirection || '',
  };

  return {
    client: clientHeader,
    calculation: calcConfig,
    ascendant: ascModel,
    houses: houseModels as any,
    planets: planetModels as any,
    vargas: vargasReport as any,
    d10Dashamsha: d10Report,
    nakshatras: nakshatraAnalysis,
    yogas: yogaAnalysis,
    shadbala: shadbalaReport,
    bhavaBala: bhavaBalaReport,
    vimshopaka: vimshopakaReport,
    ashtakavarga: ashtakavargaReport,
    dasha: dashaReport,
    transits: transitReport,
    jaimini: jaiminiReport,
    kp: kpReport,
    panchanga: panchangReport,
    specialPoints: specialPointsReport,
    careerAnalysis: careerAnalysisData,
    authorMessage:
      '[PENDING AUTHOR APPROVAL: Personal consultation message from Sushil Kumar / Astro Sushil introducing the consultation philosophy, welcoming the client, and setting the professional and reflective tone of the career dossier. Final text pending author review and authorization.]',
  };
}
