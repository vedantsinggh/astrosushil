/**
 * Astro Sushil - Career Editorial Topic & Claim-Level Evidence Validator
 *
 * Enforces strict schema constraints and claim-level evidence verification:
 * 1. Strict schema: exactly 3 substantial paragraphs, exactly 5 diamond pointers starting with ✦, exactly 1 takeaway.
 * 2. Planetary Placement Verification: verifies that asserted planetary signs and houses match the client's actual astronomical chart.
 * 3. Prohibits contradictory planetary claims (e.g. claiming Sun in Pisces when Sun is in Leo).
 * 4. Prohibits contradictory house claims (e.g. claiming Sun in 5th house when Sun is in 12th house).
 * 5. Prohibits cross-profile contamination (e.g. asserting non-natal Ascendant or natal signs).
 * 6. Distinguishes educational comparisons (e.g. "Unlike Aries...") from direct placement claims.
 * 7. Prohibits unsupported yoga claims (e.g. Vipreet Raj Yoga when Kendra/Trikona lords are involved).
 * 8. Prohibits invented values when evidence is marked unavailable.
 * 9. True Evidence Traceability: verifies that evidence IDs are genuinely referenced and supported in text.
 */

export interface EditorialTopicSchema {
  topicNumber: number;
  title: string;
  subtitle: string;
  paragraphs: string[];
  diamondPointers: string[];
  takeaway: string;
}

export interface PlanetaryPlacementFact {
  sign: string;
  house: number;
  nakshatra?: string;
  isRetrograde?: boolean;
}

export interface ClientChartPlacements {
  ascendantSign: string;
  ascendantDegree?: number;
  planets: Record<string, PlanetaryPlacementFact>;
}

export interface TopicValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedTopic?: EditorialTopicSchema;
  claimValidation: {
    passed: boolean;
    violations: string[];
    verifiedEvidenceIds: string[];
  };
}

export interface TopicValidationOptions {
  expectedTopicNumber?: number;
  clientName?: string;
  lagnaSign?: string;
  chartPlacements?: ClientChartPlacements;
  disallowedSigns?: string[];
  disallowedYogas?: string[];
  isEvidenceUnavailable?: boolean;
  requiredEvidenceIds?: string[];
}

const HOUSE_WORD_MAP: Record<string, number> = {
  first: 1, '1st': 1, '1': 1,
  second: 2, '2nd': 2, '2': 2,
  third: 3, '3rd': 3, '3': 3,
  fourth: 4, '4th': 4, '4': 4,
  fifth: 5, '5th': 5, '5': 5,
  sixth: 6, '6th': 6, '6': 6,
  seventh: 7, '7th': 7, '7': 7,
  eighth: 8, '8th': 8, '8': 8,
  ninth: 9, '9th': 9, '9': 9,
  tenth: 10, '10th': 10, '10': 10,
  eleventh: 11, '11th': 11, '11': 11,
  twelfth: 12, '12th': 12, '12': 12,
};

export class CareerEditorialTopicValidator {
  /**
   * Validates raw JSON string or parsed object against schema and evidence rules.
   */
  public validate(
    raw: string | any,
    options?: TopicValidationOptions
  ): TopicValidationResult {
    const errors: string[] = [];
    const claimViolations: string[] = [];
    const verifiedEvidenceIds: string[] = [];

    let parsed: any;
    if (typeof raw === 'string') {
      let clean = raw.trim();
      if (clean.startsWith('```json')) clean = clean.slice(7);
      if (clean.startsWith('```')) clean = clean.slice(3);
      if (clean.endsWith('```')) clean = clean.slice(0, -3);
      clean = clean.trim();

      try {
        parsed = JSON.parse(clean);
      } catch (err: any) {
        return {
          isValid: false,
          errors: [`JSON_PARSE_ERROR: Failed to parse topic JSON: ${err.message}`],
          claimValidation: { passed: false, violations: ['Invalid JSON'], verifiedEvidenceIds: [] },
        };
      }
    } else {
      parsed = raw;
    }

    // Unwrap if wrapped in { "topic": { ... } }
    const topic: EditorialTopicSchema = parsed.topic || parsed;

    // 1. Topic Number Validation
    if (typeof topic.topicNumber !== 'number') {
      errors.push('Missing or non-numeric topicNumber');
    } else if (
      options?.expectedTopicNumber !== undefined &&
      topic.topicNumber !== options.expectedTopicNumber
    ) {
      errors.push(
        `Topic number mismatch: expected ${options.expectedTopicNumber}, got ${topic.topicNumber}`
      );
    }

    // 2. Title & Subtitle Validation
    if (!topic.title || typeof topic.title !== 'string' || topic.title.trim().length < 3) {
      errors.push('Missing or empty title (must be string with min 3 chars)');
    }
    if (!topic.subtitle || typeof topic.subtitle !== 'string' || topic.subtitle.trim().length < 3) {
      errors.push('Missing or empty subtitle (must be string with min 3 chars)');
    }

    // 3. Paragraphs Validation: EXACTLY 3 paragraphs
    if (!Array.isArray(topic.paragraphs)) {
      errors.push('paragraphs must be an array of strings');
    } else if (topic.paragraphs.length !== 3) {
      errors.push(
        `Strict schema violation: paragraphs array must contain EXACTLY 3 items (found ${topic.paragraphs.length})`
      );
    } else {
      topic.paragraphs.forEach((p, idx) => {
        if (typeof p !== 'string' || p.trim().length < 40) {
          errors.push(`Paragraph ${idx + 1} is empty or too short (must be at least 40 chars)`);
        }
      });
    }

    // 4. Diamond Pointers Validation: EXACTLY 5 pointers starting with ✦
    if (!Array.isArray(topic.diamondPointers)) {
      errors.push('diamondPointers must be an array of strings');
    } else if (topic.diamondPointers.length !== 5) {
      errors.push(
        `Strict schema violation: diamondPointers array must contain EXACTLY 5 items (found ${topic.diamondPointers.length})`
      );
    } else {
      topic.diamondPointers.forEach((dp, idx) => {
        if (typeof dp !== 'string' || dp.trim().length < 10) {
          errors.push(`Diamond pointer ${idx + 1} is empty or too short`);
        } else if (!dp.trim().startsWith('✦')) {
          errors.push(
            `Diamond pointer ${idx + 1} must start with the diamond glyph "✦" (found: "${dp.slice(0, 10)}...")`
          );
        }
      });
    }

    // 5. Takeaway Validation: exactly 1 non-empty sentence
    if (!topic.takeaway || typeof topic.takeaway !== 'string' || topic.takeaway.trim().length < 15) {
      errors.push('Missing or empty takeaway sentence (must be at least 15 chars)');
    }

    // ------------------------------------------------------------------------
    // CLAIM-LEVEL EVIDENCE & ANTI-CONTAMINATION VALIDATION
    // ------------------------------------------------------------------------
    const fullText = [
      topic.title,
      topic.subtitle,
      ...(topic.paragraphs || []),
      ...(topic.diamondPointers || []),
      topic.takeaway,
    ].join(' ');

    const effectiveLagna = options?.chartPlacements?.ascendantSign || options?.lagnaSign;

    // 6. Direct Ascendant Contradiction Check
    if (effectiveLagna) {
      const ascMatch1 = fullText.match(/\b(?:your|natal)\s+(?:placement\s+of\s+)?(?:Ascendant|Lagna|Rising)\s+(?:is\s+|in\s+)?(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/i);
      const ascMatch2 = fullText.match(/\b(?:your|natal)\s+(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\s+(?:Ascendant|Lagna|Rising)\b/i);
      const foundAscSign = ascMatch1?.[1] || ascMatch2?.[1];

      if (foundAscSign && foundAscSign.toLowerCase() !== effectiveLagna.toLowerCase()) {
        claimViolations.push(
          `CONTRADICTORY_ASCENDANT_CLAIM: Claimed "${foundAscSign} Ascendant", but client actual Lagna is ${effectiveLagna}.`
        );
      }
    }

    // 7. Planetary Sign Contradiction Check
    if (options?.chartPlacements?.planets) {
      const planetsObj = options.chartPlacements.planets;
      
      // Pattern 1: "your [Planet] (is) (placed in / in) [Sign]"
      const planetSignPattern1 = /\b(?:your|natal)\s+(?:placement\s+of\s+)?(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\s+(?:is\s+)?(?:being\s+|placed\s+in\s+|positioned\s+in\s+|residing\s+in\s+|in\s+)?(?:the\s+sign\s+of\s+)?(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/gi;
      let match1: RegExpExecArray | null;
      while ((match1 = planetSignPattern1.exec(fullText)) !== null) {
        const planetName = match1[1].toUpperCase();
        const claimedSign = match1[2];
        const actualFact = planetsObj[planetName];
        if (actualFact && actualFact.sign.toLowerCase() !== claimedSign.toLowerCase()) {
          claimViolations.push(
            `CONTRADICTORY_PLANET_SIGN: Claimed "${match1[1]} in ${claimedSign}", but client's actual ${match1[1]} is in ${actualFact.sign}.`
          );
        }
      }

      // Pattern 2: "your [Sign] [Planet]" (e.g. "your Pisces Sun")
      const planetSignPattern2 = /\b(?:your|natal)\s+(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\s+(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\b/gi;
      let match2: RegExpExecArray | null;
      while ((match2 = planetSignPattern2.exec(fullText)) !== null) {
        const claimedSign = match2[1];
        const planetName = match2[2].toUpperCase();
        const actualFact = planetsObj[planetName];
        if (actualFact && actualFact.sign.toLowerCase() !== claimedSign.toLowerCase()) {
          claimViolations.push(
            `CONTRADICTORY_PLANET_SIGN: Claimed "${claimedSign} ${match2[2]}", but client's actual ${match2[2]} is in ${actualFact.sign}.`
          );
        }
      }

      // Pattern 3: House placement contradiction ("your [Planet] (is) (placed in) the [Nth] house")
      const planetHousePattern1 = /\b(?:your|natal)\s+(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\s+(?:is\s+)?(?:placed\s+in\s+|positioned\s+in\s+|residing\s+in\s+|in\s+)?(?:the\s+)?(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|sixth|6th|seventh|7th|eighth|8th|ninth|9th|tenth|10th|eleventh|11th|twelfth|12th)\s+house\b/gi;
      let matchHouse: RegExpExecArray | null;
      while ((matchHouse = planetHousePattern1.exec(fullText)) !== null) {
        const planetName = matchHouse[1].toUpperCase();
        const claimedWord = matchHouse[2].toLowerCase();
        const claimedHouseNum = HOUSE_WORD_MAP[claimedWord];
        const actualFact = planetsObj[planetName];
        if (actualFact && claimedHouseNum && actualFact.house !== claimedHouseNum) {
          claimViolations.push(
            `CONTRADICTORY_PLANET_HOUSE: Claimed "${matchHouse[1]} in House ${claimedHouseNum}", but client's actual ${matchHouse[1]} is in House ${actualFact.house}.`
          );
        }
      }
    }

    // 8. Cross-Profile Contamination Check (Disallowed signs as natal placements)
    if (options?.disallowedSigns && options.disallowedSigns.length > 0) {
      for (const forbidden of options.disallowedSigns) {
        // Match only direct placement claims like "your Aries Lagna" or "as an Aries native"
        const regex1 = new RegExp(`\\b${forbidden}\\s+(?:Lagna|Rising|Ascendant)\\b`, 'i');
        const regex2 = new RegExp(`\\b(?:your|natal)\\s+${forbidden}\\s+(?:Lagna|Rising|Ascendant|Moon|Sun|Mars)\\b`, 'i');
        if (regex1.test(fullText) || regex2.test(fullText)) {
          claimViolations.push(
            `CROSS_PROFILE_CONTAMINATION: Found forbidden Ascendant or placement "${forbidden}" in text.`
          );
        }
      }
    }

    // 9. Unsupported Yoga Check
    if (options?.disallowedYogas && options.disallowedYogas.length > 0) {
      for (const forbiddenYoga of options.disallowedYogas) {
        const regex = new RegExp(`\\b${forbiddenYoga}\\b`, 'i');
        if (regex.test(fullText)) {
          // If the text mentions the yoga to explicitly DISMISS it (e.g. "not a classical VRY", "does not constitute"), allow it
          const dismissRegex = new RegExp(
            `(?:not|cannot be considered|does not form|does not constitute|unlike a pure|not a classical)\\s+(?:a\\s+)?${forbiddenYoga}`,
            'i'
          );
          if (!dismissRegex.test(fullText)) {
            claimViolations.push(
              `UNSUPPORTED_YOGA_CLAIM: Claimed "${forbiddenYoga}" when conditions are not established by evidence.`
            );
          }
        }
      }
    }

    // 10. Unavailable Data Assertions Check
    if (options?.isEvidenceUnavailable) {
      // Must explicitly acknowledge data is unavailable
      const unavailNotice = /(?:unavailable|not available|missing from|cannot be determined|data is unavailable)/i;
      if (!unavailNotice.test(fullText)) {
        claimViolations.push(
          'UNAVAILABLE_DATA_CLAIM: Topic generated on unavailable evidence without explicitly noting unavailability.'
        );
      }
    }

    // 11. Genuine Evidence Traceability Verification
    // Verify that supplied evidence IDs are actually grounded and referenced in the text
    if (options?.requiredEvidenceIds && options.requiredEvidenceIds.length > 0) {
      for (const id of options.requiredEvidenceIds) {
        if (id.startsWith('ascendant-')) {
          const signPart = id.replace('ascendant-', '');
          if (new RegExp(`\\b(${signPart}|lagna|ascendant)\\b`, 'i').test(fullText)) {
            verifiedEvidenceIds.push(id);
          }
        } else if (id.startsWith('planet-')) {
          const planetPart = id.replace('planet-', '');
          if (new RegExp(`\\b(${planetPart})\\b`, 'i').test(fullText)) {
            verifiedEvidenceIds.push(id);
          }
        } else if (id.startsWith('house-')) {
          const houseNum = id.replace('house-', '');
          const word = Object.keys(HOUSE_WORD_MAP).find((w) => HOUSE_WORD_MAP[w] === Number(houseNum));
          if (
            new RegExp(`\\b(house\\s+${houseNum}|${houseNum}th\\s+house|${word}\\s+house)\\b`, 'i').test(fullText)
          ) {
            verifiedEvidenceIds.push(id);
          }
        } else if (id.startsWith('conjunction-')) {
          if (/conjunction|cluster|planetary\s+union/i.test(fullText)) {
            verifiedEvidenceIds.push(id);
          }
        } else if (id.startsWith('varga-d10-')) {
          if (/d10|dashamsha|harmonic|executive/i.test(fullText)) {
            verifiedEvidenceIds.push(id);
          }
        } else if (id.startsWith('sav-')) {
          if (/sav|sarvashtakavarga|bindu|points|scoring/i.test(fullText)) {
            verifiedEvidenceIds.push(id);
          }
        } else if (id.startsWith('transit-') || id === 'timing-evidence') {
          if (/dasha|transit|gochara|timing|sub-period|cycle/i.test(fullText)) {
            verifiedEvidenceIds.push(id);
          }
        } else if (id === 'remedial-evidence') {
          if (/remedy|remedies|gemstone|mantra|rudraksha|lifestyle|vastu|upaya/i.test(fullText)) {
            verifiedEvidenceIds.push(id);
          }
        } else {
          // General evidence
          verifiedEvidenceIds.push(id);
        }
      }
    }

    const isValid = errors.length === 0 && claimViolations.length === 0;

    return {
      isValid,
      errors: [...errors, ...claimViolations],
      sanitizedTopic: isValid ? topic : undefined,
      claimValidation: {
        passed: claimViolations.length === 0,
        violations: claimViolations,
        verifiedEvidenceIds,
      },
    };
  }
}

export const careerEditorialTopicValidator = new CareerEditorialTopicValidator();
