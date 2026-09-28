import { YogaChartContext, YogaResult, YogaCondition } from '../yoga.types';

export function evaluateViparitaYogas(ctx: YogaChartContext): YogaResult[] {
  const results: YogaResult[] = [];

  const lord6 = ctx.houseLords[6];
  const lord8 = ctx.houseLords[8];
  const lord12 = ctx.houseLords[12];

  const p6Evidence = ctx.planets[lord6];
  const p8Evidence = ctx.planets[lord8];
  const p12Evidence = ctx.planets[lord12];

  const dusthanaHouses = [6, 8, 12];

  // 1. HARSHA YOGA (6th lord in 6, 8, 12)
  {
    const isHarsha = dusthanaHouses.includes(p6Evidence.house);
    const conditions: YogaCondition[] = [
      {
        id: '6TH_LORD_IN_DUSTHANA',
        description: `6th house lord (${lord6}) must be placed in a Dusthana house (6th, 8th, or 12th)`,
        satisfied: isHarsha,
        expected: '6, 8, or 12',
        observed: p6Evidence.house,
      },
    ];

    results.push({
      id: 'YOGA_HARSHA',
      canonicalName: 'Harsha Yoga',
      sanskritName: 'Harsha Viparita Raja Yoga',
      category: 'VIPARITA',
      isDetected: isHarsha,
      varga: ctx.varga,
      convention: 'Classical Uttara Kalamrita & Phaladeepika',
      evidence: {
        conditions,
        involvedPlanets: [p6Evidence],
        involvedHouses: [ctx.houses[6], ctx.houses[p6Evidence.house]],
        relationships: [],
      },
    });
  }

  // 2. SARALA YOGA (8th lord in 6, 8, 12)
  {
    const isSarala = dusthanaHouses.includes(p8Evidence.house);
    const conditions: YogaCondition[] = [
      {
        id: '8TH_LORD_IN_DUSTHANA',
        description: `8th house lord (${lord8}) must be placed in a Dusthana house (6th, 8th, or 12th)`,
        satisfied: isSarala,
        expected: '6, 8, or 12',
        observed: p8Evidence.house,
      },
    ];

    results.push({
      id: 'YOGA_SARALA',
      canonicalName: 'Sarala Yoga',
      sanskritName: 'Sarala Viparita Raja Yoga',
      category: 'VIPARITA',
      isDetected: isSarala,
      varga: ctx.varga,
      convention: 'Classical Uttara Kalamrita & Phaladeepika',
      evidence: {
        conditions,
        involvedPlanets: [p8Evidence],
        involvedHouses: [ctx.houses[8], ctx.houses[p8Evidence.house]],
        relationships: [],
      },
    });
  }

  // 3. VIMALA YOGA (12th lord in 6, 8, 12)
  {
    const isVimala = dusthanaHouses.includes(p12Evidence.house);
    const conditions: YogaCondition[] = [
      {
        id: '12TH_LORD_IN_DUSTHANA',
        description: `12th house lord (${lord12}) must be placed in a Dusthana house (6th, 8th, or 12th)`,
        satisfied: isVimala,
        expected: '6, 8, or 12',
        observed: p12Evidence.house,
      },
    ];

    results.push({
      id: 'YOGA_VIMALA',
      canonicalName: 'Vimala Yoga',
      sanskritName: 'Vimala Viparita Raja Yoga',
      category: 'VIPARITA',
      isDetected: isVimala,
      varga: ctx.varga,
      convention: 'Classical Uttara Kalamrita & Phaladeepika',
      evidence: {
        conditions,
        involvedPlanets: [p12Evidence],
        involvedHouses: [ctx.houses[12], ctx.houses[p12Evidence.house]],
        relationships: [],
      },
    });
  }

  return results;
}

