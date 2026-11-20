# Report Platform — Astrology Method Decisions

The product owner delegated astrology-method choices to engineering on 2026-11-18, pending client review. Each entry records the rule adopted, why, and what the reference report did. Every choice here is **provisional until the client signs off**. The manifest of every report records the calculation conventions.

| ID | Topic | Decision | Basis | Reference behaviour (not copied) |
|---|---|---|---|---|
| D-001 | Calculation conventions | Lahiri ayanamsa, sidereal zodiac, Whole Sign houses, mean nodes | The existing engine's conventions; the product owner said to keep them | Reference used Lahiri-consistent positions |
| D-002 | Mulank / Bhagyank | Mulank = digit sum of the birth day; Bhagyank = digit sum of the full date of birth | Standard Indian numerology; reuses the existing repo functions | Same |
| D-003 | Mulank "allies" and "cautions" (Love §7–8) | Derived from the Mulank's ruling planet (1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars), its weekday, colours and traditional gem, and from naisargika friendships and enmities (BPHS ch. 15, as in `astrology-engine/planets/planetary-relationships.ts`). The method is printed under each table. Gems are labelled symbolic, with nothing to buy. | Classical, explainable, deterministic | An unexplained lookup table; the repo's earlier copy reproduced it word for word, so it was not used |
| D-004 | Marriage-timing windows (Love) | Periods when Jupiter transits, or casts its 5th/7th/9th aspect on, the 7th house sign, the 7th lord's sign or the Darakaraka's sign. All matching periods are listed with their factors. **No grading.** | Classical gochara timing via Jupiter (Parashari) plus Jaimini Darakaraka | Graded windows ("Excellent/Good") with no stated rule |
| D-005 | Darakaraka | 7-karaka Jaimini scheme (Rahu excluded); the planet with the lowest degree in its sign | The engine's existing chara-karaka implementation | Same scheme |
| D-006 | Doshas | Not presented as afflictions. The editorial validator blocks "suffer from / afflicted by" framing; the disclaimer states that Astro Sushil does not believe in doshas | Product owner's instruction | Fear-adjacent framing |
| D-007 | Remedies | Practical, ethical and devotional practices only. No purchases, gems or rituals for sale. | Brand philosophy (`templates/disclaimer_philosophy.tex`) | Gem and rudraksha upsell with coupons |
| D-008 | Author identity | Shown as "Astro Sushil" only | Spelling (Kumar or Kumaar) pending client confirmation | — |
