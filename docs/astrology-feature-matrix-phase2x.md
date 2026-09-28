# Astrology Engine Feature Matrix — Phase 2X

This document serves as the comprehensive feature status and technical capability matrix for the deterministic Kundli engine as of Phase 2X completion.

---

## 1. Feature Status Matrix

| Subsystem / Feature Area | Specific Capability | Status | Convention / Methodology | API Route / Method | Tests | Known Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Birth / Chart Types** | Rashi (Natal D1) | **IMPLEMENTED** | Whole Sign / Sripati, Sidereal Lahiri | `POST /chart` | `tests/unit/birth-details.test.ts` | None |
| | Sun Chart (Surya Lagna) | **IMPLEMENTED** | Whole Sign from Sun sign | `POST /chart-variants` | `tests/unit/chart-variants-lagnas.test.ts` | Derived from canonical chart |
| | Moon Chart (Chandra Lagna) | **IMPLEMENTED** | Whole Sign from Moon sign | `POST /chart-variants` | `tests/unit/chart-variants-lagnas.test.ts` | Derived from canonical chart |
| | Karakamsha Chart | **IMPLEMENTED** | Whole Sign from Atmakaraka D9 sign | `POST /chart-variants` | `tests/unit/chart-variants-lagnas.test.ts` | Parashari/Jaimini standard |
| | Bhava Chalit (Sripati) | **IMPLEMENTED** | Sripati unequal house mid-cusps & sandhis | `POST /chart-variants` | `tests/unit/chart-variants-lagnas.test.ts` | Non-polar latitudes |
| **Special Lagnas** | Bhava Lagna (BL) | **IMPLEMENTED** | 1 sign per 2 hours from Sun | `POST /chart-variants` | `tests/unit/chart-variants-lagnas.test.ts` | Mean sunrise approximation |
| | Hora Lagna (HL) | **IMPLEMENTED** | 1 sign per 1 hour from Sun | `POST /chart-variants` | `tests/unit/chart-variants-lagnas.test.ts` | Mean sunrise approximation |
| | Ghatika Lagna (GL) | **IMPLEMENTED** | 1 sign per 24 mins (1 ghati) from Sun | `POST /chart-variants` | `tests/unit/chart-variants-lagnas.test.ts` | Mean sunrise approximation |
| | Indu Lagna (Wealth) | **IMPLEMENTED** | 9th lords rays from Asc & Moon mod 12 | `POST /chart-variants` | `tests/unit/chart-variants-lagnas.test.ts` | Parashari ray units |
| | Pranapada Lagna | **IMPLEMENTED** | 120° per elapsed ghati from Sun | `POST /chart-variants` | `tests/unit/chart-variants-lagnas.test.ts` | Classical BPHS rule |
| **Vargas (Divisional Charts)** | 16 Canonical Shodashvargas | **IMPLEMENTED** | D1, D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60 | `POST /vargas` | `tests/unit/varga-shodashvarga.test.ts` | Full mathematical divisions |
| | Shodashvarga Summary | **IMPLEMENTED** | Dignity scoring, Vaisheshikamsa ranks (Parijata -> Airavata) | `POST /vargas` | `tests/unit/varga-shodashvarga.test.ts` | 16-Varga evaluation |
| | Vimshopaka Bala | **IMPLEMENTED** | Shadvarga (6), Saptavarga (7), Dashavarga (10), Shodashvarga (16) | `POST /vimshopaka-bala` | `tests/unit/varga-shodashvarga.test.ts` | 20-point standard scale |
| **Jaimini System** | 7 & 8 Chara Karakas | **IMPLEMENTED** | AK, AmK, BK, MK, PK, GK, DK sorted descending by degree in sign | `POST /jaimini` | `tests/unit/jaimini.test.ts` | Rahu included in 8-karaka |
| | Arudha Padas (A1–A12, AL, UL) | **IMPLEMENTED** | Jaimini Sutras 1.1.30-31 with 1st/7th exception jumps | `POST /jaimini` | `tests/unit/jaimini.test.ts` | Fully deterministic |
| | Jaimini Rashi Drishti | **IMPLEMENTED** | Chara aspects Sthira (except adjacent), Sthira aspects Chara, Dual aspects Dual | `POST /jaimini` | `tests/unit/jaimini.test.ts` | Classical sign aspects |
| **KP System** | Star Lord, Sub Lord, Sub-Sub Lord | **IMPLEMENTED** | Vimshottari 120-year proportional subdivision | `POST /kp` | `tests/unit/kp.test.ts` | Classical Krishnamurti Readers |
| | 4-Level Significators | **IMPLEMENTED** | Levels A, B, C, D house significators | `POST /kp` | `tests/unit/kp.test.ts` | Full 12 houses matrix |
| | KP Ruling Planets | **IMPLEMENTED** | Asc Star, Asc Sign, Moon Star, Moon Sign, Day Lord | `POST /kp` | `tests/unit/kp.test.ts` | Deterministic time mapping |
| **Varshaphala & Prashna** | Varshaphala / Solar Return | **IMPLEMENTED** | Varshapravesha, Muntha progression (1 sign/yr), Varshesha | `POST /varshaphala` | `tests/unit/varshaphala-prashna.test.ts` | Tajika Neelakanthi rules |
| | Panchadhikari | **IMPLEMENTED** | Janma Lagnesha, Varsha Lagnesha, Munthesha, Dina/Ratri Lord, Trirashipati | `POST /varshaphala` | `tests/unit/varshaphala-prashna.test.ts` | Classical 5 offices |
| | Prashna (Horary Chart) | **IMPLEMENTED** | Domain mapping, Lagnesha, Karyesha, Tajika aspects (Ithasala, etc.) | `POST /prashna` | `tests/unit/varshaphala-prashna.test.ts` | 8 question domains |
| **Planetary Intelligence** | Baladi Avasthas | **IMPLEMENTED** | Bala, Kumara, Yuva, Vriddha, Mrita with odd/even inversion | `POST /planetary-intelligence` | `tests/unit/planetary-intelligence.test.ts` | BPHS Chapter 45 |
| | Jagradadi Avasthas | **IMPLEMENTED** | Jagrata (Awake), Swapna (Dreaming), Sushupti (Sleeping) | `POST /planetary-intelligence` | `tests/unit/planetary-intelligence.test.ts` | Based on planetary dignity |
| | Argala & Virodhargala | **IMPLEMENTED** | Primary (2nd, 4th, 11th) and Secondary (5th) with obstructions | `POST /planetary-intelligence` | `tests/unit/planetary-intelligence.test.ts` | Parashara rules |
| | Planetary Rays (Rashmi) | **IMPLEMENTED** | Proportional ray strength from deep debilitation to deep exaltation | `POST /planetary-intelligence` | `tests/unit/planetary-intelligence.test.ts` | Max ray tables (Sun:10, Moon:9...) |
| | Mrityu Bhaga | **IMPLEMENTED** | Exact fatal degrees per sign for 9 planets and Lagna | `POST /planetary-intelligence` | `tests/unit/planetary-intelligence.test.ts` | Jataka Parijata tables |
| | 64th Navamsha & 22nd Drekkana | **IMPLEMENTED** | 4th Navamsha from Moon/Asc in D9, 8th Drekkana (Kharesha) in D3 | `POST /planetary-intelligence` | `tests/unit/planetary-intelligence.test.ts` | BPHS sensitive points |
| **Chakras & Timing** | Tara Chakra | **IMPLEMENTED** | 9 Navataras (Janma, Sampat, Vipat, Kshema, Pratyak, Sadhana, Naidhana, Mitra, Parama Mitra) | `POST /chakras` | `tests/unit/chakras-timing.test.ts` | 27 Nakshatra evaluation |
| | Avakhada Chakra | **IMPLEMENTED** | Paya, Varna, Yoni, Gana, Nadi, Vashya, Tatwa, Syllable | `POST /chakras` | `tests/unit/chakras-timing.test.ts` | Muhurtha Chintamani |
| | Ghat Chakra | **IMPLEMENTED** | Ghatak Rashi, Masa, Tithi, Vara, Nakshatra, Prahar, Lagna | `POST /chakras` | `tests/unit/chakras-timing.test.ts` | Traditional tables |
| | Dynamic Rahu Kala / Muhurtas | **IMPLEMENTED** | 8-fold daytime/nighttime division (Rahu Kala, Yamaghanta, Gulika Kala) | `POST /chakras` | `tests/unit/chakras-timing.test.ts` | Proportional to sunrise-sunset |
| | Sade Sati Detection | **IMPLEMENTED** | Rising (12th), Peak (Janma), Setting (2nd), Kantaka (4th), Ashtama (8th) | `POST /chakras` | `tests/unit/chakras-timing.test.ts` | Saturn transit against Moon |
| **Special Points** | 5 Aprakash Grahas | **IMPLEMENTED** | Dhuma, Vyatipata, Parivesha, Indrachapa, Upaketu with loop closure check | `POST /special-points` | `tests/unit/special-points.test.ts` | BPHS Chapter 3 |
| | Upagrahas | **IMPLEMENTED** | Gulika, Mandi, Kaala, Mrityu, Ardhaprahara, Yamaghanta | `POST /special-points` | `tests/unit/special-points.test.ts` | Ashtamsha prahara logic |
| | Yogi / Avyogi / Sahayogi | **IMPLEMENTED** | Yogi point = Sun + Moon + 93°20', Avyogi point, Sahayogi sign lord | `POST /special-points` | `tests/unit/special-points.test.ts` | Pushyarka offset |
| | Outer Planets | **IMPLEMENTED** | Uranus, Neptune, Pluto positions when present | `POST /special-points` | `tests/unit/special-points.test.ts` | Swiss Ephemeris / VSOP87 |
| **Conventions & Architecture** | Convention Registry | **IMPLEMENTED** | Central metadata reporting for all deterministic subsystems | `GET /conventions` | `tests/integration/phase-2x.test.ts` | Auditable metadata |

---

## 2. Summary Status
- **Total Capabilities Audited & Implemented in Phase 2X**: 38 subsystems / features
- **Total Unit Test Files**: 21 test files (76 passing tests in `packages/astrology-engine`)
- **API Coverage**: 10 new API endpoints in `apps/api/src/modules/astrology/`
- **Serialization Safety**: 100% verified (no `{}` empty objects, no `NaN`, no `undefined`)
