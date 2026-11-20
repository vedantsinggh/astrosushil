import { describe, it, expect } from 'vitest';
import { evaluateTajikaSixteenYogas, TajikaSixteenYogasResult, TajikaYogaOptions } from '../../src/tajika-extended';
import { tajikaTestChart } from './tajika-extended-helpers';

/**
 * Each case is a worked example from P.V.R. Narasimha Rao, "Vedic Astrology: An Integrated Approach" (2000), ch. 29
 * (definitions of the 16 Tajika yogas after Tajika Neelakanthi), with the hand reasoning written out. Planets the
 * example does not mention are parked where they form no relevant contact. Longitudes are sidereal degrees.
 */
const run = (asc: number, lons: Record<string, number | [number, boolean]>, opts?: TajikaYogaOptions) =>
  evaluateTajikaSixteenYogas(tajikaTestChart(asc, { RAHU: 0, KETU: 180, ...lons }), opts);
const occ = (r: TajikaSixteenYogasResult, id: string) => r.yogas.find((y) => y.id === id)!.occurrences;

describe('Tajika 16 yogas — structure', () => {
  it('always returns all 16 yogas with citations and the provisional flag', () => {
    const r = run(1, { SUN: 15, MOON: 75, MARS: 135, MERCURY: 45, JUPITER: 255, VENUS: 315, SATURN: 165 });
    expect(r.yogas.map((y) => y.id)).toEqual([
      'IKKAVALA', 'INDUVARA', 'ITHASALA', 'ISHRAFA', 'NAKTA', 'YAMAYA', 'MANAHOO', 'KAMBOOLA',
      'GAIRI_KAMBOOLA', 'KHALLASARA', 'RADDA', 'DUPHALI_KUTTHA', 'DUTTHOTTHA_DAVIRA', 'TAMBIRA', 'KUTTHA', 'DURUPHA',
    ]);
    for (const y of r.yogas) expect(y.source).toMatch(/Neelakanthi.*§29\.2\.\d+/);
    expect(r.provisional).toBe(true);
  });
});

describe('§29.2.1 Ikkavala / §29.2.2 Induvara', () => {
  it('Ikkavala when no planet is in 3/6/9/12', () => {
    // Lagna Ar: houses 1 (Ar), 2 (Ta), 4 (Cn), 5 (Le), 7, 8, 10, 11 only.
    const r = run(1, { SUN: 5, MOON: 35, MARS: 95, MERCURY: 125, JUPITER: 185, VENUS: 215, SATURN: 275 });
    expect(occ(r, 'IKKAVALA')).toHaveLength(1);
    expect(occ(r, 'INDUVARA')).toHaveLength(0);
  });
  it('Induvara when every planet is in 3/6/9/12', () => {
    const r = run(1, { SUN: 65, MOON: 155, MARS: 245, MERCURY: 335, JUPITER: 70, VENUS: 160, SATURN: 250 });
    expect(occ(r, 'INDUVARA')).toHaveLength(1);
    expect(occ(r, 'IKKAVALA')).toHaveLength(0);
  });
});

describe('§29.2.3 Ithasala and §29.2.4 Ishrafa', () => {
  const others = { SUN: 290, MARS: 250, MERCURY: 315, JUPITER: 20, SATURN: 50 };
  const moonVenus = (r: TajikaSixteenYogasResult, id: string) => occ(r, id).find((o) => o.roles.faster === 'MOON' && o.roles.slower === 'VENUS');

  it('Vartamana: Moon 14° Le, Venus 19° Li (sextile, gap 5° within both orbs)', () => {
    const o = moonVenus(run(1, { ...others, MOON: 134, VENUS: 199 }), 'ITHASALA')!;
    expect(o.variant).toBe('VARTAMANA');
    expect(o.evidence[0].aspect).toBe('SEXTILE');
    expect(o.evidence[0].degreeGap).toBeCloseTo(5, 9);
    expect(o.evidence[0].allowedOrb).toBe(7); // min(12, 7)
    expect(o.evidence[0].motion).toBe('APPLYING');
  });
  it('Poorna: Moon 18°25\' Le, Venus 19° Li (gap 0°35\' < 1°)', () => {
    expect(moonVenus(run(1, { ...others, MOON: 138 + 25 / 60, VENUS: 199 }), 'ITHASALA')!.variant).toBe('POORNA');
  });
  it('Bhavishyat: Moon 13°35\' Le, Venus 21°20\' Li (gap 7°45\' > 7°, enters orb after 0°45\')', () => {
    const r = run(1, { ...others, MOON: 133 + 35 / 60, VENUS: 201 + 20 / 60 });
    expect(moonVenus(r, 'ITHASALA')!.variant).toBe('BHAVISHYAT');
    // With the half-sum orb (12 + 7) / 2 = 9.5° the same pair is a present (Vartamana) Ithasala.
    expect(moonVenus(run(1, { ...others, MOON: 133 + 35 / 60, VENUS: 201 + 20 / 60 }, { orbRule: 'HALF_SUM' }), 'ITHASALA')!.variant).toBe('VARTAMANA');
  });
  it('Ishrafa: Moon 23° Le, Venus 19° Li (faster planet more advanced)', () => {
    const r = run(1, { ...others, MOON: 143, VENUS: 199 });
    expect(moonVenus(r, 'ISHRAFA')).toBeDefined();
    expect(moonVenus(r, 'ITHASALA')).toBeUndefined();
  });
  it('retrograde faster planet: ahead = Ithasala (Mars 21° Cp, Mercury R 23° Vi); behind = no Ithasala (Mercury R 18° Ge, Mars 18°10\' Li)', () => {
    const a = run(1, { SUN: 120, MOON: 30, MARS: 291, MERCURY: [173, true], JUPITER: 20, VENUS: 340, SATURN: 50 });
    expect(occ(a, 'ITHASALA').some((o) => o.roles.faster === 'MERCURY' && o.roles.slower === 'MARS')).toBe(true);
    const b = run(1, { SUN: 120, MOON: 30, MARS: 198 + 10 / 60, MERCURY: [78, true], JUPITER: 20, VENUS: 340, SATURN: 50 });
    expect(occ(b, 'ITHASALA').some((o) => o.roles.faster === 'MERCURY' && o.roles.slower === 'MARS')).toBe(false);
    expect(occ(b, 'ISHRAFA').some((o) => o.roles.faster === 'MERCURY' && o.roles.slower === 'MARS')).toBe(true);
  });
});

describe('§29.2.5 Nakta / §29.2.6 Yamaya (example uses the 2/12 aspect -> includeSemiSextile)', () => {
  // Lagna Ta; Venus 13° Ge and Mars 15° Sc have no aspect (6/8).
  it('Nakta: faster Moon 11° Cn applies to both', () => {
    const r = run(2, { SUN: 320, MOON: 101, MARS: 225, MERCURY: 290, JUPITER: 175, VENUS: 73, SATURN: 140 }, { includeSemiSextile: true });
    expect(occ(r, 'NAKTA').some((o) => o.roles.intermediary === 'MOON' && [o.roles.first, o.roles.second].sort().join() === 'MARS,VENUS')).toBe(true);
  });
  it('Yamaya: slower Jupiter 16° Cn receives both', () => {
    const r = run(2, { SUN: 320, MOON: 175, MARS: 225, MERCURY: 290, JUPITER: 106, VENUS: 73, SATURN: 140 }, { includeSemiSextile: true });
    expect(occ(r, 'YAMAYA').some((o) => o.roles.intermediary === 'JUPITER' && [o.roles.first, o.roles.second].sort().join() === 'MARS,VENUS')).toBe(true);
    expect(occ(r, 'NAKTA').some((o) => o.roles.intermediary === 'JUPITER')).toBe(false);
  });
});

describe('§29.2.7 Manahoo', () => {
  it('Moon 18° Cn -> Jupiter 21° Pi Ithasala, Saturn 19° Cn conjunct the faster Moon (1° <= 12°)', () => {
    const r = run(1, { SUN: 50, MOON: 108, MARS: 255, MERCURY: 70, JUPITER: 351, VENUS: 25, SATURN: 109 });
    expect(occ(r, 'MANAHOO').some((o) => o.roles.faster === 'MOON' && o.roles.slower === 'JUPITER' && o.roles.obstructor === 'SATURN')).toBe(true);
  });
  it('absent when Saturn is in another sign (conjunction-only default)', () => {
    const r = run(1, { SUN: 50, MOON: 108, MARS: 255, MERCURY: 70, JUPITER: 351, VENUS: 25, SATURN: 289 });
    expect(occ(r, 'MANAHOO').some((o) => o.roles.slower === 'JUPITER')).toBe(false);
  });
});

describe('§29.2.8 Kamboola / §29.2.9 Gairi-Kamboola', () => {
  it('Kamboola: Mars 23° Sc -> Jupiter 26° Pi, Moon 22° Le applies to Mars', () => {
    const r = run(1, { SUN: 20, MOON: 142, MARS: 233, MERCURY: 50, JUPITER: 356, VENUS: 80, SATURN: 175 });
    expect(occ(r, 'KAMBOOLA').some((o) => o.roles.faster === 'MARS' && o.roles.slower === 'JUPITER')).toBe(true);
  });
  it('Gairi-Kamboola: Mars 1° Cp -> Jupiter 2° Pi, Moon 29°10\' Vi; at 0° Li the Moon applies to Mars (square) and to own-sign Venus 3° Li', () => {
    const r = run(1, { SUN: 110, MOON: 179 + 10 / 60, MARS: 271, MERCURY: 95, JUPITER: 332, VENUS: 183, SATURN: 45 });
    const o = occ(r, 'GAIRI_KAMBOOLA').find((x) => x.roles.faster === 'MARS' && x.roles.slower === 'JUPITER')!;
    expect(o).toBeDefined();
    // Moon: navamsha Vi (Mercury), drekkana Ta (Venus), hadda Saturn; not exalted/debilitated -> effective.
    expect(o.effective).toBe(true);
    expect(occ(r, 'KAMBOOLA').some((x) => x.roles.faster === 'MARS')).toBe(false);
  });
});

describe('§29.2.10 Khallasara', () => {
  it('Lagna Vi; Moon 1° Ar, lagna lord Mercury 15° Ta, Jupiter 29° Ge; no Ithasala of Mercury with either', () => {
    const r = run(6, { SUN: 130, MOON: 1, MARS: 250, MERCURY: 45, JUPITER: 89, VENUS: 160, SATURN: 310 });
    expect(occ(r, 'KHALLASARA').some((o) => o.roles.lagnesha === 'MERCURY' && o.roles.x === 'JUPITER')).toBe(true);
  });
});

describe('§29.2.11 Radda / §29.2.16 Durupha', () => {
  it('Radda: Lagna Ar, Mars 15° Sg -> debilitated Saturn 20° Ar', () => {
    const r = run(1, { SUN: 130, MOON: 300, MARS: 255, MERCURY: 160, JUPITER: 70, VENUS: 190, SATURN: 20 });
    expect(occ(r, 'RADDA').some((o) => o.roles.faster === 'MARS' && o.roles.slower === 'SATURN')).toBe(true);
  });
  it('Durupha: Lagna Ar, debilitated Mars 15° Cn -> debilitated Saturn 17° Ar (square)', () => {
    const r = run(1, { SUN: 160, MOON: 300, MARS: 105, MERCURY: 190, JUPITER: 70, VENUS: 230, SATURN: 17 });
    expect(occ(r, 'DURUPHA').some((o) => o.roles.faster === 'MARS' && o.roles.slower === 'SATURN')).toBe(true);
  });
});

describe('§29.2.12 Duphali-kuttha / §29.2.13 Dutthottha-davira', () => {
  it('Duphali-kuttha: weak Mars 25° Ge -> exalted Saturn 27° Li', () => {
    // Mars Pancha-vargiya by hand (chart below): Kshetra Mercury (natural enemy, same sign -> adhishatru) 7.5;
    // Uchcha |85 − 118| = 33 -> 3.667; Hadda Ge 24-30 Saturn (neutral + temporal enemy, Li 5th) 3.75;
    // Drekkana Ge 20-30 -> Aq Saturn 2.5; Navamsha Ge 25° -> 8th from Li = Ta Venus (neutral + Aq 9th enemy) 1.25.
    // Total 18.667 / 4 = 4.667 < 5 -> weak; Mars not exalted, not own sign.
    const r = run(1, { SUN: 130, MOON: 10, MARS: 85, MERCURY: 70, JUPITER: 160, VENUS: 300, SATURN: 207 });
    expect(r.planets.find((p) => p.planet === 'MARS')!.panchaVargiyaBala).toBeCloseTo(4.6667, 4);
    expect(occ(r, 'DUPHALI_KUTTHA').some((o) => o.roles.faster === 'MARS' && o.roles.slower === 'SATURN')).toBe(true);
  });
  it('Dutthottha-davira: Mars 19° Li -> debilitated Saturn 20° Ar (both weak); Saturn linked to exalted Venus 18° Pi (2/12)', () => {
    // Mars in Venus's sign: natural neutral + temporal enemy (Pi is 6th from Li) -> enemy = inimical sign (weak).
    const r = run(1, { SUN: 130, MOON: 280, MARS: 199, MERCURY: 160, JUPITER: 70, VENUS: 348, SATURN: 20 }, { includeSemiSextile: true });
    expect(r.planets.find((p) => p.planet === 'MARS')!.signLordRelationship).toBe('ENEMY');
    expect(occ(r, 'DUTTHOTTHA_DAVIRA').some((o) => o.roles.linked === 'SATURN' && o.roles.strongPlanet === 'VENUS')).toBe(true);
  });
});

describe('§29.2.14 Tambira / §29.2.15 Kuttha', () => {
  it('Tambira: Venus 29°10\' Ta will apply to Mars 2° Le after entering Ge (sextile)', () => {
    const r = run(1, { SUN: 160, MOON: 300, MARS: 122, MERCURY: 190, JUPITER: 250, VENUS: 59 + 10 / 60, SATURN: 280 });
    expect(occ(r, 'TAMBIRA').some((o) => o.roles.faster === 'VENUS' && o.roles.slower === 'MARS')).toBe(true);
  });
  it('Kuttha: Lagna Ta, Sun 21° Ta aspected (trine) by exalted Mercury 16° Vi in the 5th (panaphara)', () => {
    const r = run(2, { SUN: 51, MOON: 250, MARS: 280, MERCURY: 166, JUPITER: 100, VENUS: 20, SATURN: 310 });
    expect(occ(r, 'KUTTHA').some((o) => o.roles.inLagna === 'SUN' && o.roles.aspecting === 'MERCURY')).toBe(true);
  });
});

describe('determinism', () => {
  it('same chart, same result', () => {
    const l = { SUN: 51, MOON: 250, MARS: 280, MERCURY: 166, JUPITER: 100, VENUS: 20, SATURN: 310 };
    expect(JSON.stringify(run(2, l))).toBe(JSON.stringify(run(2, l)));
  });
});

describe('annual-chart wrappers (engine Varshaphala chart)', () => {
  it('evaluates the 2026 annual chart and Pancha-vargiya components sum to the total', async () => {
    const { calculateTajikaAnnualYogas, calculateTajikaAnnualPanchaVargiya } = await import('../../src/tajika-extended');
    const birth = { date: { year: 1990, month: 5, day: 15 }, time: { hour: 14, minute: 30, second: 0 }, timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209 };
    const y = await calculateTajikaAnnualYogas(birth, 2026);
    expect(y.yogas.yogas).toHaveLength(16);
    expect(y.annual.solarReturnUtcIso.startsWith('2026-05-15')).toBe(true);
    // Every present Ithasala/Ishrafa row is internally consistent with its own evidence.
    for (const o of [...y.yogas.yogas[2].occurrences, ...y.yogas.yogas[3].occurrences]) {
      const e = o.evidence[0];
      expect(e.aspect).not.toBe('NONE');
      if (o.variant !== 'BHAVISHYAT') expect(Math.abs(e.degreeGap)).toBeLessThanOrEqual(e.allowedOrb);
    }
    const b = await calculateTajikaAnnualPanchaVargiya(birth, 2026);
    for (const p of b.bala.planets) {
      expect(p.total).toBeCloseTo(p.kshetra.score + p.uchcha.score + p.hadda.score + p.drekkana.score + p.navamsha.score, 9);
      expect(p.vimshopaka).toBeCloseTo(p.total / 4, 9);
      expect(p.vimshopaka).toBeLessThanOrEqual(20);
    }
  }, 60000);
});
