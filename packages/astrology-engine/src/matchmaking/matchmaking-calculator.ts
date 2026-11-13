import { AstroChart } from '../chart/astro-chart.types';
import { PlanetSymbol } from '../planets/planet.types';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import { getRashiByLongitude } from '../zodiac/rashi';
import { getNaturalRelationship } from '../planets/planetary-relationships';
import { AstronomyEngineAdapter } from '../ephemeris/astronomy-engine.adapter';
import {
  AshtakootaResult,
  BhakootDistance,
  BHAKOOT_DISTANCE_NAMES,
  BhakootResult,
  CompatibilityResult,
  DerivedMoonProfile,
  GanaResult,
  GrahaMaitriResult,
  ManglikComparisonResult,
  ManglikComparisonVerdict,
  ManglikSeverity,
  ManglikStatus,
  MatchmakingResult,
  NadiResult,
  TaraCategory,
  TaraResult,
  VarnaResult,
  VashyaResult,
  YoniRelationship,
  YoniResult,
} from './matchmaking.types';
import {
  ASHTAKOOTA_WEIGHTS,
  GANA_COMPATIBILITY_MATRIX,
  NAKSHATRA_GANA_MAP,
  NAKSHATRA_NADI_MAP,
  NAKSHATRA_YONI_MAP,
  RASHI_VARNA_MAP,
  RASHI_VASHYA_MAP,
  RASHI_VASHYA_MATRIX,
  TARA_DEFINITIONS,
  TOTAL_MAX_ASHTAKOOTA_SCORE,
  YONI_COMPATIBILITY_MATRIX,
  getNameAshtavarga,
} from './koota-tables';

export class MatchmakingCalculator {
  /**
   * Evaluates complete Ashtakoota Matchmaking (36 points Guna Milan) & Manglik Dosha for Person A and Person B.
   */
  public evaluateCompatibility(
    chartA: AstroChart,
    chartB: AstroChart,
    options?: { personALabel?: string; personBLabel?: string }
  ): CompatibilityResult {
    const personA = this.deriveMoonProfile(chartA, options?.personALabel || 'Person A');
    const personB = this.deriveMoonProfile(chartB, options?.personBLabel || 'Person B');

    const ashtakoota = this.calculateAshtakoota(personA, personB);
    const mangalA = this.evaluateManglikDosha(chartA);
    const mangalB = this.evaluateManglikDosha(chartB);
    const manglikComparison = this.compareManglikDosha(mangalA, mangalB);

    return {
      calculationVersion: '0.1.0',
      convention: {
        name: 'Classical Parashari Ashtakoota Milan',
        description: 'Traditional 36-point Guna Milan and pairwise Manglik evaluation',
        totalMaxScore: TOTAL_MAX_ASHTAKOOTA_SCORE,
        ayanamsa: chartA.metadata?.config?.ayanamsa || 'LAHIRI',
        zodiac: chartA.metadata?.config?.zodiacType || 'SIDEREAL',
      },
      personA,
      personB,
      ashtakoota,
      manglikComparison,
      overallSummary: {
        totalScore: ashtakoota.totalObtainedPoints,
        maxScore: ashtakoota.totalMaxPoints,
        isAshtakootaCompatible: ashtakoota.isCompatible,
        manglikVerdict: manglikComparison.verdict,
      },
    };
  }

  /**
   * Legacy method for backward compatibility with existing tests and API callers.
   */
  public evaluateCompatibilityLegacy(boyChart: AstroChart, girlChart: AstroChart): MatchmakingResult {
    const full = this.evaluateCompatibility(boyChart, girlChart, {
      personALabel: 'Boy',
      personBLabel: 'Girl',
    });

    let verdict = 'Compatible Marriage Match';
    if (full.ashtakoota.totalObtainedPoints < 18) {
      verdict = 'Low Guna Match (< 18 Points)';
    } else if (full.manglikComparison.verdict === 'MANGLIK_MISMATCH') {
      verdict = 'Guna Match Favorable, but Manglik Mismatch detected';
    }

    return {
      ashtakoota: full.ashtakoota,
      boyManglik: full.manglikComparison.personA,
      girlManglik: full.manglikComparison.personB,
      manglikComparison: full.manglikComparison,
      overallVerdict: verdict,
    };
  }

  /**
   * Extracts derived Moon facts for an individual from their AstroChart.
   */
  public deriveMoonProfile(chart: AstroChart, personLabel?: string): DerivedMoonProfile {
    const moonPos = chart.planets[PlanetSymbol.MOON];
    if (!moonPos) {
      throw new Error('AstroChart missing Moon planetary placement');
    }

    const moonLongitude = moonPos.longitude;
    const rashiDef = getRashiByLongitude(moonLongitude);
    const nakshatraDef = getNakshatraByLongitude(moonLongitude);
    const pada = getPada(moonLongitude);

    const varnaInfo = RASHI_VARNA_MAP[rashiDef.index];
    const vashya = RASHI_VASHYA_MAP[rashiDef.index];
    const gana = NAKSHATRA_GANA_MAP[nakshatraDef.index];
    const yoni = NAKSHATRA_YONI_MAP[nakshatraDef.index];
    const nadi = NAKSHATRA_NADI_MAP[nakshatraDef.index];
    const varga = getNameAshtavarga(personLabel || '').name;

    return {
      personLabel,
      moonLongitude,
      rashiIndex: rashiDef.index,
      rashiName: rashiDef.sanskritName,
      rashiLord: rashiDef.ruler as PlanetSymbol,
      nakshatraIndex: nakshatraDef.index,
      nakshatraName: nakshatraDef.name,
      pada,
      nakshatraLord: nakshatraDef.lord,
      varna: varnaInfo.varna,
      varnaRank: varnaInfo.rank,
      vashya,
      gana,
      yoni,
      nadi,
      varga,
    };
  }

  /**
   * Calculates complete Ashtakoota (8 Kootas, 36 Points Max) between two derived Moon profiles.
   */
  public calculateAshtakoota(
    personA: DerivedMoonProfile,
    personB: DerivedMoonProfile
  ): AshtakootaResult {
    const varna = this.calculateVarna(personA, personB);
    const vashya = this.calculateVashya(personA, personB);
    const tara = this.calculateTara(personA, personB);
    const yoni = this.calculateYoni(personA, personB);
    const grahaMaitri = this.calculateGrahaMaitri(personA, personB);
    const gana = this.calculateGana(personA, personB);
    const bhakoot = this.calculateBhakoot(personA, personB);
    const nadi = this.calculateNadi(personA, personB);

    const totalObtainedPoints =
      varna.obtainedPoints +
      vashya.obtainedPoints +
      tara.obtainedPoints +
      yoni.obtainedPoints +
      grahaMaitri.obtainedPoints +
      gana.obtainedPoints +
      bhakoot.obtainedPoints +
      nadi.obtainedPoints;

    const totalEffectivePoints =
      varna.obtainedPoints +
      vashya.obtainedPoints +
      tara.obtainedPoints +
      yoni.obtainedPoints +
      grahaMaitri.obtainedPoints +
      gana.obtainedPoints +
      (bhakoot.effectivePoints ?? bhakoot.obtainedPoints) +
      nadi.obtainedPoints;

    return {
      totalMaxPoints: TOTAL_MAX_ASHTAKOOTA_SCORE,
      totalObtainedPoints,
      totalEffectivePoints,
      isCompatible: totalObtainedPoints >= 18,
      kootas: {
        varna,
        vashya,
        tara,
        yoni,
        grahaMaitri,
        gana,
        bhakoot,
        nadi,
      },
    };
  }

  // ==========================================
  // 1. VARNA KOOTA (Max 1 Point)
  // ==========================================
  public calculateVarna(personA: DerivedMoonProfile, personB: DerivedMoonProfile): VarnaResult {
    const maxPoints = ASHTAKOOTA_WEIGHTS.VARNA;
    // Directional rule: Groom/Person A Varna rank >= Bride/Person B Varna rank -> 1 pt, else 0 pt
    const obtainedPoints = personA.varnaRank >= personB.varnaRank ? 1 : 0;

    return {
      name: 'Varna',
      sanskritName: 'Varna Koota',
      maxPoints,
      obtainedPoints,
      description: 'Work disposition, spiritual hierarchy, and ego compatibility',
      isSymmetric: personA.varnaRank === personB.varnaRank,
      personAVarna: personA.varna,
      personBVarna: personB.varna,
      personARank: personA.varnaRank,
      personBRank: personB.varnaRank,
      evidence: {
        personAVarna: personA.varna,
        personARank: personA.varnaRank,
        personBVarna: personB.varna,
        personBRank: personB.varnaRank,
        isHigherOrEqual: personA.varnaRank >= personB.varnaRank,
      },
    };
  }

  // ==========================================
  // 2. VASHYA KOOTA (Max 2 Points)
  // ==========================================
  public calculateVashya(personA: DerivedMoonProfile, personB: DerivedMoonProfile): VashyaResult {
    const maxPoints = ASHTAKOOTA_WEIGHTS.VASHYA;
    const score = RASHI_VASHYA_MATRIX[personA.rashiIndex]?.[personB.rashiIndex] ?? 0;

    let relationship = 'NEUTRAL';
    if (score === 2) {
      relationship = personA.vashya === personB.vashya ? 'SAME_VASHYA' : 'MUTUALLY_VASHYA';
    } else if (score === 1) {
      relationship = 'FRIENDLY_VASHYA';
    } else if (score === 0) {
      relationship = 'ENEMY_VASHYA';
    }

    return {
      name: 'Vashya',
      sanskritName: 'Vashya Koota',
      maxPoints,
      obtainedPoints: score,
      description: 'Mutual attraction, dominance, and magnetic balance',
      isSymmetric: RASHI_VASHYA_MATRIX[personB.rashiIndex]?.[personA.rashiIndex] === score,
      personARashi: personA.rashiName,
      personBRashi: personB.rashiName,
      personAVashya: personA.vashya,
      personBVashya: personB.vashya,
      relationship,
      evidence: {
        rashiA: personA.rashiIndex,
        rashiB: personB.rashiIndex,
        vashyaA: personA.vashya,
        vashyaB: personB.vashya,
        matrixScore: score,
      },
    };
  }

  // ==========================================
  // 3. TARA KOOTA (Max 3 Points)
  // ==========================================
  public calculateTara(personA: DerivedMoonProfile, personB: DerivedMoonProfile): TaraResult {
    const maxPoints = ASHTAKOOTA_WEIGHTS.TARA;

    // Count from Nakshatra A to Nakshatra B (inclusive forward count)
    const countAToB = ((personB.nakshatraIndex - personA.nakshatraIndex + 27) % 27) + 1;
    const taraIndexAToB = ((countAToB - 1) % 9) + 1;
    const defAToB = TARA_DEFINITIONS[taraIndexAToB];

    // Count from Nakshatra B to Nakshatra A (inclusive forward count)
    const countBToA = ((personA.nakshatraIndex - personB.nakshatraIndex + 27) % 27) + 1;
    const taraIndexBToA = ((countBToA - 1) % 9) + 1;
    const defBToA = TARA_DEFINITIONS[taraIndexBToA];

    const isFavorableA = defAToB.isAuspicious;
    const isFavorableB = defBToA.isAuspicious;

    let obtainedPoints = 0;
    if (isFavorableA && isFavorableB) {
      obtainedPoints = 3;
    } else if (isFavorableA || isFavorableB) {
      obtainedPoints = 1.5;
    } else {
      obtainedPoints = 0;
    }

    return {
      name: 'Tara',
      sanskritName: 'Tara Koota (Dina)',
      maxPoints,
      obtainedPoints,
      description: 'Destiny, health, and mutual longevity harmony',
      isSymmetric: true,
      personANakshatra: personA.nakshatraName,
      personBNakshatra: personB.nakshatraName,
      personAToB: {
        nakshatraIndex: personB.nakshatraIndex,
        nakshatraName: personB.nakshatraName,
        count: countAToB,
        taraIndex: taraIndexAToB,
        taraName: defAToB.name,
        isAuspicious: defAToB.isAuspicious,
      },
      personBToA: {
        nakshatraIndex: personA.nakshatraIndex,
        nakshatraName: personA.nakshatraName,
        count: countBToA,
        taraIndex: taraIndexBToA,
        taraName: defBToA.name,
        isAuspicious: defBToA.isAuspicious,
      },
      evidence: {
        countAToB,
        taraIndexAToB,
        taraNameAToB: defAToB.name,
        isAuspiciousAToB: isFavorableA,
        countBToA,
        taraIndexBToA,
        taraNameBToA: defBToA.name,
        isAuspiciousBToA: isFavorableB,
      },
    };
  }

  // ==========================================
  // 4. YONI KOOTA (Max 4 Points)
  // ==========================================
  public calculateYoni(personA: DerivedMoonProfile, personB: DerivedMoonProfile): YoniResult {
    const maxPoints = ASHTAKOOTA_WEIGHTS.YONI;
    const animalA = personA.yoni.animal;
    const animalB = personB.yoni.animal;

    const obtainedPoints = YONI_COMPATIBILITY_MATRIX[animalA]?.[animalB] ?? 0;

    let relationshipCategory: YoniRelationship = 'NEUTRAL';
    if (obtainedPoints === 4) {
      relationshipCategory = 'SWAYONI';
    } else if (obtainedPoints === 3) {
      relationshipCategory = 'FRIEND';
    } else if (obtainedPoints === 2) {
      relationshipCategory = 'NEUTRAL';
    } else if (obtainedPoints === 1) {
      relationshipCategory = 'ENEMY';
    } else if (obtainedPoints === 0) {
      relationshipCategory = 'SWORN_ENEMY';
    }

    return {
      name: 'Yoni',
      sanskritName: 'Yoni Koota',
      maxPoints,
      obtainedPoints,
      description: 'Physical, biological, and instinctual compatibility',
      isSymmetric: YONI_COMPATIBILITY_MATRIX[animalB]?.[animalA] === obtainedPoints,
      personAYoni: animalA,
      personBYoni: animalB,
      relationshipCategory,
      evidence: {
        yoniA: personA.yoni,
        yoniB: personB.yoni,
        compatibilityScore: obtainedPoints,
      },
    };
  }

  // ==========================================
  // 5. GRAHA MAITRI KOOTA (Max 5 Points)
  // ==========================================
  public calculateGrahaMaitri(
    personA: DerivedMoonProfile,
    personB: DerivedMoonProfile
  ): GrahaMaitriResult {
    const maxPoints = ASHTAKOOTA_WEIGHTS.GRAHA_MAITRI;
    const lordA = personA.rashiLord;
    const lordB = personB.rashiLord;

    if (lordA === lordB) {
      return {
        name: 'Graha Maitri',
        sanskritName: 'Graha Maitri Koota',
        maxPoints,
        obtainedPoints: 5,
        description: 'Mental, intellectual, and psychological affinity',
        isSymmetric: true,
        personALord: lordA,
        personBLord: lordB,
        lordAToB: 'FRIEND',
        lordBToA: 'FRIEND',
        combinedFriendship: 'SAME_LORD',
        evidence: { lordA, lordB, sameLord: true },
      };
    }

    const relAToB = getNaturalRelationship(lordA, lordB);
    const relBToA = getNaturalRelationship(lordB, lordA);

    let obtainedPoints = 0;
    let combinedFriendship = 'MUTUAL_ENEMIES';

    if (relAToB === 'FRIEND' && relBToA === 'FRIEND') {
      obtainedPoints = 5;
      combinedFriendship = 'MUTUAL_FRIENDS';
    } else if (
      (relAToB === 'FRIEND' && relBToA === 'NEUTRAL') ||
      (relAToB === 'NEUTRAL' && relBToA === 'FRIEND')
    ) {
      obtainedPoints = 4;
      combinedFriendship = 'FRIEND_AND_NEUTRAL';
    } else if (relAToB === 'NEUTRAL' && relBToA === 'NEUTRAL') {
      obtainedPoints = 3;
      combinedFriendship = 'MUTUAL_NEUTRALS';
    } else if (
      (relAToB === 'FRIEND' && relBToA === 'ENEMY') ||
      (relAToB === 'ENEMY' && relBToA === 'FRIEND')
    ) {
      obtainedPoints = 1;
      combinedFriendship = 'FRIEND_AND_ENEMY';
    } else if (
      (relAToB === 'NEUTRAL' && relBToA === 'ENEMY') ||
      (relAToB === 'ENEMY' && relBToA === 'NEUTRAL')
    ) {
      obtainedPoints = 0.5;
      combinedFriendship = 'NEUTRAL_AND_ENEMY';
    } else {
      obtainedPoints = 0;
      combinedFriendship = 'MUTUAL_ENEMIES';
    }

    return {
      name: 'Graha Maitri',
      sanskritName: 'Graha Maitri Koota',
      maxPoints,
      obtainedPoints,
      description: 'Mental, intellectual, and psychological affinity',
      isSymmetric: true,
      personALord: lordA,
      personBLord: lordB,
      lordAToB: relAToB,
      lordBToA: relBToA,
      combinedFriendship,
      evidence: { lordA, lordB, relAToB, relBToA },
    };
  }

  // ==========================================
  // 6. GANA KOOTA (Max 6 Points)
  // ==========================================
  public calculateGana(personA: DerivedMoonProfile, personB: DerivedMoonProfile): GanaResult {
    const maxPoints = ASHTAKOOTA_WEIGHTS.GANA;
    const ganaA = personA.gana;
    const ganaB = personB.gana;

    const obtainedPoints = GANA_COMPATIBILITY_MATRIX[ganaA]?.[ganaB] ?? 0;

    let relationship = 'MISMATCH';
    if (obtainedPoints === 6) {
      relationship = ganaA === ganaB ? 'SAME_GANA' : 'EXCELLENT_MATCH';
    } else if (obtainedPoints === 5) {
      relationship = 'GOOD_MATCH';
    } else if (obtainedPoints === 1) {
      relationship = 'TOLERABLE_MATCH';
    } else {
      relationship = 'INCOMPATIBLE_GANA';
    }

    return {
      name: 'Gana',
      sanskritName: 'Gana Koota',
      maxPoints,
      obtainedPoints,
      description: 'Temperament, behavioral instincts, and social compatibility',
      isSymmetric: ganaA === ganaB,
      personAGana: ganaA,
      personBGana: ganaB,
      relationship,
      evidence: {
        ganaA,
        ganaB,
        matrixScore: obtainedPoints,
      },
    };
  }

  // ==========================================
  // 7. BHAKOOT KOOTA (Max 7 Points)
  // ==========================================
  public calculateBhakoot(personA: DerivedMoonProfile, personB: DerivedMoonProfile): BhakootResult {
    const maxPoints = ASHTAKOOTA_WEIGHTS.BHAKOOT;

    const rawDiff = Math.abs(personA.rashiIndex - personB.rashiIndex);
    const distance1 = ((personB.rashiIndex - personA.rashiIndex + 12) % 12) + 1;
    const distance2 = ((personA.rashiIndex - personB.rashiIndex + 12) % 12) + 1;
    const minDistance = Math.min(distance1, distance2);

    let relativeDistance: BhakootDistance = '1/1';
    if (minDistance === 1) relativeDistance = '1/1';
    else if (minDistance === 2) relativeDistance = '2/12';
    else if (minDistance === 3) relativeDistance = '3/11';
    else if (minDistance === 4) relativeDistance = '4/10';
    else if (minDistance === 5) relativeDistance = '5/9';
    else if (minDistance === 6) relativeDistance = '6/8';
    else if (minDistance === 7) relativeDistance = '7/7';

    const relationshipName = BHAKOOT_DISTANCE_NAMES[relativeDistance] || relativeDistance;

    // Inauspicious Bhakoot positions: 2/12 (Dwi-Dwadash), 5/9 (Nav-Pancham), 6/8 (Shadashtak)
    const isDosha = relativeDistance === '2/12' || relativeDistance === '5/9' || relativeDistance === '6/8';

    if (!isDosha) {
      return {
        name: 'Bhakoot',
        sanskritName: 'Bhakoot Koota (Rashi)',
        maxPoints,
        obtainedPoints: 7,
        rawPoints: 7,
        nominalPoints: 7,
        effectivePoints: 7,
        description: 'Family welfare, emotional growth, and longevity of union',
        isSymmetric: true,
        personARashi: personA.rashiName,
        personBRashi: personB.rashiName,
        relativeDistance,
        relationshipName,
        condition: 'AUSPICIOUS',
        isDoshaCancelled: false,
        evidence: {
          rashiA: personA.rashiIndex,
          rashiB: personB.rashiIndex,
          minDistance,
          relativeDistance,
          relationshipName,
        },
      };
    }

    // Evaluate classical cancellation exceptions for Bhakoot Dosha:
    // 1. Same Rashi lord (e.g. Aries-Scorpio 6/8 ruled by Mars, Taurus-Libra 6/8 ruled by Venus, Capricorn-Aquarius 2/12 ruled by Saturn)
    const sameLord = personA.rashiLord === personB.rashiLord;

    // 2. Mutual friendly lords (natural friendship):
    // e.g. Virgo (Mercury) and Taurus (Venus) 5/9: Mercury and Venus are mutual natural friends.
    // Cancer (Moon) and Leo (Sun) 2/12: Sun and Moon are mutual natural friends.
    // Pisces (Jupiter) and Aries (Mars) 2/12: Jupiter and Mars are mutual natural friends.
    // Sagittarius (Jupiter) and Cancer (Moon) 6/8: Jupiter and Moon are mutual natural friends.
    // Pisces (Jupiter) and Leo (Sun) 6/8: Jupiter and Sun are mutual natural friends.
    const relAToB = getNaturalRelationship(personA.rashiLord, personB.rashiLord);
    const relBToA = getNaturalRelationship(personB.rashiLord, personA.rashiLord);
    const mutualFriends = relAToB === 'FRIEND' && relBToA === 'FRIEND';

    // 3. Same Nakshatra across different Rashis (e.g. Krittika in Aries & Taurus)
    const sameNakshatra = personA.nakshatraIndex === personB.nakshatraIndex;

    let isDoshaCancelled = false;
    let cancellationReason: string | undefined;

    if (sameLord) {
      isDoshaCancelled = true;
      cancellationReason = `Bhakoot Dosha cancelled: Both Moon signs are ruled by the same planetary lord (${personA.rashiLord}).`;
    } else if (mutualFriends) {
      isDoshaCancelled = true;
      cancellationReason = `Bhakoot Dosha cancelled: Moon sign lords (${personA.rashiLord} and ${personB.rashiLord}) are mutual natural friends. Bhakoot Dosh is not Severe since rasi lords are friendly.`;
    } else if (sameNakshatra) {
      isDoshaCancelled = true;
      cancellationReason = `Bhakoot Dosha cancelled: Moon Nakshatras are identical (${personA.nakshatraName}) across different signs.`;
    }

    // In classical Ashtakoota Guna Milan per reference PDF:
    // rawPoints / nominalPoints / obtainedPoints is the raw table mark before dosha cancellation (strictly 0 when dosha is present).
    // effectivePoints reflects points obtained after cancellation (7 if mitigated) in the separate interpretive domain.
    // This cleanly separates raw Ashtakoota points from dosha cancellation and interpretive conclusions.
    // The final displayed total is strictly the sum of the eight displayed koota scores (yielding 23.50 / 36.00).
    const rawPoints = isDosha ? 0 : 7;
    const nominalPoints = rawPoints;
    const effectivePoints = isDoshaCancelled ? 7 : (isDosha ? 0 : 7);
    const obtainedPoints = rawPoints;

    return {
      name: 'Bhakoot',
      sanskritName: 'Bhakoot Koota (Rashi)',
      maxPoints,
      obtainedPoints,
      rawPoints,
      nominalPoints,
      effectivePoints,
      description: 'Family welfare, emotional growth, and longevity of union',
      isSymmetric: true,
      personARashi: personA.rashiName,
      personBRashi: personB.rashiName,
      relativeDistance,
      relationshipName,
      condition: isDosha ? 'DOSHA' : 'AUSPICIOUS',
      isDoshaCancelled,
      cancellationReason,
      evidence: {
        rashiA: personA.rashiIndex,
        rashiB: personB.rashiIndex,
        minDistance,
        relativeDistance,
        relationshipName,
        sameLord,
        mutualFriends,
        sameNakshatra,
      },
    };
  }

  // ==========================================
  // 8. NADI KOOTA (Max 8 Points)
  // ==========================================
  public calculateNadi(personA: DerivedMoonProfile, personB: DerivedMoonProfile): NadiResult {
    const maxPoints = ASHTAKOOTA_WEIGHTS.NADI;
    const nadiA = personA.nadi;
    const nadiB = personB.nadi;

    if (nadiA !== nadiB) {
      return {
        name: 'Nadi',
        sanskritName: 'Nadi Koota',
        maxPoints,
        obtainedPoints: 8,
        description: 'Constitutional balance, genetic vitality, and progeny harmony',
        isSymmetric: true,
        personANadi: nadiA,
        personBNadi: nadiB,
        condition: 'DIFFERENT_NADI',
        isDoshaCancelled: false,
        evidence: {
          nadiA,
          nadiB,
          isDifferent: true,
        },
      };
    }

    // Same Nadi detected -> Check classical cancellation rules:
    // 1. Same Nakshatra across different Rashis
    const sameNakshatraDifferentRashi =
      personA.nakshatraIndex === personB.nakshatraIndex &&
      personA.rashiIndex !== personB.rashiIndex;

    // 2. Same Nakshatra with different Padas
    const sameNakshatraDifferentPada =
      personA.nakshatraIndex === personB.nakshatraIndex &&
      personA.pada !== personB.pada;

    // 3. Same Rashi but different Nakshatras
    const sameRashiDifferentNakshatra =
      personA.rashiIndex === personB.rashiIndex &&
      personA.nakshatraIndex !== personB.nakshatraIndex;

    // 4. Nakshatra lords are same or mutual friends
    const nakLordA = personA.nakshatraLord;
    const nakLordB = personB.nakshatraLord;
    const sameNakLord = nakLordA === nakLordB;
    const relAToB = getNaturalRelationship(personA.rashiLord, personB.rashiLord);
    const relBToA = getNaturalRelationship(personB.rashiLord, personA.rashiLord);
    const friendlyRashiLords =
      personA.rashiLord === personB.rashiLord ||
      (relAToB === 'FRIEND' && relBToA === 'FRIEND');

    let isDoshaCancelled = false;
    let cancellationReason: string | undefined;

    if (sameNakshatraDifferentRashi) {
      isDoshaCancelled = true;
      cancellationReason = `Nadi Dosha cancelled: Same Nakshatra (${personA.nakshatraName}) spans different Rashis (${personA.rashiName} & ${personB.rashiName}).`;
    } else if (sameRashiDifferentNakshatra && friendlyRashiLords) {
      isDoshaCancelled = true;
      cancellationReason = `Nadi Dosha cancelled: Same Rashi (${personA.rashiName}) with different Nakshatras (${personA.nakshatraName} & ${personB.nakshatraName}).`;
    } else if (sameNakshatraDifferentPada && (personA.pada <= 2 !== personB.pada <= 2)) {
      isDoshaCancelled = true;
      cancellationReason = `Nadi Dosha mitigated: Different Pada quarters (${personA.pada} vs ${personB.pada}) in ${personA.nakshatraName}.`;
    }

    const obtainedPoints = isDoshaCancelled ? 8 : 0;

    return {
      name: 'Nadi',
      sanskritName: 'Nadi Koota',
      maxPoints,
      obtainedPoints,
      description: 'Constitutional balance, genetic vitality, and progeny harmony',
      isSymmetric: true,
      personANadi: nadiA,
      personBNadi: nadiB,
      condition: 'SAME_NADI_DOSHA',
      isDoshaCancelled,
      cancellationReason,
      evidence: {
        nadiA,
        nadiB,
        sameNakshatraDifferentRashi,
        sameRashiDifferentNakshatra,
        sameNakshatraDifferentPada,
      },
    };
  }

  /**
   * Deterministically verifies whether the Moon transitions across sign (Rashi) or Nakshatra
   * over a given date/interval. Used to ensure Moon-based compatibility is only computed
   * when the Moon position is mathematically invariant for unknown birth times.
   */
  public checkMoonStability(
    dateOfBirth: string,
    options?: {
      timeWindow?: { startTime: string; endTime: string };
      timezone?: string;
      tzOffsetMinutes?: number;
    }
  ): {
    isStable: boolean;
    startMoon: {
      longitude: number;
      rashiIndex: number;
      rashiName: string;
      nakshatraIndex: number;
      nakshatraName: string;
    };
    endMoon: {
      longitude: number;
      rashiIndex: number;
      rashiName: string;
      nakshatraIndex: number;
      nakshatraName: string;
    };
    transitionDescription?: string;
  } {
    const tzOffset = options?.tzOffsetMinutes ?? 330; // default IST (+05:30)
    const startTimeStr = options?.timeWindow?.startTime || '00:00:00';
    const endTimeStr = options?.timeWindow?.endTime || '23:59:59';

    const startLocal = new Date(`${dateOfBirth}T${startTimeStr}Z`).getTime() - tzOffset * 60000;
    const endLocal = new Date(`${dateOfBirth}T${endTimeStr}Z`).getTime() - tzOffset * 60000;

    const jdStart = startLocal / 86400000 + 2440587.5;
    const jdEnd = endLocal / 86400000 + 2440587.5;

    const ayanStart = 23.85 + 0.01396 * ((jdStart - 2451545.0) / 365.25);
    const ayanEnd = 23.85 + 0.01396 * ((jdEnd - 2451545.0) / 365.25);

    const ephem = new AstronomyEngineAdapter();
    const rawStart = ephem.getPlanetaryPosition(PlanetSymbol.MOON, jdStart);
    const rawEnd = ephem.getPlanetaryPosition(PlanetSymbol.MOON, jdEnd);

    const moonStartLon = (rawStart.longitude - ayanStart + 360) % 360;
    const moonEndLon = (rawEnd.longitude - ayanEnd + 360) % 360;

    const rStart = getRashiByLongitude(moonStartLon);
    const rEnd = getRashiByLongitude(moonEndLon);
    const nStart = getNakshatraByLongitude(moonStartLon);
    const nEnd = getNakshatraByLongitude(moonEndLon);

    const isStable = rStart.index === rEnd.index && nStart.index === nEnd.index;

    let transitionDescription: string | undefined;
    if (!isStable) {
      if (rStart.index !== rEnd.index && nStart.index !== nEnd.index) {
        transitionDescription = `Moon transitions from ${rStart.sanskritName} (${nStart.name}) to ${rEnd.sanskritName} (${nEnd.name}) on ${dateOfBirth}.`;
      } else if (rStart.index !== rEnd.index) {
        transitionDescription = `Moon transitions signs from ${rStart.sanskritName} to ${rEnd.sanskritName} on ${dateOfBirth}.`;
      } else {
        transitionDescription = `Moon transitions Nakshatras from ${nStart.name} to ${nEnd.name} within ${rStart.sanskritName} on ${dateOfBirth}.`;
      }
    }

    return {
      isStable,
      startMoon: {
        longitude: moonStartLon,
        rashiIndex: rStart.index,
        rashiName: rStart.sanskritName,
        nakshatraIndex: nStart.index,
        nakshatraName: nStart.name,
      },
      endMoon: {
        longitude: moonEndLon,
        rashiIndex: rEnd.index,
        rashiName: rEnd.sanskritName,
        nakshatraIndex: nEnd.index,
        nakshatraName: nEnd.name,
      },
      transitionDescription,
    };
  }

  // ==========================================
  // MANGLIK / MANGAL DOSHA EVALUATION
  // ==========================================

  /**
   * Evaluates deterministic Mangal Dosha for an individual chart.
   * Separates status from Lagna (primary reference point per reference PDF),
   * from Moon (Chandra), and from Venus (Shukra).
   * Strictly marks Lagna status as INDETERMINATE when birth time is unavailable.
   */
  public evaluateManglikDosha(
    chart: AstroChart,
    options?: { isTimeUnknown?: boolean; isMoonIndeterminate?: boolean }
  ): ManglikStatus {
    const isTimeUnavailable =
      options?.isTimeUnknown ||
      (chart as any).isTimeUnknown ||
      !chart.ascendant ||
      (chart.ascendant as any).isIndeterminate ||
      chart.ascendant.longitude === null;

    const isMoonUnavailable =
      options?.isMoonIndeterminate ||
      (chart as any).isMoonIndeterminate ||
      !chart.planets[PlanetSymbol.MOON];

    const marsPos = chart.planets[PlanetSymbol.MARS];
    if (!marsPos) {
      return {
        isManglik: false,
        marsPlacement: {
          rashiIndex: 1,
          rashiName: 'Mesha',
          longitude: 0,
          houseFromLagna: isTimeUnavailable ? undefined : 1,
          houseFromMoon: isMoonUnavailable ? undefined : 1,
          houseFromVenus: undefined,
        },
        manglikHousesFromLagna: [],
        manglikHousesFromMoon: [],
        manglikHousesFromVenus: [],
        severity: isTimeUnavailable ? 'INDETERMINATE' : 'NONE',
        cancellationFactors: [],
        isCancelled: false,
        effectiveManglik: false,
        isIndeterminate: isTimeUnavailable,
        statusFromLagna: isTimeUnavailable ? 'INDETERMINATE' : 'NON_MANGLIK',
        statusFromMoon: isMoonUnavailable ? 'INDETERMINATE' : 'NON_MANGLIK',
        statusFromVenus: 'INDETERMINATE',
        status: isTimeUnavailable ? 'Indeterminate' : 'Not Present',
      };
    }

    const marsRashi = marsPos.rashiIndex;
    const moonRashi = chart.planets[PlanetSymbol.MOON]?.rashiIndex;
    const venusRashi = chart.planets[PlanetSymbol.VENUS]?.rashiIndex;
    const ascRashi = chart.ascendant?.rashiIndex;

    const manglikHouses = [1, 4, 7, 8, 12];

    // 1. From Lagna (Primary reference point per reference PDF)
    let houseFromLagna: number | undefined;
    let isManglikFromLagna = false;
    let statusFromLagna: 'MANGLIK' | 'NON_MANGLIK' | 'INDETERMINATE' = 'INDETERMINATE';

    if (!isTimeUnavailable && typeof ascRashi === 'number') {
      houseFromLagna = ((marsRashi - ascRashi + 12) % 12) + 1;
      isManglikFromLagna = manglikHouses.includes(houseFromLagna);
      statusFromLagna = isManglikFromLagna ? 'MANGLIK' : 'NON_MANGLIK';
    }

    // 2. From Moon (Secondary reference point per classical Shastras)
    let houseFromMoon: number | undefined;
    let isManglikFromMoon = false;
    let statusFromMoon: 'MANGLIK' | 'NON_MANGLIK' | 'INDETERMINATE' = 'INDETERMINATE';
    if (!isMoonUnavailable && typeof moonRashi === 'number') {
      houseFromMoon = ((marsRashi - moonRashi + 12) % 12) + 1;
      isManglikFromMoon = manglikHouses.includes(houseFromMoon);
      statusFromMoon = isManglikFromMoon ? 'MANGLIK' : 'NON_MANGLIK';
    }

    // 3. From Venus (Tertiary reference point per classical Shastras)
    let houseFromVenus: number | undefined;
    let isManglikFromVenus = false;
    let statusFromVenus: 'MANGLIK' | 'NON_MANGLIK' | 'INDETERMINATE' = 'INDETERMINATE';
    if (typeof venusRashi === 'number') {
      houseFromVenus = ((marsRashi - venusRashi + 12) % 12) + 1;
      isManglikFromVenus = manglikHouses.includes(houseFromVenus);
      statusFromVenus = isManglikFromVenus ? 'MANGLIK' : 'NON_MANGLIK';
    }

    // Evaluate classical Mangal Dosha cancellations (evaluated for Lagna when time is known):
    const cancellationFactors: string[] = [];

    if (!isTimeUnavailable && typeof houseFromLagna === 'number') {
      // 1. Mars in Aries in 1st house (Own sign)
      if (marsRashi === 1 && houseFromLagna === 1) {
        cancellationFactors.push('Mars in own sign (Aries) in 1st house');
      }
      // 2. Mars in Scorpio in 4th or 8th house (Own sign)
      if (marsRashi === 8 && (houseFromLagna === 4 || houseFromLagna === 8)) {
        cancellationFactors.push('Mars in own sign (Scorpio) in 4th/8th house');
      }
      // 3. Mars in Capricorn in 7th or 8th house (Exalted sign)
      if (marsRashi === 10 && (houseFromLagna === 7 || houseFromLagna === 8)) {
        cancellationFactors.push('Mars in exalted sign (Capricorn) in 7th/8th house');
      }
      // 4. Mars in Leo in 8th house
      if (marsRashi === 5 && houseFromLagna === 8) {
        cancellationFactors.push('Mars in friendly sign (Leo) in 8th house');
      }
      // 5. Mars in Sagittarius in 12th house
      if (marsRashi === 9 && houseFromLagna === 12) {
        cancellationFactors.push('Mars in friendly sign (Sagittarius) in 12th house');
      }
    }

    // 6. Jupiter aspect or conjunction
    const jupiterPos = chart.planets[PlanetSymbol.JUPITER];
    if (jupiterPos) {
      const jupRashi = jupiterPos.rashiIndex;
      if (jupRashi === marsRashi) {
        cancellationFactors.push('Jupiter conjoined with Mars in the same house');
      } else {
        const jupAspectDistance = ((marsRashi - jupRashi + 12) % 12) + 1;
        if ([5, 7, 9].includes(jupAspectDistance)) {
          cancellationFactors.push('Benefic Jupiter aspects Mars (5th/7th/9th drishti)');
        }
      }
    }

    const isCancelled = cancellationFactors.length > 0;
    const isIndeterminate = isTimeUnavailable;

    let isManglik = false;
    let effectiveManglik = false;
    let severity: ManglikSeverity = 'NONE';

    if (isIndeterminate) {
      severity = 'INDETERMINATE';
    } else {
      isManglik = isManglikFromLagna;
      effectiveManglik = isManglik && !isCancelled;
      if (effectiveManglik) {
        if (houseFromLagna === 7 || houseFromLagna === 8) {
          severity = 'HIGH';
        } else if (houseFromLagna === 1 || houseFromLagna === 4) {
          severity = 'MEDIUM';
        } else {
          severity = 'LOW';
        }
      }
    }

    const rashiDef = getRashiByLongitude(marsPos.longitude);

    return {
      isManglik,
      marsPlacement: {
        rashiIndex: marsRashi,
        rashiName: rashiDef.sanskritName,
        longitude: marsPos.longitude,
        houseFromLagna,
        houseFromMoon,
        houseFromVenus,
      },
      manglikHousesFromLagna: isManglikFromLagna && typeof houseFromLagna === 'number' ? [houseFromLagna] : [],
      manglikHousesFromMoon: isManglikFromMoon && typeof houseFromMoon === 'number' ? [houseFromMoon] : [],
      manglikHousesFromVenus: isManglikFromVenus && typeof houseFromVenus === 'number' ? [houseFromVenus] : [],
      severity,
      cancellationFactors,
      isCancelled,
      effectiveManglik,
      isIndeterminate,
      statusFromLagna,
      statusFromMoon,
      statusFromVenus,
      status: isIndeterminate ? 'Indeterminate' : (effectiveManglik ? 'Present' : 'Not Present'),
    };
  }

  /**
   * Evaluates pairwise Manglik status between two charts.
   * If either partner has indeterminate Lagna due to missing birth time,
   * verdict is strictly set to INDETERMINATE_BIRTH_TIME_REQUIRED.
   */
  public compareManglikDosha(
    mangalA: ManglikStatus,
    mangalB: ManglikStatus
  ): ManglikComparisonResult {
    if (mangalA.isIndeterminate || mangalB.isIndeterminate) {
      return {
        personA: mangalA,
        personB: mangalB,
        verdict: 'INDETERMINATE_BIRTH_TIME_REQUIRED',
        isDoshaCancelledByMatch: false,
        explanation: 'Manglik status from Lagna cannot be definitively concluded because birth time is unavailable for one or both partners. Verified birth time is required to evaluate house positions from Lagna.',
      };
    }

    const isAEffective = mangalA.effectiveManglik;
    const isBEffective = mangalB.effectiveManglik;

    if (!isAEffective && !isBEffective) {
      return {
        personA: mangalA,
        personB: mangalB,
        verdict: 'BOTH_NON_MANGLIK',
        isDoshaCancelledByMatch: true,
        explanation: 'Both individuals are Non-Manglik from Lagna; no Manglik Dosha friction exists.',
      };
    }

    if (isAEffective && isBEffective) {
      return {
        personA: mangalA,
        personB: mangalB,
        verdict: 'BOTH_MANGLIK',
        isDoshaCancelledByMatch: true,
        explanation: 'Both individuals possess active Manglik placement from Lagna; Dosha is mutually matched and neutralized.',
      };
    }

    return {
      personA: mangalA,
      personB: mangalB,
      verdict: 'MANGLIK_MISMATCH',
      isDoshaCancelledByMatch: false,
      explanation: 'Manglik mismatch detected: One individual is Manglik from Lagna while the other is Non-Manglik.',
    };
  }
}
