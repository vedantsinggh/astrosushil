# Astro Sushil: Phase 1A Approved Editorial Policy & Report Standards

**Document Reference:** `docs/audits/report_system/phase_1a_verification/PHASE_1A_EDITORIAL_POLICY.md`  
**Classification:** Approved Product Requirements & Editorial Specification  
**Date of Ratification:** November 3, 2026  
**Auditor / Policy Author:** DeepMind Agentic Pair Programmer  
**Phase:** Phase 1A (Independent Verification and Evidence Reconciliation)  
**Mandate:** Permanent product directive for all future report generation, AI prompts, templates, mobile screens, and Jyoti chatbot explanations.  

---

## 1. Purpose & Core Philosophy

The purpose of this editorial policy is to establish an unshakeable standard of dignity, intellectual rigor, professional clarity, and ethical astrology across the Astro Sushil platform.

Vedic astrology is treated as an interpretative, navigational, and reflective science. It provides insights into psychological predispositions, systemic strengths, potential friction points, and temporal cycles. It is **NOT** a tool of intimidation, fatalistic fear, or commercial manipulation through superstitious remedies.

This policy is an **editorial and narrative policy**. It does **NOT** authorize changing astronomical calculations, altering ephemeris longitudes, or suppressing valid planetary data (such as Mars or Saturn placements). All calculations remain 100% deterministic, auditable, and mathematically true.

---

## 2. Structural & Architectural Standards (Reference Structure)

The 13 commercial reference reports (`docs/reference repots/`) serve as structural, editorial, and typographical references, **NOT material to copy**.

### Retained Reference Report Architecture:
Every comprehensive Astro Sushil dossier must replicate the professional structural depth of the reference dossiers:
1. **Clear Chapter Organisation:** Logical thematic progression from astronomical foundations to life domains.
2. **Standardized Chart Presentations:** Beautiful, high-resolution North Indian and South Indian vector chart diagrams (Lagna, Navamsha D9, Dashamsha D10).
3. **Comprehensive Data Tables:**
   - Planetary positions with exact degrees, minutes, seconds, Rashis, Nakshatras, Padas, Nakshatra Lords, speeds, and retrograde flags.
   - House cusps, lords, and occupancy tables.
   - Sarvashtakavarga (SAV) and Bhinnashtakavarga (BAV) bindu matrices.
   - Vimshottari Dasha hierarchies (Mahadasha, Antardasha, Pratyantardasha).
4. **Phased Timelines:** Chronological opportunity and transition windows linked to active dasha and transit periods.
5. **Educational Explanatory Sections:** Clear, neutral explanations of traditional concepts (e.g. how Whole Sign houses work, what Dashas signify, how Gochara transits operate).

---

## 3. Strict Dosha, Fear-Based Content & Remedy Policy

Commercial astrology frequently exploits fear surrounding classical afflictions (Kuja/Manglik Dosha, Kaal Sarp Dosha, Sade Sati, Pitra Dosha, Gandanta). Astro Sushil firmly rejects this exploitative paradigm.

### Mandatory Directives on Doshas & Afflictions:
1. **Neutral Astrological Framing:**  
   Explain all chart factors neutrally as **planetary placements, house relationships, aspects, conjunctions, and timing factors**.
   - *Allowed:* "Mars is placed in the 7th house in Taurus. In classical Vedic astrology, Mars in the 7th signifies an intense, direct, and energetic approach to partnerships that requires conscious patience and open communication."
   - *Strictly Forbidden:* "You have severe Manglik Dosha. Your marriage is cursed and will end in disaster or partner illness unless rituals are performed."
2. **Zero Fatalism & Guaranteed Harm:**  
   **NEVER** predict guaranteed death, financial ruin, divorce, accidents, or irreversible misfortune.
3. **No Alternative Terminology Evasions:**  
   Do not reintroduce dosha-based fear under euphemistic terminology (e.g. "Karmic debt curse", "Nodal destruction pattern", "Fatal defect").
4. **Zero Invented Remedies:**  
   Do **NOT** invent arbitrary remedies, mantras, or ritual prescriptions.
5. **Prohibition of Superstitious Commercial Upsells:**  
   **NEVER** imply or state that purchasing gemstones, costly pujas, yantras, paid rituals, or recurring consultations is necessary to avert harm, cancel a curse, or guarantee success.
6. **Separation of Astrological Observations from Practical Suggestions:**  
   Always separate astronomical observations from practical, real-world suggestions (e.g. healthy communication habits, professional mentorship, financial budgeting, stress management).

---

## 4. Mandatory Report Elements

Every generated customer report must include the following structural sections:

### A. Legal & Astrological Disclaimer
A prominent, standardized disclaimer clarifying that astrology provides navigational self-awareness and does not replace medical, legal, or licensed financial advisory.

### B. Message from the Author
A personal, dignified greeting establishing the philosophy of empowered self-direction.
- **Strict Constraint:** Do **NOT** invent an author message or make claims on behalf of the author without approved wording from leadership. The current template must use approved copy.

### C. Public-Accessible Language Standards
- Reports must use clear, dignified, and professional English (or Hindi where localized).
- Avoid gratuitous, unexplained Sanskrit jargon (e.g. do not use *Ari Bhava*, *Ripu*, or *Apoklima* without immediately defining them in plain language).
- Provide concise margin glossaries or footnotes for fundamental technical terms (*Lagna*, *Nakshatra*, *Mahadasha*, *Transit*).

---

## 5. Scope of Policy Application

This policy is universal and must be applied consistently across:
- **PDF Dossier Templates:** LaTeX macros, cover texts, chapter intros, and narrative blocks.
- **AI Analyst Prompts:** `CAREER_ANALYST_SYSTEM_PROMPT` and all future LLM prompts in `@astro/prediction-engine`.
- **Lightweight Report Generators:** `kundli-report.generator.ts`, `planetary-report.generator.ts`, etc.
- **Flutter Mobile Screens:** Daily horoscope widgets, Kundli matching screens, and consultation summaries.
- **Jyoti Conversational AI:** System instructions and guardrails for the interactive chat agent.
