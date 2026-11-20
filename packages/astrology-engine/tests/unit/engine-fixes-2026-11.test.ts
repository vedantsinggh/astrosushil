/**
 * 2026-11 engine fixes (interpretation-engine-improvement, agent A0).
 *
 * Expected values are hand-derived from the cited classical rules (independent of engine code)
 * unless a test says "internal-consistency". Golden subject: Apeksha Singh, 08 Jun 2004 08:30 IST,
 * Akbarpur (Ambedkar Nagar) 26.4295 N 82.5343 E (owner approved committing this birth data).
 */
import { describe, it, expect } from 'vitest';
import { AstroChart } from '../../src/chart/astro-chart.types';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { calculatePlanetaryDignity, isMoolatrikona } from '../../src/planets/planetary-dignity';
import {
  getFunctionalNature,
  getYogakarakas,
  classifyFunctionalNatures,
} from '../../src/planets/functional-nature';
import { calculateCharaKarakas, rankCharaKarakas } from '../../src/planets/planetary-karakas';
import { ArudhaCalculator } from '../../src/jaimini/arudha-calculator';
import { JaiminiCalculator } from '../../src/jaimini/jaimini-calculator';
import { YogaCalculator } from '../../src/yoga/yoga-calculator';
import { YogaResult } from '../../src/yoga/yoga.types';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { DEFAULT_ASTROLOGY_CONFIG } from '../../src/configuration/astrology-config';
import { TransitIngressSolver } from '../../src/transit/transit-ingress.solver';
import { getMeanAyanamsa, getTrueAyanamsa } from '../../src/ayanamsa/ayanamsa';

const { SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN, RAHU, KETU } = PlanetSymbol;

type Placement = { sign: number; deg?: number; retro?: boolean };

/** Minimal whole-sign chart: ascendant sign + planet signs (degree 10 unless given). */
function chartOf(ascSign: number, placements: Partial<Record<PlanetSymbol, Placement>>): AstroChart {
  const defaults: Record<string, Placement> = {
    SUN: { sign: 1 }, MOON: { sign: 1 }, MARS: { sign: 1 }, MERCURY: { sign: 1 }, JUPITER: { sign: 1 },
    VENUS: { sign: 1 }, SATURN: { sign: 1 }, RAHU: { sign: 1 }, KETU: { sign: 7 },
  };
  const planets: AstroChart['planets'] = {} as AstroChart['planets'];
  for (const sym of [SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN, RAHU, KETU]) {
    const pl = placements[sym] ?? defaults[sym];
    const deg = pl.deg ?? 10;
    planets[sym] = {
      planet: sym,
      longitude: (pl.sign - 1) * 30 + deg,
      latitude: 0,
      speedLongitude: pl.retro || sym === RAHU || sym === KETU ? -0.05 : 1,
      isRetrograde: pl.retro ?? (sym === RAHU || sym === KETU),
      rashiIndex: pl.sign,
      rashiName: 'x',
      degreeInRashi: deg,
      nakshatraIndex: 1,
      nakshatraName: 'x',
      pada: 1,
      nakshatraLord: KETU,
    };
  }
  return {
    metadata: {
      engineVersion: 'test',
      calculationTimestampIso: '2026-01-01T00:00:00Z',
      providerName: 'test',
      providerVersion: '1',
      config: { ...DEFAULT_ASTROLOGY_CONFIG },
      normalizedTime: {} as AstroChart['metadata']['normalizedTime'],
    },
    birthDetails: {
      date: { year: 2000, month: 1, day: 1 },
      time: { hour: 12, minute: 0, second: 0 },
      timezone: 'UTC',
      latitude: 0,
      longitude: 0,
    },
    ascendant: {
      name: 'Ascendant',
      longitude: (ascSign - 1) * 30 + 15,
      rashiIndex: ascSign,
      rashiName: 'x',
      degreeInRashi: 15,
      nakshatraIndex: 1,
      nakshatraName: 'x',
      pada: 1,
    },
    planets,
  } as AstroChart;
}

const yogas = new YogaCalculator();
const all = (chart: AstroChart): YogaResult[] => {
  const r = yogas.evaluateYogas(chart, { includeUndetected: true });
  return [...r.detectedYogas, ...(r.undetectedYogas ?? [])];
};
const byId = (list: YogaResult[], id: string) => list.find((y) => y.id === id);

// ---------------------------------------------------------------------------------------------
describe('Moon moolatrikona (BPHS ch. 3; provisional convention)', () => {
  it('0–3° Taurus is exaltation, 3–20° moolatrikona, 20–30° exaltation sign (default)', () => {
    expect(calculatePlanetaryDignity(MOON, 2, 2)).toBe('EXALTED');
    expect(calculatePlanetaryDignity(MOON, 2, 3)).toBe('EXALTED');
    expect(calculatePlanetaryDignity(MOON, 2, 10)).toBe('MOOLATRIKONA');
    expect(calculatePlanetaryDignity(MOON, 2, 20)).toBe('MOOLATRIKONA');
    expect(calculatePlanetaryDignity(MOON, 2, 25)).toBe('EXALTED');
  });
  it('the "rest of Taurus" reading is available as an option', () => {
    expect(calculatePlanetaryDignity(MOON, 2, 25, undefined, { moonMoolatrikona: 'TAURUS_REST_OF_SIGN' })).toBe('MOOLATRIKONA');
    expect(isMoolatrikona(MOON, 2, 25, { moonMoolatrikona: 'TAURUS_REST_OF_SIGN' })).toBe(true);
    expect(isMoolatrikona(MOON, 2, 25)).toBe(false);
  });
  it('other planets unchanged (Mercury Virgo split)', () => {
    expect(calculatePlanetaryDignity(MERCURY, 6, 10)).toBe('EXALTED');
    expect(calculatePlanetaryDignity(MERCURY, 6, 18)).toBe('MOOLATRIKONA');
    expect(calculatePlanetaryDignity(MERCURY, 6, 25)).toBe('OWN_SIGN');
  });
});

// ---------------------------------------------------------------------------------------------
describe('Functional nature (BPHS ch. 34; Laghu Parashari ch. 2)', () => {
  it('Yogakaraka matrix for all 12 lagnas (standard Parashari values)', () => {
    const expected: Record<number, PlanetSymbol[]> = {
      1: [], 2: [SATURN], 3: [], 4: [MARS], 5: [MARS], 6: [], 7: [SATURN], 8: [], 9: [], 10: [VENUS], 11: [VENUS], 12: [],
    };
    for (let lagna = 1; lagna <= 12; lagna++) expect(getYogakarakas(lagna)).toEqual(expected[lagna]);
  });
  it('Cancer: Mars owns kendra 10 and trikona 5', () => {
    const f = getFunctionalNature(4, MARS);
    expect(f.lordships).toEqual([5, 10]);
    expect(f.nature).toBe('yogakaraka');
    expect(f.reason).toBe('Yogakaraka: owns both kendra 10th and trikona 5th.');
  });
  it('kendradhipati and maraka flags', () => {
    expect(getFunctionalNature(3, JUPITER).kendradhipatiDosha).toBe(true); // Gemini: Jupiter 7, 10
    expect(getFunctionalNature(6, JUPITER).kendradhipatiDosha).toBe(true); // Virgo: Jupiter 4, 7
    expect(getFunctionalNature(9, MERCURY).kendradhipatiDosha).toBe(true); // Sagittarius: Mercury 7, 10
    expect(getFunctionalNature(1, SATURN).kendradhipatiDosha).toBe(false); // natural malefic
    expect(getFunctionalNature(1, VENUS).maraka).toBe(true); // Aries: Venus 2, 7
    expect(getFunctionalNature(1, JUPITER).maraka).toBe(false); // Aries: Jupiter 9, 12
  });
  it('Lagna lord favourable; Sun/Moon 8th lord neutral; nodes shadow', () => {
    expect(getFunctionalNature(1, MARS).nature).toBe('favourable'); // owns 1 and 8
    expect(getFunctionalNature(10, SUN).nature).toBe('neutral'); // Capricorn: Sun owns 8
    expect(getFunctionalNature(5, RAHU).nature).toBe('shadow');
    expect(classifyFunctionalNatures(4)).toHaveLength(9);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Arudha padas (BPHS ch. 29; 10-sign shift; provisional)', () => {
  const al = (lagna: number, signs: Partial<Record<PlanetSymbol, number>>, opts = {}) =>
    ArudhaCalculator.calculateAllArudhas(lagna, signs, opts).find((p) => p.houseNumber === 1)!;

  it('lord in the 1st: raw pada in the 1st → 10th from the house', () => {
    expect(al(1, { [MARS]: 1 }).signIndex).toBe(10);
  });
  it('lord in the 7th: raw pada in the 1st → 10th from the house (was 4th before the fix)', () => {
    const p = al(1, { [MARS]: 7 });
    expect(p.signIndex).toBe(10);
    expect(p.exceptionApplied).toBe('TEN_SIGN_SHIFT');
    expect(p.exceptionDetail).toBe('PADA_IN_1ST_FROM_HOUSE');
  });
  it('lord in the 4th: raw pada in the 7th → 10 signs on = 4th from the house', () => {
    const p = al(1, { [MARS]: 4 });
    expect(p.rawPadaSignIndex).toBe(7);
    expect(p.signIndex).toBe(4);
    expect(p.exceptionDetail).toBe('PADA_IN_7TH_FROM_HOUSE');
  });
  it('lord in the 10th: raw pada in the 7th → 4th from the house', () => {
    expect(al(1, { [MARS]: 10 }).signIndex).toBe(4);
  });
  it('lord in the 5th: no exception', () => {
    const p = al(1, { [MARS]: 5 });
    expect(p.signIndex).toBe(9);
    expect(p.exceptionApplied).toBe('NONE');
  });
  it('Scorpio uses the stronger co-lord (Mars in Scorpio yields to Ketu)', () => {
    // Mars in Scorpio itself, Ketu in Pisces: Ketu is used (5 signs) → raw 5th from Pisces = Cancer.
    const p = al(8, { [MARS]: 8, [KETU]: 12, [RAHU]: 6 });
    expect(p.lord).toBe(KETU);
    expect(p.signIndex).toBe(4);
    expect(p.lordSelectionReason).toMatch(/occupies the sign itself/);
    // Parashari single ruler: Mars in the 1st → 10th from Scorpio = Leo.
    expect(al(8, { [MARS]: 8, [KETU]: 12 }, { coLordMode: 'SINGLE_RULER' }).signIndex).toBe(5);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Chara karakas: one shared ranking', () => {
  const degrees = { SUN: 23.745, MOON: 2.254, MARS: 26.163, MERCURY: 11.117, JUPITER: 16.681, VENUS: 24.123, SATURN: 19.028, RAHU: 15.36 };
  it('both public implementations agree (golden-chart degrees; independent table in audit 03 §C)', () => {
    const a = calculateCharaKarakas(degrees).map((k) => k.planet);
    const b = new JaiminiCalculator().calculateCharaKarakas(
      Object.fromEntries(Object.entries(degrees).map(([k, v]) => [k, { degreeInRashi: v }])),
    ).map((k) => k.planet);
    expect(a).toEqual([MARS, VENUS, SUN, SATURN, JUPITER, MERCURY, MOON]);
    expect(b).toEqual(a);
  });
  it('8-karaka: Rahu ranked by 30 − degree (14.64 → after Jupiter 16.68)', () => {
    const r = rankCharaKarakas(degrees, 'EIGHT_KARAKA').map((k) => k.planet);
    expect(r).toEqual([MARS, VENUS, SUN, SATURN, JUPITER, RAHU, MERCURY, MOON]);
  });
  it('ties are resolved by the fixed priority and flagged', () => {
    const r = rankCharaKarakas({ SUN: 15, MOON: 15, MARS: 20 });
    expect(r.map((k) => k.planet)).toEqual([MARS, SUN, MOON]);
    expect(r[1].tieResolvedByPriority).toBe(true);
    expect(r[0].tieResolvedByPriority).toBe(false);
    const viaJaimini = new JaiminiCalculator().calculateCharaKarakas({ MOON: { degreeInRashi: 15 }, SUN: { degreeInRashi: 15 } });
    expect(viaJaimini.map((k) => k.planet)).toEqual([SUN, MOON]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Raja / Dhana yogas: relation types and pairs', () => {
  it('Yogakaraka by ownership is labelled OWNERSHIP, never as an association (Cancer, Mars)', () => {
    const y = byId(all(chartOf(4, { [MARS]: { sign: 3 } })), 'YOGA_RAJA_H10_H5')!;
    expect(y.isDetected).toBe(true);
    expect(y.evidence.relationships[0].relationshipType).toBe('OWNERSHIP');
    expect(y.evidence.conditions[0].description).toBe('Yogakaraka: MARS owns both kendra 10 and trikona 5');
    expect(JSON.stringify(y.evidence)).not.toMatch(/associate|conjunct/i);
    expect(y.assessment?.relations).toEqual(['OWNERSHIP']);
  });
  it('general rule, not a Cancer special case: Taurus → Saturn owns 10 and 9 (Dharma-Karmadhipati)', () => {
    const y = byId(all(chartOf(2, { [SATURN]: { sign: 6 } })), 'YOGA_DHARMA_KARMADHIPATI')!;
    expect(y.isDetected).toBe(true);
    expect(y.evidence.relationships[0].relationshipType).toBe('OWNERSHIP');
    expect(y.evidence.conditions[0].observed).toBe('Yogakaraka: SATURN owns both kendra 10 and trikona 9');
  });
  it('7th + 5th pair now evaluated (Cancer: Saturn + Mars conjunct)', () => {
    const y = byId(all(chartOf(4, { [MARS]: { sign: 3 }, [SATURN]: { sign: 3 } })), 'YOGA_RAJA_H7_H5')!;
    expect(y.isDetected).toBe(true);
    expect(y.evidence.relationships[0].relationshipType).toBe('CONJUNCTION');
  });
  it('mutual special aspect counts (Mars 4th + Saturn 10th)', () => {
    // Cancer: Mars (5th lord) in Aries, Saturn (7th lord) in Cancer, 4th from Mars.
    const y = byId(all(chartOf(4, { [MARS]: { sign: 1 }, [SATURN]: { sign: 4 } })), 'YOGA_RAJA_H7_H5')!;
    expect(y.isDetected).toBe(true);
    expect(y.assessment?.relations).toEqual(['MUTUAL_ASPECT']);
    expect(y.evidence.conditions[0].observed).toMatch(/SPECIAL_4TH.*SPECIAL_10TH/);
  });
  it('sign exchange counts (Aries: Sun in Cancer, Moon in Leo → 4th + 5th lords)', () => {
    const y = byId(all(chartOf(1, { [SUN]: { sign: 4 }, [MOON]: { sign: 5 } })), 'YOGA_RAJA_H4_H5')!;
    expect(y.isDetected).toBe(true);
    expect(y.assessment?.relations).toEqual(['SIGN_EXCHANGE']);
  });
  it('one-way aspect is flagged but does not form the yoga', () => {
    // Cancer: Saturn (7th lord) in Aries aspects Gemini (3rd) where Mars (5th lord) sits; not returned.
    const y = byId(all(chartOf(4, { [MARS]: { sign: 3 }, [SATURN]: { sign: 1 } })), 'YOGA_RAJA_H7_H5')!;
    expect(y.isDetected).toBe(false);
    expect(y.assessment?.relations).toEqual(['ONE_WAY_ASPECT']);
    expect(y.assessment?.oneWayAspects).toEqual([{ from: SATURN, to: MARS, aspect: 'SPECIAL_3RD' }]);
  });
  it('no Dhana yoga from single-planet ownership (Capricorn: Saturn owns 1 and 2)', () => {
    const ids = all(chartOf(10, { [SATURN]: { sign: 6 } })).map((y) => y.id);
    expect(ids).not.toContain('YOGA_DHANA_H1_H2');
  });
  it('5th + 11th and 9th + 11th Dhana pairs (Aries: Sun, Jupiter, Saturn conjunct)', () => {
    const list = all(chartOf(1, { [SUN]: { sign: 6 }, [JUPITER]: { sign: 6 }, [SATURN]: { sign: 6 } }));
    expect(byId(list, 'YOGA_DHANA_H5_H11')?.isDetected).toBe(true);
    expect(byId(list, 'YOGA_DHANA_H9_H11')?.isDetected).toBe(true);
    expect(byId(list, 'YOGA_DHANA_H5_H11')?.convention).toMatch(/BPHS ch\. 41/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Other yoga fixes', () => {
  it('Kemadruma formed but cancelled is reported, not hidden', () => {
    // Moon in Aries; 2nd/12th from the Moon empty of Mars..Saturn; Jupiter in Cancer (kendra from Moon).
    const chart = chartOf(1, {
      [MOON]: { sign: 1 }, [SUN]: { sign: 2 }, [MARS]: { sign: 6 }, [MERCURY]: { sign: 6 },
      [JUPITER]: { sign: 4 }, [VENUS]: { sign: 6 }, [SATURN]: { sign: 6 },
    });
    const r = yogas.evaluateYogas(chart);
    expect(r.detectedYogas.map((y) => y.id)).not.toContain('YOGA_KEMADRUMA');
    const k = r.formedButCancelledYogas?.find((y) => y.id === 'YOGA_KEMADRUMA');
    expect(k?.assessment?.formed).toBe(true);
    expect(k?.assessment?.cancelled).toBe(true);
    expect(k?.assessment?.cancellations.find((c) => c.id === 'KEMADRUMA_BHANGA_KENDRA_FROM_MOON')?.satisfied).toBe(true);
  });
  it('Vesi with only Mars and Saturn is tagged MALEFIC', () => {
    const chart = chartOf(4, { [SUN]: { sign: 2 }, [MARS]: { sign: 3 }, [SATURN]: { sign: 3 }, [MERCURY]: { sign: 2 }, [VENUS]: { sign: 2 }, [JUPITER]: { sign: 5 } });
    const v = byId(all(chart), 'YOGA_VESI')!;
    expect(v.isDetected).toBe(true);
    expect(v.assessment?.variant).toBe('MALEFIC');
  });
  it('Gajakesari reports the BPHS disqualifiers as flags (Jupiter debilitated)', () => {
    const g = byId(all(chartOf(1, { [MOON]: { sign: 4 }, [JUPITER]: { sign: 10 } })), 'YOGA_GAJAKESARI')!;
    expect(g.isDetected).toBe(true); // formation unchanged (Phaladeepika form)
    expect(g.assessment?.cancellations.find((c) => c.id === 'BPHS_JUPITER_DEBILITATED')?.satisfied).toBe(true);
    expect(g.convention).toMatch(/Phaladeepika ch\. 6/);
  });
  it('corrected citations', () => {
    const list = all(chartOf(1, { [SUN]: { sign: 7 }, [MERCURY]: { sign: 7 }, [VENUS]: { sign: 10 } }));
    expect(byId(list, 'YOGA_BUDHA_ADITYA')!.convention).not.toMatch(/BPHS Ch\. 38/);
    expect(byId(list, 'YOGA_NEECHA_BHANGA_SUN')!.convention).toMatch(/Phaladeepika ch\. 7/);
    expect(byId(list, 'YOGA_CHANDRA_MANGALA')!.convention).toMatch(/Three Hundred Important Combinations/);
  });
  it('Viparita attaches the dusthana lord condition facts (Cancer: Saturn rules 7 and 8, with Mars)', () => {
    const s = byId(all(chartOf(4, { [SATURN]: { sign: 3 }, [MARS]: { sign: 3 } })), 'YOGA_SARALA')!;
    expect(s.isDetected).toBe(true);
    const c = s.assessment!.cancellations;
    expect(c.find((x) => x.id === 'DUSTHANA_LORD_ALSO_OWNS_KENDRA_OR_TRIKONA')?.satisfied).toBe(true);
    expect(c.find((x) => x.id === 'DUSTHANA_LORD_ASSOCIATED_WITH_KENDRA_TRIKONA_LORD')?.observed).toMatch(/H5 lord MARS: CONJUNCTION/);
  });
  it('planet factors: combustion distance, D9 dignity, supplied Shadbala ratio', () => {
    const chart = chartOf(1, { [SUN]: { sign: 9, deg: 10 }, [MERCURY]: { sign: 9, deg: 15 } });
    const r = yogas.evaluateYogas(chart, { yogaIds: ['YOGA_BUDHA_ADITYA'], shadbalaRatios: { MERCURY: 1.24 } });
    const merc = r.detectedYogas[0].assessment!.planetFactors.find((f) => f.planet === MERCURY)!;
    expect(merc.combustion.distanceFromSun).toBeCloseTo(5, 6);
    expect(merc.combustion.isCombust).toBe(true);
    expect(merc.houseCategories).toEqual(['TRIKONA', 'APOKLIMA']);
    // 255° → navamsa index floor(255 / 3.3333) = 76 → 76 mod 12 = 4 → Leo (5).
    expect(merc.d9?.rashiIndex).toBe(5);
    expect(merc.shadbala?.ratio).toBe(1.24);
    expect(r.detectedYogas[0].evidence.strengthFactors?.[0]).toMatch(/combust by the Sun \(5\.00° from the Sun; orb 14°\)/);
  });
  it('yoga texts describe formation only (no result words)', () => {
    for (const asc of [1, 4, 7, 10]) {
      for (const y of all(chartOf(asc, { [MARS]: { sign: asc }, [JUPITER]: { sign: asc }, [VENUS]: { sign: 12 } }))) {
        const text = JSON.stringify({ n: y.canonicalName, c: y.evidence.conditions, s: y.evidence.strengthFactors });
        expect(text).not.toMatch(/royal|potent|powerful|prosper|wealth generation|enhanced|highest/i);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('Golden chart yogas (Apeksha Singh) — internal-consistency with audit 03/04 hand checks', () => {
  it('reproduces the tabled yogas with corrected labels and the 7+5 pair', async () => {
    const chart = await new ChartCalculator().calculateChart(
      {
        date: { year: 2004, month: 6, day: 8 },
        time: { hour: 8, minute: 30, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 26.4295,
        longitude: 82.5343,
      },
      DEFAULT_ASTROLOGY_CONFIG,
    );
    const r = yogas.evaluateYogas(chart, { computeShadbala: true });
    const ids = r.detectedYogas.map((y) => y.id).sort();
    expect(ids).toEqual(
      [
        'YOGA_BUDHA_ADITYA', 'YOGA_DHANA_H2_H11', 'YOGA_GAJAKESARI', 'YOGA_NABHASA_KEDARA', 'YOGA_RAJA_H10_H5',
        'YOGA_RAJA_H1_H9', 'YOGA_RAJA_H7_H5', 'YOGA_SARALA', 'YOGA_VESI',
      ].sort(),
    );
    const yk = r.detectedYogas.find((y) => y.id === 'YOGA_RAJA_H10_H5')!;
    expect(yk.evidence.relationships[0].relationshipType).toBe('OWNERSHIP');
    expect(r.detectedYogas.find((y) => y.id === 'YOGA_VESI')!.assessment?.variant).toBe('MALEFIC');
    const venus = r.detectedYogas.find((y) => y.id === 'YOGA_DHANA_H2_H11')!.assessment!.planetFactors.find((f) => f.planet === VENUS)!;
    expect(venus.combustion.isCombust).toBe(true);
    expect(venus.combustion.distanceFromSun!).toBeLessThan(0.5);
    expect(r.formedButCancelledYogas?.map((y) => y.id)).toEqual(['YOGA_KEMADRUMA']);
  });
});

// ---------------------------------------------------------------------------------------------
describe('TransitIngressSolver honours ayanamsa and node options', () => {
  const jd = 2453164.625;
  it('default equals true Lahiri for planets and mean Lahiri for the mean node (unchanged)', async () => {
    const def = await new TransitIngressSolver().getPlanetaryState(SATURN, jd);
    const raman = await new TransitIngressSolver(undefined, { ayanamsa: 'RAMAN' }).getPlanetaryState(SATURN, jd);
    const diff = ((raman.longitude - def.longitude + 540) % 360) - 180;
    expect(diff).toBeCloseTo(getTrueAyanamsa(jd, 'LAHIRI') - getTrueAyanamsa(jd, 'RAMAN'), 6);
    const rahuMean = await new TransitIngressSolver().getPlanetaryState(RAHU, jd);
    const rahuMeanRaman = await new TransitIngressSolver(undefined, { ayanamsa: 'RAMAN' }).getPlanetaryState(RAHU, jd);
    expect(((rahuMeanRaman.longitude - rahuMean.longitude + 540) % 360) - 180).toBeCloseTo(
      getMeanAyanamsa(jd, 'LAHIRI') - getMeanAyanamsa(jd, 'RAMAN'),
      6,
    );
  });
  it('TRUE_NODE changes the node longitude', async () => {
    const mean = await new TransitIngressSolver().getPlanetaryState(RAHU, jd);
    const tru = await new TransitIngressSolver(undefined, { nodeCalculation: 'TRUE_NODE' }).getPlanetaryState(RAHU, jd);
    expect(Math.abs(tru.longitude - mean.longitude)).toBeGreaterThan(0.001);
    expect(Math.abs(tru.longitude - mean.longitude)).toBeLessThan(2.5);
  });
});
