import { describe, it, expect } from 'vitest';
import { MatchmakingCalculator } from '../../src/matchmaking/matchmaking-calculator';

describe('MatchmakingCalculator Unit Tests', () => {
  const calculator = new MatchmakingCalculator();

  it('calculates Ashtakoota score correctly when Moon positions match same Nakshatra and Rashi', () => {
    const boyMoon = 10.0; // Ashwini (Aries)
    const girlMoon = 10.0; // Ashwini (Aries)

    const result = calculator.calculateAshtakoota(boyMoon, girlMoon);

    expect(result.totalMaxPoints).toBe(36);
    // Same Nakshatra -> Nadi Dosha (0 pts Nadi), but high scores elsewhere
    expect(result.kootas.Varna.obtainedPoints).toBe(1);
    expect(result.kootas.Vashya.obtainedPoints).toBe(2);
    expect(result.kootas.Yoni.obtainedPoints).toBe(4);
    expect(result.kootas.Nadi.obtainedPoints).toBe(0); // Same Nadi
    expect(result.isCompatible).toBe(true);
  });

  it('awards 8 points for Nadi when Nakshatras belong to different Nadis', () => {
    const boyMoon = 0.0;  // Ashwini (Nadi 1 - Adi)
    const girlMoon = 15.0; // Bharani (Nadi 2 - Madhya)

    const result = calculator.calculateAshtakoota(boyMoon, girlMoon);

    expect(result.kootas.Nadi.obtainedPoints).toBe(8);
  });
});
