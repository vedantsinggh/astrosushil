import { YogaChartContext, YogaResult, YogaCondition } from '../yoga.types';

export function evaluateNabhasaYogas(ctx: YogaChartContext): YogaResult[] {
  const results: YogaResult[] = [];
  const dist = ctx.distribution;

  // 1. ASHRAYA YOGAS (Movable, Fixed, Dual)
  {
    // Rajju Yoga: All 7 planets in Movable signs
    const isRajju = dist.movableCount === 7;
    results.push({
      id: 'YOGA_NABHASA_RAJJU',
      canonicalName: 'Rajju Yoga',
      sanskritName: 'Rajju Nabhasa Yoga',
      category: 'NABHASA',
      isDetected: isRajju,
      varga: ctx.varga,
      convention: 'Classical Parashari (BPHS Ch. 35 - Ashraya)',
      evidence: {
        conditions: [
          {
            id: 'ALL_PLANETS_IN_MOVABLE_SIGNS',
            description: 'All 7 classical planets (Sun..Saturn) must occupy Movable (Chara) signs (1, 4, 7, 10)',
            satisfied: isRajju,
            expected: '7 in Movable signs',
            observed: `${dist.movableCount} planets in Movable signs`,
          },
        ],
        involvedPlanets: [],
        involvedHouses: [],
        relationships: [],
      },
    });

    // Musala Yoga: All 7 planets in Fixed signs
    const isMusala = dist.fixedCount === 7;
    results.push({
      id: 'YOGA_NABHASA_MUSALA',
      canonicalName: 'Musala Yoga',
      sanskritName: 'Musala Nabhasa Yoga',
      category: 'NABHASA',
      isDetected: isMusala,
      varga: ctx.varga,
      convention: 'Classical Parashari (BPHS Ch. 35 - Ashraya)',
      evidence: {
        conditions: [
          {
            id: 'ALL_PLANETS_IN_FIXED_SIGNS',
            description: 'All 7 classical planets (Sun..Saturn) must occupy Fixed (Sthira) signs (2, 5, 8, 11)',
            satisfied: isMusala,
            expected: '7 in Fixed signs',
            observed: `${dist.fixedCount} planets in Fixed signs`,
          },
        ],
        involvedPlanets: [],
        involvedHouses: [],
        relationships: [],
      },
    });

    // Nala Yoga: All 7 planets in Dual signs
    const isNala = dist.dualCount === 7;
    results.push({
      id: 'YOGA_NABHASA_NALA',
      canonicalName: 'Nala Yoga',
      sanskritName: 'Nala Nabhasa Yoga',
      category: 'NABHASA',
      isDetected: isNala,
      varga: ctx.varga,
      convention: 'Classical Parashari (BPHS Ch. 35 - Ashraya)',
      evidence: {
        conditions: [
          {
            id: 'ALL_PLANETS_IN_DUAL_SIGNS',
            description: 'All 7 classical planets (Sun..Saturn) must occupy Dual (Dvisvabhava) signs (3, 6, 9, 12)',
            satisfied: isNala,
            expected: '7 in Dual signs',
            observed: `${dist.dualCount} planets in Dual signs`,
          },
        ],
        involvedPlanets: [],
        involvedHouses: [],
        relationships: [],
      },
    });
  }

  // 2. AKRITI YOGAS (Pattern Formations)
  {
    // Shringataka Yoga: All 7 planets in Trikona houses (1, 5, 9)
    const trikonaOccupantsCount = dist.occupiedHouses.filter((h) => h === 1 || h === 5 || h === 9).length;
    const isOnlyTrikonas =
      dist.occupiedHouses.every((h) => h === 1 || h === 5 || h === 9) && dist.occupiedHouses.length > 0;
    results.push({
      id: 'YOGA_NABHASA_SHRINGATAKA',
      canonicalName: 'Shringataka Yoga',
      sanskritName: 'Shringataka Nabhasa Yoga',
      category: 'NABHASA',
      isDetected: isOnlyTrikonas,
      varga: ctx.varga,
      convention: 'Classical Parashari (BPHS Ch. 35 - Akriti)',
      evidence: {
        conditions: [
          {
            id: 'ALL_PLANETS_IN_TRIKONAS',
            description: 'All 7 classical planets occupy exclusively the Trikona houses (1, 5, 9)',
            satisfied: isOnlyTrikonas,
            expected: 'Houses 1, 5, and 9 only',
            observed: `Occupied houses: [${dist.occupiedHouses.join(', ')}]`,
          },
        ],
        involvedPlanets: [],
        involvedHouses: dist.occupiedHouses.map((h) => ctx.houses[h]),
        relationships: [],
      },
    });

    // Shakata Yoga (Nabhasa): All 7 planets in 1st and 7th houses only
    const isShakata =
      dist.occupiedHouses.every((h) => h === 1 || h === 7) && dist.occupiedHouses.length > 0;
    results.push({
      id: 'YOGA_NABHASA_SHAKATA',
      canonicalName: 'Shakata Yoga (Nabhasa)',
      sanskritName: 'Shakata Nabhasa Yoga',
      category: 'NABHASA',
      isDetected: isShakata,
      varga: ctx.varga,
      convention: 'Classical Parashari (BPHS Ch. 35 - Akriti)',
      evidence: {
        conditions: [
          {
            id: 'ALL_PLANETS_IN_1_AND_7',
            description: 'All 7 classical planets occupy exclusively the 1st and 7th houses',
            satisfied: isShakata,
            expected: 'Houses 1 and 7 only',
            observed: `Occupied houses: [${dist.occupiedHouses.join(', ')}]`,
          },
        ],
        involvedPlanets: [],
        involvedHouses: dist.occupiedHouses.map((h) => ctx.houses[h]),
        relationships: [],
      },
    });

    // Vihaga Yoga: All 7 planets in 4th and 10th houses only
    const isVihaga =
      dist.occupiedHouses.every((h) => h === 4 || h === 10) && dist.occupiedHouses.length > 0;
    results.push({
      id: 'YOGA_NABHASA_VIHAGA',
      canonicalName: 'Vihaga Yoga',
      sanskritName: 'Vihaga Nabhasa Yoga',
      category: 'NABHASA',
      isDetected: isVihaga,
      varga: ctx.varga,
      convention: 'Classical Parashari (BPHS Ch. 35 - Akriti)',
      evidence: {
        conditions: [
          {
            id: 'ALL_PLANETS_IN_4_AND_10',
            description: 'All 7 classical planets occupy exclusively the 4th and 10th houses',
            satisfied: isVihaga,
            expected: 'Houses 4 and 10 only',
            observed: `Occupied houses: [${dist.occupiedHouses.join(', ')}]`,
          },
        ],
        involvedPlanets: [],
        involvedHouses: dist.occupiedHouses.map((h) => ctx.houses[h]),
        relationships: [],
      },
    });
  }

  // 3. SANKHYA YOGAS (Number of occupied signs by 7 classical planets)
  {
    const sankhyaConfigs = [
      { count: 7, id: 'YOGA_NABHASA_VALLAKI', name: 'Vallaki Yoga', sanskrit: 'Vallaki (Veena) Sankhya Yoga' },
      { count: 6, id: 'YOGA_NABHASA_DAMA', name: 'Dama Yoga', sanskrit: 'Dama (Damini) Sankhya Yoga' },
      { count: 5, id: 'YOGA_NABHASA_PASHA', name: 'Pasha Yoga', sanskrit: 'Pasha Sankhya Yoga' },
      { count: 4, id: 'YOGA_NABHASA_KEDARA', name: 'Kedara Yoga', sanskrit: 'Kedara Sankhya Yoga' },
      { count: 3, id: 'YOGA_NABHASA_SHULA', name: 'Shula Yoga', sanskrit: 'Shula Sankhya Yoga' },
      { count: 2, id: 'YOGA_NABHASA_YUGA', name: 'Yuga Yoga', sanskrit: 'Yuga Sankhya Yoga' },
      { count: 1, id: 'YOGA_NABHASA_GOLA', name: 'Gola Yoga', sanskrit: 'Gola Sankhya Yoga' },
    ];

    for (const s of sankhyaConfigs) {
      const isDetected = dist.occupiedSignsCount === s.count;
      results.push({
        id: s.id,
        canonicalName: s.name,
        sanskritName: s.sanskrit,
        category: 'NABHASA',
        isDetected,
        varga: ctx.varga,
        convention: 'Classical Parashari (BPHS Ch. 35 - Sankhya)',
        evidence: {
          conditions: [
            {
              id: 'OCCUPIED_SIGNS_COUNT',
              description: `All 7 classical planets occupy exactly ${s.count} signs`,
              satisfied: isDetected,
              expected: `${s.count} signs`,
              observed: `${dist.occupiedSignsCount} signs (Rashis: [${dist.occupiedSigns.join(', ')}])`,
            },
          ],
          involvedPlanets: [],
          involvedHouses: [],
          relationships: [],
        },
      });
    }
  }

  return results;
}

