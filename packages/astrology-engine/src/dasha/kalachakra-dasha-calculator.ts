import { PlanetSymbol } from '../planets/planet.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { RASHIS } from '../zodiac/rashi';
import { NAKSHATRAS } from '../nakshatra/nakshatra';
import type { AstroChart } from '../chart/astro-chart.types';
import { MS_PER_YEAR } from './dasha-calculator';
import {
  DashaCalculationOptions,
  DashaEligibilityResult,
  KalachakraDashaPeriod,
  KalachakraDashaTree,
  KalachakraSignRef,
} from './dasha.types';
import { buildPeriodBase, buildSubPeriods, resolveCurrentPeriod, PeriodTreeContext } from './period-tree-builder';

/**
 * Kalachakra Dasha (BPHS, Kalachakra Dasha chapter). Decision log KCD-001..KCD-008.
 *
 * - The 27 nakshatras form 9 triads starting at Ashwini. Triads 1, 3, 5, 7, 9 (Ashwini,
 *   Punarvasu, Hasta, Moola, Purva Bhadrapada groups) are SAVYA; triads 2, 4, 6, 8 (Rohini,
 *   Magha, Vishakha, Shravana groups) are APASAVYA.
 * - Each of the 108 padas owns an ordered sequence of 9 dasha signs. With
 *     F = Ar Ta Ge Cn Le Vi Li Sc Sg Cp Aq Pi
 *     R = Sc Li Vi Cn Le Ge Ta Ar Pi Aq Cp Sg
 *   the 36 signs of the 4 padas of a nakshatra, read in groups of 9, are:
 *     savya, 1st/3rd nakshatra of the triad: F R F     savya, 2nd: R F R
 *     apasavya, 1st/3rd nakshatra:  rev(R) rev(F) rev(R)  apasavya, 2nd: rev(F) rev(R) rev(F)
 *   This reproduces the BPHS table (Ashwini 1 = Ar..Sg, Bharani 1 = Sc Li Vi Cn Le Ge Ta Ar Pi,
 *   Rohini 1 = Sg Cp Aq Pi Ar Ta Ge Le Cn, Mrigashira 1 = Pi Aq Cp Sg Sc Li Vi Le Cn) and the
 *   paramayus of 100/85/83/86 (savya padas 1-4) and 86/83/85/100 (apasavya padas 1-4).
 * - Sign years follow the sign lord: Sun 5, Moon 21, Mars 7, Mercury 9, Jupiter 10, Venus 16,
 *   Saturn 4.
 * - Elapsed years at birth = Moon's elapsed fraction of the pada x the pada's paramayus; walking
 *   the 9 signs gives the running sign and its balance. Later dashas continue through the 9 signs
 *   of the following pada(s).
 * - Antardashas: the 9 signs of the Mahadasha's own pada sequence, starting from the Mahadasha
 *   sign (cyclically), each lasting MD years x sign years / paramayus of that pada.
 * - Deha / Jeeva: savya -> first sign is Deha, last is Jeeva; apasavya -> reversed (configurable).
 */
export const KALACHAKRA_SIGN_YEARS: Record<number, number> = {
  1: 7, 2: 16, 3: 9, 4: 21, 5: 5, 6: 9, 7: 16, 8: 7, 9: 10, 10: 4, 11: 4, 12: 10,
};

const F = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const R = [8, 7, 6, 4, 5, 3, 2, 1, 12, 11, 10, 9];
const rev = (a: number[]) => [...a].reverse();

const SAVYA_OUTER = [...F, ...R, ...F];
const SAVYA_MIDDLE = [...R, ...F, ...R];
const APASAVYA_OUTER = [...rev(R), ...rev(F), ...rev(R)];
const APASAVYA_MIDDLE = [...rev(F), ...rev(R), ...rev(F)];

export type KalachakraDehaJeevaConvention = 'APASAVYA_REVERSED' | 'SAME_AS_SAVYA';

export interface KalachakraOptions extends DashaCalculationOptions {
  dehaJeevaConvention?: KalachakraDehaJeevaConvention;
  mahadashaCount?: number; // default 9
}

export function isSavyaNakshatra(nakshatraIndex: number): boolean {
  return Math.floor((nakshatraIndex - 1) / 3) % 2 === 0;
}

/** The 9 dasha signs of an absolute pada index (0..107). */
export function getKalachakraPadaSequence(padaIndex: number): number[] {
  const p = ((padaIndex % 108) + 108) % 108;
  const nakIdx0 = Math.floor(p / 4);
  const padaInNak = p % 4;
  const middle = nakIdx0 % 3 === 1;
  const savya = isSavyaNakshatra(nakIdx0 + 1);
  const seq36 = savya ? (middle ? SAVYA_MIDDLE : SAVYA_OUTER) : middle ? APASAVYA_MIDDLE : APASAVYA_OUTER;
  return seq36.slice(padaInNak * 9, padaInNak * 9 + 9);
}

export function getKalachakraParamayus(padaIndex: number): number {
  return getKalachakraPadaSequence(padaIndex).reduce((s, sign) => s + KALACHAKRA_SIGN_YEARS[sign], 0);
}

function signRef(sign: number): KalachakraSignRef {
  const d = RASHIS[sign - 1];
  return { signIndex: sign, signName: d.englishName, sanskritName: d.sanskritName, lord: d.ruler as PlanetSymbol };
}

export function evaluateKalachakraEligibility(): DashaEligibilityResult {
  return {
    isEligible: true,
    system: 'KALACHAKRA',
    tradition: 'PARASHARA',
    eligibilityMethod: 'UNIVERSAL_PARASHARA_KALACHAKRA',
    reason: 'Kalachakra Dasha is a universal Nakshatra-pada Dasha applicable to every chart.',
  };
}

interface KcKey {
  padaIndex: number;
  pos: number; // 0..8 position inside that pada's 9-sign sequence
}

export class KalachakraDashaCalculator {
  public calculateKalachakraDasha(
    moonLongitude: number,
    birthDateUtc: Date,
    options?: KalachakraOptions
  ): KalachakraDashaTree {
    const opts = options || {};
    const maxLevel = Math.max(1, Math.min(3, opts.maxLevel ?? 2));
    const mdCount = Math.max(1, Math.min(36, opts.mahadashaCount ?? 9));
    const dehaJeevaConvention = opts.dehaJeevaConvention ?? 'APASAVYA_REVERSED';

    const lon = normalizeDegree(moonLongitude);
    const padaSpan = 360 / 108;
    const padaIndex = Math.min(107, Math.floor(lon / padaSpan));
    const fractionElapsed = Math.max(0, Math.min(1, (lon - padaIndex * padaSpan) / padaSpan));
    const nakshatraIndex = Math.floor(padaIndex / 4) + 1;
    const pada = (padaIndex % 4) + 1;
    const savya = isSavyaNakshatra(nakshatraIndex);

    const sequence = getKalachakraPadaSequence(padaIndex);
    const paramayus = getKalachakraParamayus(padaIndex);
    const elapsedInPadaYears = fractionElapsed * paramayus;

    // Locate the running sign at birth.
    let acc = 0;
    let startPos = 0;
    for (let i = 0; i < 9; i++) {
      const y = KALACHAKRA_SIGN_YEARS[sequence[i]];
      if (elapsedInPadaYears < acc + y || i === 8) {
        startPos = i;
        break;
      }
      acc += y;
    }
    const elapsedInSign = elapsedInPadaYears - acc;
    const firstYears = KALACHAKRA_SIGN_YEARS[sequence[startPos]];
    const balanceAtBirthYears = firstYears - elapsedInSign;

    const firstIsDeha = savya || dehaJeevaConvention === 'SAME_AS_SAVYA';
    const dehaPos = (seq: number[]) => (firstIsDeha ? 0 : seq.length - 1);
    const jeevaPos = (seq: number[]) => (firstIsDeha ? seq.length - 1 : 0);

    const birthMs = birthDateUtc.getTime();
    const signOf = (k: KcKey) => getKalachakraPadaSequence(k.padaIndex)[k.pos];
    const decorate = (key: KcKey, base: ReturnType<typeof buildPeriodBase>): KalachakraDashaPeriod => {
      const sign = signOf(key);
      const d = RASHIS[sign - 1];
      const seq = getKalachakraPadaSequence(key.padaIndex);
      const nIdx = Math.floor(key.padaIndex / 4);
      return {
        ...base,
        signIndex: sign,
        rashiIndex: sign,
        signName: d.englishName,
        sanskritName: d.sanskritName,
        sourcePadaIndex: key.padaIndex,
        sourceNakshatraName: NAKSHATRAS[nIdx].name,
        sourcePada: (key.padaIndex % 4) + 1,
        isDeha: key.pos === dehaPos(seq),
        isJeeva: key.pos === jeevaPos(seq),
      };
    };
    const ctx: PeriodTreeContext<KcKey, KalachakraDashaPeriod> = {
      birthMs,
      maxLevel,
      // Sub-periods: the 9 signs of the parent's pada sequence starting from the parent's own
      // position (cyclically), weighted by sign years (KCD-006).
      childrenOf: (parent) =>
        Array.from({ length: 9 }, (_, k) => {
          const key = { padaIndex: parent.padaIndex, pos: (parent.pos + k) % 9 };
          return { key, weight: KALACHAKRA_SIGN_YEARS[signOf(key)] };
        }),
      decorate,
    };
    const lordOf = (k: KcKey) => RASHIS[signOf(k) - 1].ruler as PlanetSymbol;

    const mahadashas: KalachakraDashaPeriod[] = [];
    let curPada = padaIndex;
    let curPos = startPos;
    let cursorMs = Math.round(birthMs - elapsedInSign * MS_PER_YEAR);
    for (let i = 0; i < mdCount; i++) {
      const key = { padaIndex: curPada, pos: curPos };
      const years = KALACHAKRA_SIGN_YEARS[signOf(key)];
      const endMs = Math.round(cursorMs + years * MS_PER_YEAR);
      const base = buildPeriodBase(1, i + 1, lordOf(key), cursorMs, endMs, years, birthMs);
      const md = decorate(key, base);
      const subs = buildSubPeriods(ctx, key, cursorMs, years, 2, lordOf);
      if (subs.length > 0) md.subPeriods = subs;
      mahadashas.push(md);
      cursorMs = endMs;
      curPos++;
      if (curPos >= 9) {
        curPos = 0;
        curPada = (curPada + 1) % 108;
      }
    }

    const nak = NAKSHATRAS[nakshatraIndex - 1];
    const tree: KalachakraDashaTree = {
      dashaSystem: 'KALACHAKRA',
      system: 'KALACHAKRA',
      basis: 'NAKSHATRA_PADA',
      directionType: savya ? 'SAVYA' : 'APASAVYA',
      moonLongitude: lon,
      nakshatraIndex,
      nakshatraName: nak.name,
      pada,
      padaIndex,
      padaSequence: sequence.map(signRef),
      totalPadaYears: paramayus,
      dehaRashi: signRef(sequence[dehaPos(sequence)]),
      jeevaRashi: signRef(sequence[jeevaPos(sequence)]),
      dehaJeevaConvention,
      elapsedInPadaYears,
      balanceAtBirthYears,
      totalCycleYears: mahadashas.reduce((s, m) => s + m.nominalYears, 0),
      mahadashas,
    };
    const current = resolveCurrentPeriod(mahadashas, opts.targetDate);
    if (current) tree.currentPeriod = current;
    return tree;
  }

  public calculateForChart(chart: AstroChart, options?: KalachakraOptions): KalachakraDashaTree {
    const moon = chart.planets[PlanetSymbol.MOON];
    if (!moon || typeof moon.longitude !== 'number') {
      throw new Error('Kalachakra Dasha requires the natal Moon longitude.');
    }
    const birthIso = chart.metadata?.normalizedTime?.utcIsoString;
    if (!birthIso) throw new Error('Kalachakra Dasha requires the normalized UTC birth instant.');
    return this.calculateKalachakraDasha(moon.longitude, new Date(birthIso), options);
  }
}
