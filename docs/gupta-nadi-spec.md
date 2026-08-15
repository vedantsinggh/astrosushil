# Gupta Nadi (Brihaspati Nandi Nadi / BNN) Specification - Astro Sushil

This specification outlines the functional design, rule format, evaluation logic, and audit structure for `packages/gupta-nadi-engine`.

> **IMPORTANT**: No custom astrological formulas or predictive rules are invented in this document. Specific rules and formulas will be encoded based on client-provided Brihaspati Nandi Nadi (BNN) documentation.

---

## 1. Purpose & Core Philosophy

Gupta Nadi is the flagship predictive module of the Astro Sushil platform. It implements **Brihaspati Nandi Nadi (BNN)** methodology:
- **Karaka-Based System**: Jupiter (Brihaspati) represents the Jiva (Self for males), Venus represents the Jiva (Self for females), Saturn represents Karma (profession), Mars represents Ego/Brothers/Energy, Mercury represents Intellect/Commerce/Friends, Moon represents Mind/Travel/Blame, Sun represents Soul/Father/Government, Rahu represents Illusion/Expansion/Foreign, and Ketu represents Moksha/Obstacles/Dispute.
- **Directional & Aspect Relationships**: Focuses on planet combinations based on trine positions (1, 5, 9), adjacent houses (2, 12), opposite houses (7), and 3-11 relationships rather than traditional house lordships alone.
- **100% Deterministic Evaluation**: Rules execute as pure logical conditions. For any given natal chart and transit date, rule outputs are completely repeatable, objective, and auditable.

---

## 2. Input Requirements

The engine consumes processed astrological data from `packages/astrology-engine`:
1. **Natal Planetary Coordinates**: Sidereal longitudes for Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu.
2. **Natal House Positions & Signs**: Sign placement for each planet (1 to 12).
3. **Gender of Native**: Male / Female (determines Jiva Karaka).
4. **Transit Coordinates**: Planetary positions for a target evaluation date.
5. **Dasha Timeline**: Active Vimshottari Mahadasha and Antardasha lords.

---

## 3. Rule Structure & Template

Every Gupta Nadi rule must be encoded in a standardized JSON/TypeScript schema following this structure:

```
Rule ID: NADI-CAR-001
Domain: Career / Profession
Conditions:
  - Jiva/Karma Lord: Saturn
  - Planetary Combination: Saturn trine (1, 5, 9) with Mercury AND Venus
  - Directional Alignment: Same sign or trine sign placement
Exceptions:
  - Ketu in 2nd house from Saturn (causes initial interruption)
Priority: 10 (High)
Expected Result:
  - Trajectory: High success in commerce, trading, finance, or intellectual fields.
  - Characteristics: Financial acumen, strong analytical skills, early professional stability.
Reference Example: Benchmark Chart #14 (Birth Date: 1985-06-12)
```

### 3.1 Rule Schema Definition
- **Rule ID**: Unique alphanumeric identifier (e.g. `NADI-FIN-042`).
- **Domain**: Category (`Career`, `Marriage`, `Health`, `Finance`, `Travel`, `Progeny`, `Spirituality`).
- **Conditions**: Array of planet-sign-aspect requirements that must all evaluate to `true`.
- **Exceptions**: Overriding conditions that suppress or modify the rule output.
- **Priority**: Integer score (1-100) resolving precedence when multiple rules trigger within the same domain.
- **Expected Result**: Structured prediction payload containing outcome type, timing window, and severity/impact rating.
- **Reference Example**: Verified sample chart ID validating the rule accuracy.

---

## 4. Rule Evaluation Engine Logic

```
   +-------------------------------------------------------------+
   |                  Raw Astrological Data                      |
   +------------------------------+------------------------------+
                                  |
                                  v
   +-------------------------------------------------------------+
   |              Planet Aspect & Trine Matrix Builder           |
   |   (Calculates 1-5-9, 2-12, 3-11, 7th relationships)         |
   +------------------------------+------------------------------+
                                  |
                                  v
   +-------------------------------------------------------------+
   |                    Rule Matcher Engine                      |
   |   - Filter active rules by Domain                           |
   |   - Evaluate Conditions & Exceptions                        |
   |   - Sort triggered rules by Priority                        |
   +------------------------------+------------------------------+
                                  |
                                  v
   +-------------------------------------------------------------+
   |                Transit & Timing Overlay Engine              |
   |   (Correlates triggered rules with Saturn/Jupiter transits) |
   +------------------------------+------------------------------+
                                  |
                                  v
   +-------------------------------------------------------------+
   |              Deterministic Prediction Tree Output           |
   +-------------------------------------------------------------+
```

---

## 5. Timing of Events (Transit & Dasha Overlays)

1. **Major Life Events**: Triggered when transiting Jupiter (Brihaspati) or Saturn (Karma) forms exact conjunctions or trines (1, 5, 9) to natal planetary combinations.
2. **Node Interceptions**: Transiting Rahu/Ketu crossing natal Karakas signals major transformations or Karma completion.
3. **Dasha Overlay**: Active Dasha lord acts as an activator for specific Nadi rule combinations.

---

## 6. Auditability & Explainability

- **Prediction Traceability**: Every generated prediction JSON includes an `auditTrail` array containing the specific `Rule ID`s triggered, exact degrees evaluated, and priority scores used.
- **Zero Hallucination**: The rule engine strictly emits structured data. Text summaries generated later by LLMs must map 1-to-1 to the underlying rule outputs.

---

## 7. Validation & Testing Strategy

1. **Unit Testing**: Individual unit test files for each encoded Nadi rule verifying condition logic against mock chart inputs.
2. **Reference Chart Validation**: Test suite of reference charts provided by the client with expected output verification.
3. **Conflict Resolution Tests**: Integration tests verifying that high-priority exception rules correctly override lower-priority rules.
