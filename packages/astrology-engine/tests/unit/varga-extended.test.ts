/**
 * Extra divisional charts (ADR-016 §6, provisional). Expected values are hand-computed from the cited
 * rule (arithmetic written next to each assertion), never taken from the engine's own output.
 * Sign indices: 1 Ar, 2 Ta, 3 Ge, 4 Cn, 5 Le, 6 Vi, 7 Li, 8 Sc, 9 Sg, 10 Cp, 11 Aq, 12 Pi.
 * Modalities: chara (movable) Ar Cn Li Cp; sthira (fixed) Ta Le Sc Aq; dwiswabhava (dual) Ge Vi Sg Pi.
 * Tolerance: sign indices are exact integers; boundary longitudes are exactly on (or 1e-6 deg inside) a part edge.
 */
import { describe, it, expect } from 'vitest';
import {
  EXTRA_VARGA_TYPES,
  EXTRA_VARGA_DEFINITIONS,
  ExtraVargaCalculator,
  extraVargaSign,
  extraVargaNadiamsaNumber,
  extraVargaDegree,
} from '../../src/varga-extended';
import { DEFAULT_ASTROLOGY_CONFIG } from '../../src/configuration/astrology-config';
import { BirthDetails } from '../../src/input/birth-details';
import { PlanetSymbol } from '../../src/planets/planet.types';

const e = 1e-6; // a hair before a boundary

describe('D5 Panchamsa (PVRNR ch. 6): 6 deg parts; odd Ar,Aq,Sg,Ge,Li; even Ta,Vi,Pi,Cp,Sc', () => {
  it('odd chara sign Aries (0-30)', () => {
    expect(extraVargaSign(0, 'D5')).toBe(1); // part 0 -> Aries
    expect(extraVargaSign(6 - e, 'D5')).toBe(1); // still part 0
    expect(extraVargaSign(6, 'D5')).toBe(11); // 6/6 = part 1 -> Aquarius
    expect(extraVargaSign(12, 'D5')).toBe(9); // part 2 -> Sagittarius
    expect(extraVargaSign(18, 'D5')).toBe(3); // part 3 -> Gemini
    expect(extraVargaSign(24, 'D5')).toBe(7); // part 4 -> Libra
    expect(extraVargaSign(30 - e, 'D5')).toBe(7);
  });
  it('even sthira sign Taurus (30-60)', () => {
    expect(extraVargaSign(30, 'D5')).toBe(2); // part 0 -> Taurus
    expect(extraVargaSign(36, 'D5')).toBe(6); // 6 deg -> part 1 -> Virgo
    expect(extraVargaSign(42, 'D5')).toBe(12); // part 2 -> Pisces
    expect(extraVargaSign(48, 'D5')).toBe(10); // part 3 -> Capricorn
    expect(extraVargaSign(54, 'D5')).toBe(8); // part 4 -> Scorpio
  });
  it('dual signs Gemini (odd) and Pisces (even)', () => {
    expect(extraVargaSign(60, 'D5')).toBe(1); // Gemini 0 deg, odd part 0 -> Aries
    expect(extraVargaSign(66, 'D5')).toBe(11); // Gemini 6 deg, part 1 -> Aquarius
    expect(extraVargaSign(330, 'D5')).toBe(2); // Pisces 0 deg, even part 0 -> Taurus
    expect(extraVargaSign(360 - e, 'D5')).toBe(8); // Pisces 29.99 deg, part 4 -> Scorpio
  });
});

describe('D6 Shashtamsa (PVRNR ch. 6): 5 deg parts; odd from Aries, even from Libra', () => {
  it('chara: Aries odd, Cancer even', () => {
    expect(extraVargaSign(0, 'D6')).toBe(1); // Aries + 0
    expect(extraVargaSign(5 - e, 'D6')).toBe(1);
    expect(extraVargaSign(5, 'D6')).toBe(2); // part 1 -> Taurus
    expect(extraVargaSign(25, 'D6')).toBe(6); // part 5 -> Virgo
    expect(extraVargaSign(90, 'D6')).toBe(7); // Cancer (even) part 0 -> Libra
    expect(extraVargaSign(115, 'D6')).toBe(12); // Cancer 25 deg, part 5 -> Libra + 5 = Pisces
  });
  it('sthira: Taurus (even) and Leo (odd)', () => {
    expect(extraVargaSign(30, 'D6')).toBe(7); // Libra
    expect(extraVargaSign(35, 'D6')).toBe(8); // part 1 -> Scorpio
    expect(extraVargaSign(55, 'D6')).toBe(12); // part 5 -> Pisces
    expect(extraVargaSign(120, 'D6')).toBe(1); // Leo odd part 0 -> Aries
  });
  it('dual: Gemini (odd)', () => {
    expect(extraVargaSign(60, 'D6')).toBe(1);
    expect(extraVargaSign(90 - e, 'D6')).toBe(6); // part 5 -> Virgo
  });
});

describe('D8 Ashtamsa (PVRNR ch. 6): 3.75 deg parts; movable from Ar, fixed from Sg, dual from Le', () => {
  it('chara', () => {
    expect(extraVargaSign(0, 'D8')).toBe(1);
    expect(extraVargaSign(3.75 - e, 'D8')).toBe(1);
    expect(extraVargaSign(3.75, 'D8')).toBe(2); // part 1 -> Taurus
    expect(extraVargaSign(26.25, 'D8')).toBe(8); // 26.25/3.75 = 7 -> Aries + 7 = Scorpio
    expect(extraVargaSign(270, 'D8')).toBe(1); // Capricorn (chara) -> Aries
  });
  it('sthira', () => {
    expect(extraVargaSign(30, 'D8')).toBe(9); // Taurus part 0 -> Sagittarius
    expect(extraVargaSign(33.75, 'D8')).toBe(10); // part 1 -> Capricorn
    expect(extraVargaSign(56.25, 'D8')).toBe(4); // part 7 -> 9 + 7 = 16 -> 16 - 12 = Cancer
  });
  it('dwiswabhava', () => {
    expect(extraVargaSign(60, 'D8')).toBe(5); // Gemini part 0 -> Leo
    expect(extraVargaSign(63.75, 'D8')).toBe(6); // part 1 -> Virgo
    expect(extraVargaSign(86.25, 'D8')).toBe(12); // part 7 -> 5 + 7 = Pisces
  });
});

describe('D11 Rudramsa (PVRNR ch. 6): count Aries->sign, same count backwards from Aries = start; parts zodiacal', () => {
  const span = 30 / 11; // 2.727272...
  it('chara: Aries starts Aries, Cancer starts Capricorn', () => {
    expect(extraVargaSign(0, 'D11')).toBe(1);
    expect(extraVargaSign(3 * span - e, 'D11')).toBe(3); // part 2 -> Gemini
    expect(extraVargaSign(3 * span, 'D11')).toBe(4); // exactly 8.1818 deg -> part 3 -> Cancer
    expect(extraVargaSign(30 - e, 'D11')).toBe(11); // part 10 -> Aries + 10 = Aquarius
    // Cancer is 4th from Aries; 4th backwards from Aries: Ar(1) Pi(2) Aq(3) Cp(4) -> Capricorn
    expect(extraVargaSign(90, 'D11')).toBe(10);
  });
  it('sthira: Taurus starts Pisces; Scorpio starts Virgo', () => {
    expect(extraVargaSign(30, 'D11')).toBe(12); // Taurus 2nd -> 2nd backwards = Pisces
    expect(extraVargaSign(30 + span, 'D11')).toBe(1); // part 1 -> Aries
    // Scorpio 8th -> 8th backwards from Aries = Virgo(6); 17 deg -> floor(17*11/30)=6 -> 6+6 = Pisces
    expect(extraVargaSign(227, 'D11')).toBe(12);
  });
  it('dual: Gemini starts Aquarius (worked example: Mercury 11 Gemini -> Gemini)', () => {
    // Gemini 3rd -> 3rd backwards from Aries = Aquarius(11); 11 deg -> floor(11*11/30)=4 -> 11+4=15 -> Gemini
    expect(extraVargaSign(71, 'D11')).toBe(3);
    expect(extraVargaSign(60, 'D11')).toBe(11);
  });
});

describe('D81 Nava-navamsa: continuous 30/81 parts from 0 Aries (navamsa of navamsa)', () => {
  const span = 30 / 81;
  it('chara Aries', () => {
    expect(extraVargaSign(0, 'D81')).toBe(1);
    expect(extraVargaSign(9 * span - e, 'D81')).toBe(9); // part 8 -> Sagittarius
    expect(extraVargaSign(9 * span, 'D81')).toBe(10); // part 9 -> Capricorn
    expect(extraVargaSign(12 * span, 'D81')).toBe(1); // part 12 -> wraps to Aries
  });
  it('sthira Taurus and Leo', () => {
    // Taurus: 81*1 mod 12 = 9 -> starts Capricorn (= first navamsa of Taurus, an earth sign)
    expect(extraVargaSign(30, 'D81')).toBe(10);
    // Leo 15 deg: navamsa part floor(15/3.333)=4 -> Leo navamsa (Aries+4); inside it 1.667 deg -> sub-part
    // floor(1.667/0.37037)=4 -> navamsa of Leo part 4 = Aries+4 = Leo. Direct: (81*4 + 40) mod 12 = 4 -> Leo (5)
    expect(extraVargaSign(135, 'D81')).toBe(5);
  });
  it('dual Gemini', () => {
    expect(extraVargaSign(60, 'D81')).toBe(7); // 81*2 = 162, mod 12 = 6 -> Libra
  });
});

describe('D108 Ashtottaramsa: continuous 30/108 parts from 0 Aries (every sign starts Aries)', () => {
  const span = 30 / 108;
  it('all modalities start from Aries; part 11 -> Pisces, part 12 -> Aries', () => {
    expect(extraVargaSign(0, 'D108')).toBe(1); // chara
    expect(extraVargaSign(30, 'D108')).toBe(1); // sthira: 108 mod 12 = 0
    expect(extraVargaSign(60, 'D108')).toBe(1); // dual
    expect(extraVargaSign(12 * span - e, 'D108')).toBe(12);
    expect(extraVargaSign(12 * span, 'D108')).toBe(1);
    expect(extraVargaSign(30.5, 'D108')).toBe(2); // 0.5 deg * 3.6 = 1.8 -> part 1 -> Taurus
  });
});

describe('D144 Dwadas-dwadasamsa: D12 of D12 -> sign s + p1 + p2', () => {
  it('chara Aries', () => {
    expect(extraVargaSign(0, 'D144')).toBe(1);
    expect(extraVargaSign(2.5 - e, 'D144')).toBe(12); // p1=0, p2=11 -> Aries + 11 = Pisces
    expect(extraVargaSign(2.5, 'D144')).toBe(2); // p1=1, p2=0 -> Taurus
  });
  it('sthira Taurus', () => {
    expect(extraVargaSign(30, 'D144')).toBe(2);
    // 5.25 deg: q = floor(5.25*144/30) = 25 -> p1 = 2, p2 = 1 -> Taurus advanced 3 signs = Leo (D12 part 3rd = Cancer, its 2nd = Leo)
    expect(extraVargaSign(35.25, 'D144')).toBe(5);
  });
  it('dual Pisces last part', () => {
    // q = 143 -> p1 = 11, p2 = 11: D12 Pisces+11 = Aquarius, its 12th = Aquarius+11 = Capricorn
    expect(extraVargaSign(360 - e, 'D144')).toBe(10);
  });
});

describe('D150 Nadiamsa: chara direct, sthira reverse, dual from 76th; n-th amsa counted from the sign', () => {
  it('nadiamsa ordinal per modality', () => {
    expect(extraVargaNadiamsaNumber(0)).toBe(1); // Aries k=0 -> 1
    expect(extraVargaNadiamsaNumber(0.2)).toBe(2); // k=1 -> 2
    expect(extraVargaNadiamsaNumber(29.9)).toBe(150); // k=149
    expect(extraVargaNadiamsaNumber(30)).toBe(150); // Taurus k=0 -> 150 - 0
    expect(extraVargaNadiamsaNumber(59.9)).toBe(1); // Taurus k=149 -> 1
    expect(extraVargaNadiamsaNumber(60)).toBe(76); // Gemini k=0 -> 76th
    expect(extraVargaNadiamsaNumber(74.9)).toBe(150); // Gemini k=74 -> (74+75)%150+1 = 150
    expect(extraVargaNadiamsaNumber(75)).toBe(1); // Gemini k=75 -> 1
  });
  it('sign placement', () => {
    expect(extraVargaSign(0, 'D150')).toBe(1); // n=1 -> Aries
    expect(extraVargaSign(29.9, 'D150')).toBe(6); // n=150 -> Aries + 149 = 149 mod 12 = 5 -> Virgo
    expect(extraVargaSign(30, 'D150')).toBe(7); // n=150 from Taurus -> 1 + 149 = 150 mod 12 = 6 -> Libra
    expect(extraVargaSign(59.9, 'D150')).toBe(2); // n=1 -> Taurus
    expect(extraVargaSign(60, 'D150')).toBe(6); // n=76 from Gemini -> 2 + 75 = 77 mod 12 = 5 -> Virgo
    expect(extraVargaSign(75, 'D150')).toBe(3); // n=1 -> Gemini
  });
});

describe('degree in varga', () => {
  it('is the elapsed fraction of the part x 30', () => {
    expect(extraVargaDegree(3, 'D5')).toBeCloseTo(15, 9); // 3 of 6 deg -> half -> 15
    expect(extraVargaDegree(36 + 1.5, 'D5')).toBeCloseTo(7.5, 9); // 1.5 of 6 -> quarter
    expect(extraVargaDegree(0.1, 'D150')).toBeCloseTo(15, 6); // 0.1 of 0.2
  });
});

describe('definitions carry provisional metadata', () => {
  it('every extra varga has division, source and convention notes', () => {
    const div: Record<string, number> = { D5: 5, D6: 6, D8: 8, D11: 11, D81: 81, D108: 108, D144: 144, D150: 150 };
    for (const v of EXTRA_VARGA_TYPES) {
      expect(EXTRA_VARGA_DEFINITIONS[v].division).toBe(div[v]);
      expect(EXTRA_VARGA_DEFINITIONS[v].source.length).toBeGreaterThan(20);
      expect(EXTRA_VARGA_DEFINITIONS[v].conventionNotes.length).toBeGreaterThan(0);
    }
  });
});

describe('ExtraVargaCalculator with ChartCalculator + config', () => {
  const details: BirthDetails = {
    date: { year: 1990, month: 5, day: 15 },
    time: { hour: 14, minute: 30, second: 0 },
    timezone: 'Asia/Kolkata',
    latitude: 28.6139,
    longitude: 77.209,
  };
  it('produces VargaChart-shaped output for all 8 vargas, consistent with the pure rule', async () => {
    const res = await new ExtraVargaCalculator().calculate(details);
    expect(Object.keys(res).sort()).toEqual([...EXTRA_VARGA_TYPES].sort());
    for (const v of EXTRA_VARGA_TYPES) {
      const c = res[v]!;
      expect(c.provisional).toBe(true);
      expect(c.houses).toHaveLength(12);
      expect(c.signs).toHaveLength(12);
      expect(c.ascendant!.house).toBe(1);
      for (const p of Object.values(c.placements)) {
        expect(p.rashiIndex).toBe(extraVargaSign(p.sourceLongitude!, v));
        expect(p.house).toBe(((p.rashiIndex - c.ascendant!.rashiIndex + 12) % 12) + 1);
      }
    }
    expect(res.D150!.placements[PlanetSymbol.SUN].nadiamsaNumber).toBeGreaterThanOrEqual(1);
  });
  it('passes the config through to the chart (ayanamsa changes source longitudes)', async () => {
    const calc = new ExtraVargaCalculator();
    const a = await calc.calculate(details, ['D5'], DEFAULT_ASTROLOGY_CONFIG);
    const b = await calc.calculate(details, ['D5'], { ...DEFAULT_ASTROLOGY_CONFIG, zodiacType: 'TROPICAL' });
    const diff = b.D5!.placements[PlanetSymbol.SUN].sourceLongitude! - a.D5!.placements[PlanetSymbol.SUN].sourceLongitude!;
    // Tropical - Lahiri sidereal in 1990 = Lahiri ayanamsa ~23.7 deg (published value 23 deg 43')
    expect(diff).toBeGreaterThan(23.5);
    expect(diff).toBeLessThan(24);
  });
});
