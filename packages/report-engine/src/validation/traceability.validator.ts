import { VerifiedAstrologyEvidence } from '../types/shared-report-foundation.types';

export class AstrologyTraceabilityError extends Error {
  public readonly code = 'UNSUPPORTED_ASTROLOGICAL_CLAIM';
  public readonly violations: string[];

  constructor(message: string, violations: string[] = []) {
    super(`Astrology Traceability Error: ${message}`);
    this.name = 'AstrologyTraceabilityError';
    this.violations = violations;
  }
}

const PLANET_NAMES = [
  'SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU',
];

const SIGN_NAMES = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
];

const SIGN_CANONICAL_MAP: Record<string, string> = {
  aries: 'Aries', mesha: 'Aries',
  taurus: 'Taurus', vrishabha: 'Taurus',
  gemini: 'Gemini', mithuna: 'Gemini',
  cancer: 'Cancer', karka: 'Cancer',
  leo: 'Leo', simha: 'Leo',
  virgo: 'Virgo', kanya: 'Virgo',
  libra: 'Libra', tula: 'Libra',
  scorpio: 'Scorpio', vrischika: 'Scorpio',
  sagittarius: 'Sagittarius', dhanu: 'Sagittarius',
  capricorn: 'Capricorn', makara: 'Capricorn',
  aquarius: 'Aquarius', kumbha: 'Aquarius',
  pisces: 'Pisces', meena: 'Pisces',
};

const FORBIDDEN_PLACEHOLDERS = ['n/a', 'unknown', '0°00', 'undefined', '[object object]', 'null', 'nan'];

/**
 * Validates that an interpretation contains zero hallucinations, unverified factual claims,
 * or contradictions against the underlying deterministic astrological evidence.
 */
export function verifyAiInterpretationTraceability(
  text: string,
  evidence: VerifiedAstrologyEvidence
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  if (!text || typeof text !== 'string') {
    return { valid: false, violations: ['Interpretation text is empty or non-string'] };
  }

  // 1. Placeholder Detection
  const lowerText = text.toLowerCase();
  for (const ph of FORBIDDEN_PLACEHOLDERS) {
    // word boundary check
    const regex = new RegExp(`\\b${ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      violations.push(`Forbidden placeholder detected in interpretation: "${ph}"`);
    }
  }

  // Build lookup maps from verified evidence
  const natalPlanetSigns = new Map<string, string>();
  const natalPlanetHouses = new Map<string, number>();

  for (const p of evidence.planets) {
    const pName = p.planet.toUpperCase();
    const canSign = SIGN_CANONICAL_MAP[p.sign.toLowerCase()] || p.sign;
    natalPlanetSigns.set(pName, canSign);
    natalPlanetHouses.set(pName, p.house);
  }

  // Transit lookup
  const transitPlanetSigns = new Map<string, string>();
  if (evidence.transits) {
    for (const t of evidence.transits) {
      const pName = t.planet.toUpperCase();
      const canSign = SIGN_CANONICAL_MAP[t.sign.toLowerCase()] || t.sign;
      transitPlanetSigns.set(pName, canSign);
    }
  }

  // 2. Check: [Planet] in [Sign]
  // e.g. "Sun in Aries", "Mars placed in Taurus", "Jupiter is in Leo", "Moon in Cancer"
  for (const planet of PLANET_NAMES) {
    for (const rawSign of SIGN_NAMES) {
      const sign = SIGN_CANONICAL_MAP[rawSign.toLowerCase()] || rawSign;
      const patterns = [
        new RegExp(`\\b${planet}\\s+(?:is\\s+)?(?:placed\\s+in|transits\\s+in|transiting\\s+in|transits|in)\\s+${rawSign}\\b`, 'i'),
        new RegExp(`\\b${rawSign}\\s+${planet}\\b`, 'i'), // e.g. "Aries Sun", "Taurus Moon"
      ];

      for (const pattern of patterns) {
        if (pattern.test(text)) {
          const expectedNatalSign = natalPlanetSigns.get(planet);
          const expectedTransitSign = transitPlanetSigns.get(planet);

          const matchesNatal = expectedNatalSign && expectedNatalSign.toLowerCase() === sign.toLowerCase();
          const matchesTransit = expectedTransitSign && expectedTransitSign.toLowerCase() === sign.toLowerCase();

          if (!matchesNatal && !matchesTransit && expectedNatalSign) {
            violations.push(
              `Unsupported planetary position: claim asserts ${planet} in ${sign}, but verified calculation is in ${expectedNatalSign}`
            );
          }
        }
      }
    }
  }

  // 3. Check: [Planet] in [N]th House / House [N]
  // e.g. "Saturn in the 4th house", "Mars in 1st house", "Jupiter in House 7"
  for (const planet of PLANET_NAMES) {
    const houseRegex = new RegExp(`\\b${planet}\\s+(?:is\\s+)?(?:placed\\s+in|in)\\s+(?:the\\s+)?([0-9]{1,2})(?:st|nd|rd|th)?\\s+house\\b`, 'i');
    const match = text.match(houseRegex);
    if (match) {
      const claimedHouse = parseInt(match[1], 10);
      const expectedHouse = natalPlanetHouses.get(planet);

      if (expectedHouse !== undefined && expectedHouse !== claimedHouse) {
        violations.push(
          `Unsupported house placement: claim asserts ${planet} in house ${claimedHouse}, but verified calculation places it in house ${expectedHouse}`
        );
      }
    }

    const houseRegexAlt = new RegExp(`\\b${planet}\\s+(?:is\\s+)?(?:placed\\s+in|in)\\s+House\\s+([0-9]{1,2})\\b`, 'i');
    const matchAlt = text.match(houseRegexAlt);
    if (matchAlt) {
      const claimedHouse = parseInt(matchAlt[1], 10);
      const expectedHouse = natalPlanetHouses.get(planet);

      if (expectedHouse !== undefined && expectedHouse !== claimedHouse) {
        violations.push(
          `Unsupported house placement: claim asserts ${planet} in House ${claimedHouse}, but verified calculation places it in House ${expectedHouse}`
        );
      }
    }
  }

  // 4. Check: Active Dasha claims
  if (evidence.dashas) {
    const dashaRegex = /\b(currently running|active|operating)\s+([A-Za-z]+)\s+Mahadasha\b/i;
    const match = text.match(dashaRegex);
    if (match) {
      const claimedLord = match[2].toUpperCase();
      const expectedLord = evidence.dashas.currentMahadasha.toUpperCase();
      if (claimedLord !== expectedLord) {
        violations.push(
          `Unsupported dasha claim: asserts active ${claimedLord} Mahadasha, but verified calculation is ${expectedLord} Mahadasha`
        );
      }
    }
  }

  // 5. Check: Ascendant Sign claim
  // e.g. "Ascendant in Aries", "Lagna is Taurus"
  for (const rawSign of SIGN_NAMES) {
    const sign = SIGN_CANONICAL_MAP[rawSign.toLowerCase()] || rawSign;
    const ascRegex = new RegExp(`\\b(?:Ascendant|Lagna)\\s+(?:is\\s+in|in|is)\\s+${rawSign}\\b`, 'i');
    if (ascRegex.test(text)) {
      const expectedAscSign = SIGN_CANONICAL_MAP[evidence.ascendant.sign.toLowerCase()] || evidence.ascendant.sign;
      if (expectedAscSign.toLowerCase() !== sign.toLowerCase()) {
        violations.push(
          `Unsupported Ascendant claim: asserts Lagna in ${sign}, but verified calculation is in ${expectedAscSign}`
        );
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Asserts traceability; throws AstrologyTraceabilityError if any unsupported claims are detected.
 */
export function assertAiInterpretationTraceability(
  text: string,
  evidence: VerifiedAstrologyEvidence
): void {
  const result = verifyAiInterpretationTraceability(text, evidence);
  if (!result.valid) {
    throw new AstrologyTraceabilityError(
      `AI interpretation failed evidence traceability check (${result.violations.length} violation(s))`,
      result.violations
    );
  }
}
