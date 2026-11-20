/**
 * Lifetime Sade Sati, Kantaka Shani and Dhaiya, computed from solved Saturn
 * sign ingresses (never from fixed tables). Decisions: docs/report-system/decisions/planet-transits.md
 *
 * - Sade Sati (PT-003): Saturn's transit through the 12th, 1st and 2nd signs
 *   from the natal Moon sign. Rising = 12th, Peak = 1st (Janma Shani),
 *   Setting = 2nd. A cycle runs from the first ingress into the 12th to the
 *   final egress from the 2nd; retrograde re-entries are kept as separate spans.
 * - Kantaka Shani (PT-004): Saturn transiting the kendras (4th, 7th, 10th) from
 *   the natal Moon ("kantaka" is the classical synonym for kendra).
 * - Dhaiya / Small Panoti (PT-004): the two 2.5-year Saturn transits of the 4th
 *   (Ardhashtama) and 8th (Ashtama) from the natal Moon.
 */
import { houseFrom, SignSpan, SignStay, yearsBetween } from './timeline';

export type SadeSatiPhaseKey = 'rising' | 'peak' | 'setting';
export const SADE_SATI_HOUSES: Record<SadeSatiPhaseKey, number> = { rising: 12, peak: 1, setting: 2 };
export const PHASE_LABEL: Record<SadeSatiPhaseKey, string> = {
  rising: 'Rising phase (12th from Moon)',
  peak: 'Peak phase (Moon sign)',
  setting: 'Setting phase (2nd from Moon)',
};

export interface SadeSatiPhase {
  key: SadeSatiPhaseKey;
  houseFromMoon: number;
  signIndex: number;
  sign: string;
  spans: SignSpan[];
  startIso: string;
  endIso: string;
}

export interface SadeSatiCycle {
  n: number;
  startIso: string;
  endIso: string;
  ageAtStart: number;
  ageAtEnd: number;
  /** Cycle started before birth (the native was born during it). */
  beganBeforeBirth: boolean;
  phases: SadeSatiPhase[];
}

export interface SaturnMoonPeriod {
  n: number;
  /** House of transiting Saturn counted from the natal Moon sign. */
  houseFromMoon: number;
  houseFromLagna: number;
  signIndex: number;
  sign: string;
  kinds: Array<'kantaka' | 'dhaiya'>;
  label: string;
  spans: SignSpan[];
  startIso: string;
  endIso: string;
  ageAtStart: number;
  ageAtEnd: number;
  /** Which round of Saturn around the zodiac since birth (1-based). */
  round: number;
}

export interface PhaseStatus {
  active: boolean;
  /** Present when active. */
  cycle?: number;
  phase?: SadeSatiPhaseKey;
  /** Saturn's house from the Moon on the as-of date. */
  saturnHouseFromMoon: number;
  saturnSign: string;
}

const inSpan = (t: number, s: SignSpan) => Date.parse(s.startIso) <= t && t < Date.parse(s.endIso);

/**
 * Sade Sati cycles from Saturn stays. Only cycles overlapping [birth, birth+maxAge years] are returned.
 * `stays` must cover from well before birth (≥ 9 years) so a cycle running at birth has a real start.
 */
export function computeSadeSatiCycles(stays: SignStay[], moonSign: number, birthIso: string, maxAge = 90): SadeSatiCycle[] {
  const limit = Date.parse(birthIso) + maxAge * 365.25 * 86400000;
  const birth = Date.parse(birthIso);
  const cycles: SadeSatiCycle[] = [];
  for (let i = 0; i < stays.length; i++) {
    const st = stays[i];
    if (houseFrom(moonSign, st.signIndex) !== 12) continue;
    const peak = stays.slice(i + 1).find((s) => houseFrom(moonSign, s.signIndex) === 1);
    const setting = peak ? stays.slice(stays.indexOf(peak) + 1).find((s) => houseFrom(moonSign, s.signIndex) === 2) : undefined;
    if (!peak || !setting) continue; // incomplete at the end of the calculation window
    if (st.spans[0].startClipped) continue; // incomplete at the start of the window
    const phases: SadeSatiPhase[] = (['rising', 'peak', 'setting'] as const).map((key) => {
      const s = key === 'rising' ? st : key === 'peak' ? peak : setting;
      return { key, houseFromMoon: SADE_SATI_HOUSES[key], signIndex: s.signIndex, sign: s.sign, spans: s.spans, startIso: s.firstStartIso, endIso: s.lastEndIso };
    });
    const startIso = st.firstStartIso;
    const endIso = setting.lastEndIso;
    if (Date.parse(endIso) < birth || Date.parse(startIso) > limit) continue;
    cycles.push({
      n: cycles.length + 1,
      startIso,
      endIso,
      ageAtStart: Math.max(0, yearsBetween(birthIso, startIso)),
      ageAtEnd: Math.max(0, yearsBetween(birthIso, endIso)),
      beganBeforeBirth: Date.parse(startIso) < birth,
      phases,
    });
  }
  return cycles;
}

/** Status on a given date, read directly from the spans (exact, includes retrograde re-entries). */
export function sadeSatiStatus(cycles: SadeSatiCycle[], spans: SignSpan[], moonSign: number, asOfIso: string): PhaseStatus {
  const t = Date.parse(asOfIso);
  const cur = spans.find((s) => inSpan(t, s));
  if (!cur) throw new Error('SADE_SATI_STATUS_OUT_OF_RANGE');
  const h = houseFrom(moonSign, cur.signIndex);
  for (const c of cycles) {
    for (const p of c.phases) {
      if (p.spans.some((s) => inSpan(t, s))) {
        return { active: true, cycle: c.n, phase: p.key, saturnHouseFromMoon: h, saturnSign: cur.sign };
      }
    }
  }
  return { active: false, saturnHouseFromMoon: h, saturnSign: cur.sign };
}

const KANTAK_LABEL: Record<number, string> = {
  4: 'Kantaka (4th) and Ardhashtama Dhaiya',
  7: 'Kantaka (7th)',
  8: 'Ashtama Dhaiya (8th)',
  10: 'Kantaka (10th)',
};

/** Saturn's kendra (4/7/10) and Dhaiya (4/8) transits from the Moon over the lifetime window. */
export function computeKantakDhaiya(stays: SignStay[], moonSign: number, lagnaSign: number, birthIso: string, maxAge = 90): SaturnMoonPeriod[] {
  const birth = Date.parse(birthIso);
  const limit = birth + maxAge * 365.25 * 86400000;
  const out: SaturnMoonPeriod[] = [];
  let round = 0;
  let lastHouse = 0;
  for (const st of stays) {
    const h = houseFrom(moonSign, st.signIndex);
    if (![4, 7, 8, 10].includes(h)) continue;
    if (Date.parse(st.lastEndIso) < birth || Date.parse(st.firstStartIso) > limit) continue;
    if (st.spans[0].startClipped || st.spans[st.spans.length - 1].endClipped) continue;
    if (round === 0 || h <= lastHouse) round++;
    lastHouse = h;
    const kinds: Array<'kantaka' | 'dhaiya'> = [];
    if ([4, 7, 10].includes(h)) kinds.push('kantaka');
    if ([4, 8].includes(h)) kinds.push('dhaiya');
    out.push({
      n: out.length + 1, houseFromMoon: h, houseFromLagna: houseFrom(lagnaSign, st.signIndex), signIndex: st.signIndex, sign: st.sign,
      kinds, label: KANTAK_LABEL[h], spans: st.spans, startIso: st.firstStartIso, endIso: st.lastEndIso,
      ageAtStart: Math.max(0, yearsBetween(birthIso, st.firstStartIso)), ageAtEnd: Math.max(0, yearsBetween(birthIso, st.lastEndIso)), round,
    });
  }
  return out;
}
