import { AstroChart } from '../chart/astro-chart.types';
import { ChartCalculator } from '../chart/chart-calculator';
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { BirthDetails } from '../input/birth-details';
import { getNakshatraByLongitude, getPada, NAKSHATRAS } from '../nakshatra/nakshatra';
import { PlanetSymbol } from '../planets/planet.types';
import { getNaturalRelationship } from '../planets/planetary-relationships';
import { getRashiByLongitude, RASHIS } from '../zodiac/rashi';
import { NAKSHATRA_GANA_MAP, NAKSHATRA_YONI_MAP } from '../matchmaking/koota-tables';
import {
  DashakootaResult,
  PoruthamResult,
  SouthKootaResult,
  SouthMatchingResultBase,
  SouthMatchPerson,
} from './south-matching.types';
import {
  DASHAKOOTA_DINA_GOOD_REMAINDERS,
  DASHAKOOTA_SOURCE,
  MAHENDRA_GOOD_COUNTS,
  PORUTHAM_DINA_GOOD_COUNTS,
  PORUTHAM_SOURCE,
  SOUTH_MATCHING_PROVISIONAL_LABEL,
  SOUTH_RAJJU_BODY_PART,
  SOUTH_VASYA_TABLE,
  STREE_DEERGHA_MIN_EXCLUSIVE,
  southInclusiveCount,
  southIsVedha,
  southIsYoniEnemy,
  southRajjuOf,
} from './south-matching-tables';

/** Builds the Moon inputs for one person from nakshatra and rashi indices (pure table lookups). */
export function southMatchPersonFromIndices(
  nakshatraIndex: number,
  rashiIndex: number,
  label = '',
  extra?: { moonLongitude?: number; pada?: number },
): SouthMatchPerson {
  if (!Number.isInteger(nakshatraIndex) || nakshatraIndex < 1 || nakshatraIndex > 27) {
    throw new Error(`nakshatraIndex must be 1..27, got ${nakshatraIndex}`);
  }
  if (!Number.isInteger(rashiIndex) || rashiIndex < 1 || rashiIndex > 12) {
    throw new Error(`rashiIndex must be 1..12, got ${rashiIndex}`);
  }
  const rashi = RASHIS[rashiIndex - 1];
  return {
    label,
    moonLongitude: extra?.moonLongitude ?? null,
    nakshatraIndex,
    nakshatraName: NAKSHATRAS[nakshatraIndex - 1].name,
    pada: extra?.pada ?? null,
    rashiIndex,
    rashiName: rashi.sanskritName,
    rashiLord: rashi.ruler as PlanetSymbol,
    gana: NAKSHATRA_GANA_MAP[nakshatraIndex],
    yoni: { ...NAKSHATRA_YONI_MAP[nakshatraIndex] },
    rajju: southRajjuOf(nakshatraIndex),
  };
}

/** Moon inputs from a sidereal Moon longitude (degrees). */
export function southMatchPersonFromMoonLongitude(moonLongitude: number, label = ''): SouthMatchPerson {
  return southMatchPersonFromIndices(
    getNakshatraByLongitude(moonLongitude).index,
    getRashiByLongitude(moonLongitude).index,
    label,
    { moonLongitude, pada: getPada(moonLongitude) },
  );
}

/** Moon inputs from an engine chart (the chart already carries the config's ayanamsa). */
export function southMatchPersonFromChart(chart: AstroChart, label = ''): SouthMatchPerson {
  const moon = chart.planets[PlanetSymbol.MOON];
  if (!moon) throw new Error('AstroChart missing Moon placement');
  return southMatchPersonFromMoonLongitude(moon.longitude, label);
}

// ---------------------------------------------------------------------------------------------
// Individual kootas (count = inclusive count from the girl's nakshatra/rashi to the boy's)
// ---------------------------------------------------------------------------------------------

function nakCount(boy: SouthMatchPerson, girl: SouthMatchPerson): number {
  return southInclusiveCount(girl.nakshatraIndex, boy.nakshatraIndex, 27);
}

export function southPoruthamDina(boy: SouthMatchPerson, girl: SouthMatchPerson): SouthKootaResult {
  const count = nakCount(boy, girl);
  return {
    key: 'DINA',
    name: 'Dinam',
    matched: PORUTHAM_DINA_GOOD_COUNTS.includes(count),
    grade: null,
    dosha: false,
    rule: `Count girl→boy nakshatra in {${PORUTHAM_DINA_GOOD_COUNTS.join(', ')}}`,
    inputs: { girlNakshatra: girl.nakshatraName, boyNakshatra: boy.nakshatraName, count },
  };
}

export function southDashakootaDina(boy: SouthMatchPerson, girl: SouthMatchPerson): SouthKootaResult {
  const count = nakCount(boy, girl);
  const remainder = count % 9;
  return {
    key: 'DINA',
    name: 'Dina',
    matched: DASHAKOOTA_DINA_GOOD_REMAINDERS.includes(remainder),
    grade: null,
    dosha: false,
    rule: 'Count girl→boy nakshatra, divide by 9: remainder 2, 4, 6, 8 or 0 agrees',
    inputs: { girlNakshatra: girl.nakshatraName, boyNakshatra: boy.nakshatraName, count, remainder },
  };
}

export function southGana(boy: SouthMatchPerson, girl: SouthMatchPerson): SouthKootaResult {
  let matched: boolean;
  let grade: SouthKootaResult['grade'];
  if (boy.gana === girl.gana) {
    matched = true;
    grade = 'UTTAMA';
  } else if (boy.gana !== 'RAKSHASA' && girl.gana !== 'RAKSHASA') {
    matched = true; // Deva with Manushya, either way
    grade = 'MADHYAMA';
  } else {
    matched = false;
    grade = 'ADHAMA';
  }
  return {
    key: 'GANA',
    name: 'Ganam',
    matched,
    grade,
    dosha: false,
    rule: 'Same gana: uttama; Deva–Manushya: madhyama; Rakshasa with a different gana: no agreement',
    inputs: { girlGana: girl.gana, boyGana: boy.gana },
  };
}

export function southMahendra(boy: SouthMatchPerson, girl: SouthMatchPerson): SouthKootaResult {
  const count = nakCount(boy, girl);
  return {
    key: 'MAHENDRA',
    name: 'Mahendram',
    matched: MAHENDRA_GOOD_COUNTS.includes(count),
    grade: null,
    dosha: false,
    rule: `Count girl→boy nakshatra in {${MAHENDRA_GOOD_COUNTS.join(', ')}}`,
    inputs: { girlNakshatra: girl.nakshatraName, boyNakshatra: boy.nakshatraName, count },
  };
}

export function southStreeDeergha(boy: SouthMatchPerson, girl: SouthMatchPerson): SouthKootaResult {
  const count = nakCount(boy, girl);
  return {
    key: 'STREE_DEERGHA',
    name: 'Stree Deergham',
    matched: count > STREE_DEERGHA_MIN_EXCLUSIVE,
    grade: null,
    dosha: false,
    rule: `Count girl→boy nakshatra greater than ${STREE_DEERGHA_MIN_EXCLUSIVE}`,
    inputs: { girlNakshatra: girl.nakshatraName, boyNakshatra: boy.nakshatraName, count },
  };
}

export function southYoni(boy: SouthMatchPerson, girl: SouthMatchPerson): SouthKootaResult {
  const enemy = southIsYoniEnemy(boy.yoni.animal, girl.yoni.animal);
  const same = boy.yoni.animal === girl.yoni.animal;
  return {
    key: 'YONI',
    name: 'Yoni',
    matched: !enemy,
    grade: same ? 'UTTAMA' : enemy ? 'ADHAMA' : null,
    dosha: false,
    rule: 'Hostile animal pair (horse–buffalo, elephant–lion, sheep–monkey, serpent–mongoose, dog–deer, cat–rat, cow–tiger): no agreement; same animal: uttama',
    inputs: {
      girlYoni: girl.yoni.animal,
      girlYoniGender: girl.yoni.gender,
      boyYoni: boy.yoni.animal,
      boyYoniGender: boy.yoni.gender,
      enemyPair: enemy,
    },
  };
}

export function southRasi(boy: SouthMatchPerson, girl: SouthMatchPerson): SouthKootaResult {
  const count = southInclusiveCount(girl.rashiIndex, boy.rashiIndex, 12);
  const reverse = southInclusiveCount(boy.rashiIndex, girl.rashiIndex, 12);
  return {
    key: 'RASI',
    name: 'Rasi',
    matched: count === 1 || count > 6,
    grade: null,
    dosha: false,
    rule: 'Count girl→boy rashi: same rashi or beyond the 6th agrees',
    inputs: {
      girlRashi: girl.rashiName,
      boyRashi: boy.rashiName,
      count,
      reverseCount: reverse,
      shashtashtaka: count === 6 || count === 8,
      dvirdvadasa: count === 2 || count === 12,
    },
  };
}

export function southRasiAdhipati(boy: SouthMatchPerson, girl: SouthMatchPerson): SouthKootaResult {
  const same = boy.rashiLord === girl.rashiLord;
  const boyToGirl = same ? 'SAME' : getNaturalRelationship(boy.rashiLord, girl.rashiLord);
  const girlToBoy = same ? 'SAME' : getNaturalRelationship(girl.rashiLord, boy.rashiLord);
  const anyEnemy = boyToGirl === 'ENEMY' || girlToBoy === 'ENEMY';
  const grade: SouthKootaResult['grade'] =
    same || (boyToGirl === 'FRIEND' && girlToBoy === 'FRIEND') ? 'UTTAMA' : anyEnemy ? 'ADHAMA' : 'MADHYAMA';
  return {
    key: 'RASI_ADHIPATI',
    name: 'Rasi Athipathi',
    matched: !anyEnemy,
    grade,
    dosha: false,
    rule: 'Rashi lords same or mutual friends: uttama; neutral involved: madhyama; enmity either way: no agreement (naisargika maitri)',
    inputs: {
      girlRashiLord: girl.rashiLord,
      boyRashiLord: boy.rashiLord,
      boyLordTowardGirlLord: boyToGirl,
      girlLordTowardBoyLord: girlToBoy,
    },
  };
}

export function southVasya(boy: SouthMatchPerson, girl: SouthMatchPerson): SouthKootaResult {
  const boyVasyaToGirl = SOUTH_VASYA_TABLE[girl.rashiIndex].includes(boy.rashiIndex);
  const girlVasyaToBoy = SOUTH_VASYA_TABLE[boy.rashiIndex].includes(girl.rashiIndex);
  return {
    key: 'VASYA',
    name: 'Vasiyam',
    matched: boyVasyaToGirl || girlVasyaToBoy,
    grade: null,
    dosha: false,
    rule: "Either person's rashi is vasya to the other's (published vasya table)",
    inputs: { girlRashi: girl.rashiName, boyRashi: boy.rashiName, boyVasyaToGirl, girlVasyaToBoy },
  };
}

export function southRajju(boy: SouthMatchPerson, girl: SouthMatchPerson): SouthKootaResult {
  const same = boy.rajju === girl.rajju;
  return {
    key: 'RAJJU',
    name: 'Rajju',
    matched: !same,
    grade: null,
    dosha: same,
    rule: 'Both nakshatras in the same rajju group: Rajju dosha (no agreement)',
    inputs: {
      girlNakshatra: girl.nakshatraName,
      boyNakshatra: boy.nakshatraName,
      girlRajju: SOUTH_RAJJU_BODY_PART[girl.rajju],
      boyRajju: SOUTH_RAJJU_BODY_PART[boy.rajju],
    },
  };
}

export function southVedha(boy: SouthMatchPerson, girl: SouthMatchPerson): SouthKootaResult {
  const vedha = southIsVedha(boy.nakshatraIndex, girl.nakshatraIndex);
  return {
    key: 'VEDHA',
    name: 'Vedhai',
    matched: !vedha,
    grade: null,
    dosha: vedha,
    rule: 'Nakshatras form a published vedha pair: Vedha dosha (no agreement)',
    inputs: { girlNakshatra: girl.nakshatraName, boyNakshatra: boy.nakshatraName, vedhaPair: vedha },
  };
}

// ---------------------------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------------------------

const COMMON_NOTES: string[] = [
  'All counts are inclusive, from the girl\'s (bride\'s) nakshatra or rashi to the boy\'s (groom\'s); same = 1.',
  'Inputs are the Moon nakshatra and rashi of each chart, computed by the engine with the active AstrologyConfig (ayanamsa).',
  'Gana and yoni tables are the same as the Ashtakoota tables (src/matchmaking, imported unchanged).',
  'Gana: some Tamil texts accept a Rakshasa boy with a Deva/Manushya girl, or apply exceptions by star count; not applied.',
  'Stree Deergham: some astrologers grade a count above 9 as moderate (madhyama); the default here is count > 13 only.',
  'Yoni: some reports additionally grade by yoni gender (e.g. male–male); not applied — only the seven hostile pairs fail.',
  'Rasi: some texts fail 6/8 (shashtashtaka) and 2/12 (dvirdvadasa) separately, with lord-friendship exceptions; reported as flags only, not used in the match.',
  'Rasi Athipathi: uses naisargika (natural) relationships from the engine table; some texts fail only mutual enmity.',
  'Vasya table per astroved.com; some Tamil panchangas give Simha → Makara, Thula → Kanni + Makara, Vrischika → Kataka only.',
  'Rajju: 5-fold (Siro, Kantha, Nabhi, Kati, Pada) Tamil grouping; Kerala practice also uses a 3-fold (Prathama/Madhya/Antya) grouping and ascending/descending sub-divisions — not applied.',
  'Same-nakshatra exceptions (e.g. Rohini, Ardra, Pushya, Magha, Hasta, Shravana treated as acceptable when shared) are not applied.',
];

function build(boy: SouthMatchPerson, girl: SouthMatchPerson, dina: SouthKootaResult): Omit<SouthMatchingResultBase, 'source' | 'conventionNotes'> {
  const kootas: SouthKootaResult[] = [
    dina,
    southGana(boy, girl),
    southMahendra(boy, girl),
    southStreeDeergha(boy, girl),
    southYoni(boy, girl),
    southRasi(boy, girl),
    southRasiAdhipati(boy, girl),
    southVasya(boy, girl),
    southRajju(boy, girl),
    southVedha(boy, girl),
  ];
  return {
    boy,
    girl,
    countDirection: 'GIRL_TO_BOY_INCLUSIVE',
    kootas,
    matchedCount: kootas.filter((k) => k.matched).length,
    totalKootas: 10,
    rajjuDosha: kootas[8].dosha,
    vedhaDosha: kootas[9].dosha,
    provisional: true,
    provisionalLabel: SOUTH_MATCHING_PROVISIONAL_LABEL,
  };
}

/** South Indian 10-porutham evaluation from two Moon profiles. */
export function calculatePorutham(boy: SouthMatchPerson, girl: SouthMatchPerson): PoruthamResult {
  return {
    system: 'PORUTHAM',
    ...build(boy, girl, southPoruthamDina(boy, girl)),
    source: PORUTHAM_SOURCE,
    conventionNotes: [
      'Dinam uses the Tamil count list {2,4,6,8,9,11,13,15,18,20,24,26}; the Dashakoota variant uses the remainder-after-9 rule (which also accepts counts 17, 22 and 27).',
      ...COMMON_NOTES,
    ],
  };
}

/** Dashakoota (10 kootas) evaluation from two Moon profiles. */
export function calculateDashakoota(boy: SouthMatchPerson, girl: SouthMatchPerson): DashakootaResult {
  return {
    system: 'DASHAKOOTA',
    ...build(boy, girl, southDashakootaDina(boy, girl)),
    points: null,
    source: DASHAKOOTA_SOURCE,
    conventionNotes: [
      'Differs from the Tamil Porutham only in Dina: remainder of count/9 in {2,4,6,8,0} agrees (counts 17, 22, 27 agree here but not in the Tamil list).',
      'No points are assigned: no verified published point allocation for the ten kootas was available (the 36-point Ashtakoota is a separate system).',
      ...COMMON_NOTES,
    ],
  };
}

/** Computes both charts with the given config and evaluates Porutham / Dashakoota. */
export class SouthMatchingCalculator {
  private readonly chartCalculator: ChartCalculator;

  constructor(chartCalculator?: ChartCalculator) {
    this.chartCalculator = chartCalculator ?? new ChartCalculator();
  }

  public async profiles(
    boy: BirthDetails,
    girl: BirthDetails,
    config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG,
  ): Promise<{ boy: SouthMatchPerson; girl: SouthMatchPerson }> {
    const [b, g] = await Promise.all([
      this.chartCalculator.calculateChart(boy, config),
      this.chartCalculator.calculateChart(girl, config),
    ]);
    return { boy: southMatchPersonFromChart(b, 'Boy'), girl: southMatchPersonFromChart(g, 'Girl') };
  }

  public async porutham(boy: BirthDetails, girl: BirthDetails, config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG): Promise<PoruthamResult> {
    const p = await this.profiles(boy, girl, config);
    return calculatePorutham(p.boy, p.girl);
  }

  public async dashakoota(boy: BirthDetails, girl: BirthDetails, config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG): Promise<DashakootaResult> {
    const p = await this.profiles(boy, girl, config);
    return calculateDashakoota(p.boy, p.girl);
  }
}
