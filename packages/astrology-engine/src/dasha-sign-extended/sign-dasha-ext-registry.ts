import { PlanetSymbol } from '../planets/planet.types';
import type { AstroChart } from '../chart/astro-chart.types';
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { SignDashaDirection } from '../dasha/dasha.types';
import { resolveLagnaRashiIndex } from '../dasha/dasha-eligibility';
import { resolveCurrentPeriod } from '../dasha/period-tree-builder';
import { signAt } from '../dasha/jaimini-sign-dasha-utils';
import {
  SIGN_DASHA_EXT_KENDRADI_OFFSETS,
  SIGN_DASHA_EXT_TRIKONA_OFFSETS,
  signDashaExtBuildTree,
  signDashaExtDrigSequence,
  signDashaExtParityDirection,
  signDashaExtSaturnKetuDirection,
  signDashaExtSequence,
  signDashaExtSignName,
  signDashaExtSpecs,
  signDashaExtSreeLagna,
  signDashaExtStronger,
} from './sign-dasha-ext-common';
import {
  SIGN_DASHA_EXT_PROVISIONAL_LABEL,
  SignDashaExtOptions,
  SignDashaExtPendingInfo,
  SignDashaExtSreeLagna,
  SignDashaExtSystem,
  SignDashaExtSystemInfo,
  SignDashaExtTree,
  SignDashaExtYearsRule,
} from './sign-dasha-ext.types';

const VAIA = 'P.V.R. Narasimha Rao, "Vedic Astrology: An Integrated Approach" (2000)';
const BPHS = 'Brihat Parasara Hora Sastra (R. Santhanam tr., vol. 2, 1984; G.C. Sharma tr.)';
const ANTARDASHA_SOURCE = 'Antardashas: BPHS ch. 51 v. 5-12.';

/** Shared note on how Antardashas and Pratyantardashas are formed (BPHS ch. 51). */
const ANTARDASHA_NOTE =
  'Antardashas (and Pratyantardashas) are 12 equal parts per BPHS ch. 51 v. 5-12: they start from the dasa sign or the 7th from it, whichever is stronger (engine Rasi Bala rules JSD-007); they run onwards for an odd dasa sign and in reverse for an even one; movable signs move to consecutive signs, fixed signs to every 6th sign, dual signs through the kendras of the sign, then of its 5th, then of its 9th.';

const STRENGTH_NOTE =
  'Stronger-sign choices use the engine\'s Jaimini Rasi Bala comparison (JSD-007: occupants, association of Jupiter/Mercury/lord, exalted occupants, natural strength, lord in sign of different oddity, lord advancement); a full tie keeps the first-named sign.';

const NARAYANA_YEARS_NOTE =
  'Dasa years: count from the sign to its lord, forward for odd-footed signs (Ar, Ta, Ge, Li, Sc, Sg) and backward otherwise, minus one; 12 if the lord occupies the sign; +1 if the lord is exalted, -1 if debilitated (floored at 1); the stronger lord is used for Scorpio and Aquarius (VAIA 18.2.2). Second cycle = 12 minus the first-cycle years, signs with 0 years skipped (VAIA 18.2.2 note 2).';

const STHIRA_YEARS_NOTE = 'Dasa years: 7 for movable, 8 for fixed, 9 for dual signs (Sthira Dasa spans, BPHS ch. 46 v. 168); one 96-year cycle is generated.';

interface SystemDef {
  info: SignDashaExtSystemInfo;
  notes: string[];
}

function info(
  system: SignDashaExtSystem,
  name: string,
  source: string,
  yearsRule: SignDashaExtYearsRule,
  summary: string
): SignDashaExtSystemInfo {
  const out: SignDashaExtSystemInfo = {
    system,
    name,
    group: 'SIGN',
    implemented: true,
    provisional: true,
    provisionalLabel: SIGN_DASHA_EXT_PROVISIONAL_LABEL,
    source,
    yearsRule,
    summary,
  };
  if (yearsRule === 'STHIRA_FIXED') out.fixedCycleYears = 96;
  return out;
}

const SYSTEMS: Record<SignDashaExtSystem, SystemDef> = {
  SUDASA: {
    info: info(
      'SUDASA',
      'Sudasa (Sree Lagna Kendradi Rasi Dasa)',
      `${VAIA}, ch. 20 "Sudasa" (20.2, Examples 77 and 79) with Sree Lagna from 5.7; ${ANTARDASHA_SOURCE}`,
      'CHARA_NARAYANA_COUNT',
      'Starts from the sign of Sree Lagna; kendras, panapharas, apoklimas; forward for an odd sign, backward for an even sign; only the unexpired fraction of the first dasa remains at birth.'
    ),
    notes: [
      'Direction: odd/even sign of Sree Lagna, with no planetary exceptions, as stated in VAIA 20.2(2) and applied in Example 77. Alternative not used: the later birth-time example in VAIA ch. 32 applies the Kendradi Ketu exception (Ketu in the Sree Lagna sign reverses the order).',
      'Balance: (30 deg - Sree Lagna advancement in its sign) / 30 deg of the first dasa is left at birth (VAIA 20.2(7)); the second cycle starts with full lengths.',
      NARAYANA_YEARS_NOTE,
      ANTARDASHA_NOTE,
      STRENGTH_NOTE,
    ],
  },
  KENDRADI: {
    info: info(
      'KENDRADI',
      'Kendradi Rasi Dasa (Lagna Kendradi)',
      `${VAIA}, ch. 19 "Lagna Kendradi Rasi Dasa" (19.2); ${ANTARDASHA_SOURCE}`,
      'CHARA_NARAYANA_COUNT',
      'Starts from the stronger of Lagna and the 7th; kendras, panapharas, apoklimas; forward for an odd sign, backward for an even sign (Saturn / Ketu exceptions).'
    ),
    notes: [
      'Variant chosen: VAIA ch. 19 (fixed kendra -> panaphara -> apoklima order). Alternative not used: BPHS ch. 46 v. 175-176 orders the signs inside each group by comparative strength.',
      'Direction: odd/even seed sign; Saturn in the seed makes it forward, otherwise Ketu in the seed reverses it (VAIA 19.2(2)). Saturn is checked first if both occupy the seed.',
      'First dasa runs in full from birth (no balance is defined).',
      NARAYANA_YEARS_NOTE,
      ANTARDASHA_NOTE,
      STRENGTH_NOTE,
    ],
  },
  TRIKONA: {
    info: info(
      'TRIKONA',
      'Trikona Dasa',
      `${BPHS}, ch. 46 v. 183-184 "Trikona Dasa" (worked example sequence in Santhanam); years as Chara Dasa; ${ANTARDASHA_SOURCE}`,
      'CHARA_NARAYANA_COUNT',
      'Starts from the strongest of Lagna, 5th and 9th; trines of the 1st, 2nd, 3rd and 4th signs from it; onwards for an odd sign, in reverse for an even sign.'
    ),
    notes: [
      'Strongest of Lagna, 5th and 9th: Lagna is compared with the 5th and the winner with the 9th; ties keep the earlier house.',
      'Direction: odd/even starting sign, no planetary exceptions (BPHS v. 183-184).',
      'First dasa runs in full from birth (no balance is defined).',
      NARAYANA_YEARS_NOTE + ' The +1/-1 exaltation/debilitation adjustment follows the K.N. Rao / VAIA Chara-Narayana convention already used by the engine.',
      ANTARDASHA_NOTE,
      STRENGTH_NOTE,
    ],
  },
  MANDOOKA: {
    info: info(
      'MANDOOKA',
      'Mandooka Dasa',
      `${BPHS}, ch. 46 v. 179-180 "Mandooka Dasa" (worked example sequence in Santhanam); ${ANTARDASHA_SOURCE}`,
      'STHIRA_FIXED',
      'Starts from the stronger of Lagna and the 7th; each dasa jumps to the next 3rd sign (three of each modality); onwards for an odd sign, in reverse for an even sign; Sthira spans.'
    ),
    notes: [
      'Variant chosen: BPHS ch. 46 v. 179-180 as translated by R. Santhanam (the "next 3rd sign" jump, giving Aq, Ta, Le, Sc, Pi, Ge, ... in the book example). Alternative not used: VAIA 19.4 argues that true mandooki gati is the 3rd/11th jump of Kalachakra Dasa.',
      'Direction: odd/even starting sign, no planetary exceptions.',
      'First dasa runs in full from birth (no balance is defined).',
      STHIRA_YEARS_NOTE,
      ANTARDASHA_NOTE,
      STRENGTH_NOTE,
    ],
  },
  DRIG: {
    info: info(
      'DRIG',
      'Drig Dasa',
      `${BPHS}, ch. 46 v. 185-187 "Drig (Dirga) Dasa" (worked example sequence and Sthira years in Santhanam); ${ANTARDASHA_SOURCE}`,
      'STHIRA_FIXED',
      '9th, 10th and 11th signs from Lagna, each followed by the three signs it aspects: counted backwards from a movable sign, onwards from a fixed sign, onwards/backwards from an odd/even dual sign.'
    ),
    notes: [
      'Variant chosen: BPHS ch. 46 v. 185-187 with the Sthira years of the Santhanam worked example. Alternative not used: VAIA ch. 21 orders the aspected signs by the odd-/even-footedness of the 9th/10th/11th and uses Narayana-dasa years.',
      'First dasa runs in full from birth (no balance is defined).',
      STHIRA_YEARS_NOTE,
      ANTARDASHA_NOTE,
      STRENGTH_NOTE,
    ],
  },
  NIRYANA_SHOOLA: {
    info: info(
      'NIRYANA_SHOOLA',
      'Niryana Shoola Dasa',
      `${BPHS}, ch. 46 v. 181-182 "Shoola Dasa"; ${VAIA}, ch. 22 "Niryaana Shoola Dasa" (22.2.1, Examples 84-88); ${ANTARDASHA_SOURCE}`,
      'STHIRA_FIXED',
      'Starts from the stronger of the 2nd and 8th; onwards for an odd sign, in reverse for an even sign (Saturn exception); Sthira spans.'
    ),
    notes: [
      'Direction: odd/even starting sign (BPHS v. 181-182); Saturn in the starting sign makes it forward (VAIA ch. 22 Examples 87-88). No Ketu exception is applied (none is given for this dasa).',
      'First dasa runs in full from birth (VAIA Example 84 dates).',
      STHIRA_YEARS_NOTE,
      ANTARDASHA_NOTE + ' Alternative not used: VAIA 22.2.1 suggests the Narayana Dasa antardasha rule (start from the sign holding the lord of the stronger of the dasa sign and its 7th).',
      STRENGTH_NOTE,
    ],
  },
};

const PENDING: SignDashaExtPendingInfo[] = [
  {
    system: 'BRAHMA',
    name: 'Brahma (Brahma Graha) Dasa',
    group: 'SIGN',
    implemented: false,
    reason:
      'BPHS ch. 46 v. 170-173 does not define "greatest strength" among the 6th/8th/12th lords, the "within the sixth house from the house concerned" condition is read differently in the translations, and the Saturn/Rahu/Ketu clause is ambiguous; the starting sign therefore cannot be fixed without a client ruling.',
  },
  {
    system: 'NAVAMSA',
    name: 'Navamsa Dasa',
    group: 'SIGN',
    implemented: false,
    reason:
      'Published versions (Jaimini Sutras ed. S.C. Mishra; Sanjay Rath; I. Rangacharya; P.S. Sastri; Shrimali) disagree on the starting sign for even Lagnas and on the balance at birth; no BPHS rule exists.',
  },
  {
    system: 'VARNADA',
    name: 'Varnada Dasa',
    group: 'SIGN',
    implemented: false,
    reason:
      'BPHS ch. 6 v. 10-24 (Santhanam; ch. 5 in G.C. Sharma) gives the Varnada Lagna but not whether the "signs intervening" count is inclusive or its direction, how the Varnada of houses 2-12 pairs with the Hora Lagna, or what "clockwise" means; it also needs the Hora Lagna (sunrise convention under ADR-015 rework).',
  },
  {
    system: 'PADANADHAMSA',
    name: 'Padanadhamsa Dasa',
    group: 'SIGN',
    implemented: false,
    reason: 'No published computation was available to verify (described only in Sanjay Rath\'s "Narayana Dasa", not accessible here).',
  },
];

export const SIGN_DASHA_EXT_SYSTEMS: readonly SignDashaExtSystem[] = [
  'SUDASA',
  'DRIG',
  'NIRYANA_SHOOLA',
  'MANDOOKA',
  'TRIKONA',
  'KENDRADI',
];

const CONSECUTIVE_OFFSETS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

interface StartChoice {
  start: number;
  startReason: string;
  sequence: number[];
  direction: SignDashaDirection;
  directionReason: string;
  elapsedAtBirthYears?: (firstYears: number) => number;
  sreeLagna?: SignDashaExtSreeLagna;
}

function strongerOfLagnaAnd7th(chart: AstroChart, lagna: number): { start: number; reason: string } {
  const seventh = signAt(lagna, 6);
  const s = signDashaExtStronger(chart, lagna, seventh);
  return {
    start: s.sign,
    reason: `Stronger of Lagna (${signDashaExtSignName(lagna)}) and 7th (${signDashaExtSignName(seventh)}): ${signDashaExtSignName(s.sign)} (${s.rule}).`,
  };
}

function choose(system: SignDashaExtSystem, chart: AstroChart, lagna: number): StartChoice {
  switch (system) {
    case 'SUDASA': {
      const moon = chart.planets[PlanetSymbol.MOON]?.longitude;
      if (typeof moon !== 'number' || typeof chart.ascendant?.longitude !== 'number') {
        throw new Error('Sudasa requires the Lagna and Moon longitudes.');
      }
      const sl = signDashaExtSreeLagna(chart.ascendant.longitude, moon);
      const dir = signDashaExtParityDirection(sl.signIndex);
      const d = {
        direction: dir,
        reason: `Sree Lagna is in ${sl.signName}, an ${sl.signIndex % 2 === 1 ? 'odd' : 'even'} sign, so kendras etc. are counted ${dir === 'FORWARD' ? 'forward' : 'backward'}.`,
      };
      const fractionLeft = (30 - sl.degreeInSign) / 30;
      return {
        start: sl.signIndex,
        startReason: `Sign containing Sree Lagna (${sl.signName} ${sl.degreeInSign.toFixed(4)} deg).`,
        sequence: signDashaExtSequence(sl.signIndex, SIGN_DASHA_EXT_KENDRADI_OFFSETS, d.direction),
        direction: d.direction,
        directionReason: d.reason,
        elapsedAtBirthYears: (firstYears) => firstYears * (1 - fractionLeft),
        sreeLagna: sl,
      };
    }
    case 'KENDRADI':
    case 'MANDOOKA': {
      const s = strongerOfLagnaAnd7th(chart, lagna);
      const natural = signDashaExtParityDirection(s.start);
      const d =
        system === 'KENDRADI'
          ? signDashaExtSaturnKetuDirection(chart, s.start, natural, true)
          : { direction: natural, reason: `${signDashaExtSignName(s.start)} is an ${s.start % 2 === 1 ? 'odd' : 'even'} sign, so the order is ${natural === 'FORWARD' ? 'onwards' : 'in reverse'}.` };
      return {
        start: s.start,
        startReason: s.reason,
        sequence: signDashaExtSequence(s.start, SIGN_DASHA_EXT_KENDRADI_OFFSETS, d.direction),
        direction: d.direction,
        directionReason: d.reason,
      };
    }
    case 'TRIKONA': {
      const fifth = signAt(lagna, 4);
      const ninth = signAt(lagna, 8);
      const a = signDashaExtStronger(chart, lagna, fifth);
      const b = signDashaExtStronger(chart, a.sign, ninth);
      const d = signDashaExtParityDirection(b.sign);
      return {
        start: b.sign,
        startReason: `Strongest of Lagna (${signDashaExtSignName(lagna)}), 5th (${signDashaExtSignName(fifth)}) and 9th (${signDashaExtSignName(ninth)}): ${signDashaExtSignName(b.sign)} (${b.rule}).`,
        sequence: signDashaExtSequence(b.sign, SIGN_DASHA_EXT_TRIKONA_OFFSETS, d),
        direction: d,
        directionReason: `${signDashaExtSignName(b.sign)} is an ${b.sign % 2 === 1 ? 'odd' : 'even'} sign, so the order is ${d === 'FORWARD' ? 'onwards' : 'in reverse'}.`,
      };
    }
    case 'DRIG': {
      const drig = signDashaExtDrigSequence(lagna);
      const describe = drig.groups
        .map((g) => `${signDashaExtSignName(g.sign)} (${g.direction === 'FORWARD' ? 'onwards' : 'backwards'})`)
        .join(', ');
      return {
        start: drig.groups[0].sign,
        startReason: `9th sign from Lagna (${signDashaExtSignName(drig.groups[0].sign)}).`,
        sequence: drig.sequence,
        direction: drig.groups[0].direction,
        directionReason: `Aspected signs are taken per group: ${describe} (movable backwards, fixed onwards, dual odd onwards / even backwards).`,
      };
    }
    case 'NIRYANA_SHOOLA': {
      const second = signAt(lagna, 1);
      const eighth = signAt(lagna, 7);
      const s = signDashaExtStronger(chart, second, eighth);
      const d = signDashaExtSaturnKetuDirection(chart, s.sign, signDashaExtParityDirection(s.sign), false);
      return {
        start: s.sign,
        startReason: `Stronger of 2nd (${signDashaExtSignName(second)}) and 8th (${signDashaExtSignName(eighth)}): ${signDashaExtSignName(s.sign)} (${s.rule}).`,
        sequence: signDashaExtSequence(s.sign, CONSECUTIVE_OFFSETS, d.direction),
        direction: d.direction,
        directionReason: d.reason,
      };
    }
  }
}

/**
 * Standalone registry for the extra sign dashas (does not touch the core DashaRegistry).
 * `calculate` returns the same period-tree shape as the engine's Chara / Narayana Dasa
 * (mahadashas with subPeriods, ISO start/end, sign + lord, isActive flags, currentPeriod).
 */
export const SignDashaExtendedRegistry = {
  listSystems(): SignDashaExtSystemInfo[] {
    return SIGN_DASHA_EXT_SYSTEMS.map((s) => ({ ...SYSTEMS[s].info }));
  },

  listPending(): SignDashaExtPendingInfo[] {
    return PENDING.map((p) => ({ ...p }));
  },

  isSystem(system: string): system is SignDashaExtSystem {
    return (SIGN_DASHA_EXT_SYSTEMS as readonly string[]).includes(system);
  },

  calculate(
    system: SignDashaExtSystem,
    chart: AstroChart,
    options: SignDashaExtOptions = {},
    config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG
  ): SignDashaExtTree {
    const def = SYSTEMS[system];
    if (!def) throw new Error(`Unknown sign dasha system: ${String(system)}`);
    // Positions come from `chart`, which was computed with `config` (ayanamsa / node options).
    void config;
    const maxLevel = Math.max(1, Math.min(3, Math.trunc(options.maxLevel ?? 2)));
    const birthIso = chart.metadata?.normalizedTime?.utcIsoString;
    if (!birthIso) throw new Error(`${def.info.name} requires the normalized UTC birth instant.`);
    const birthMs = new Date(birthIso).getTime();
    const lagna = resolveLagnaRashiIndex(chart);

    const c = choose(system, chart, lagna);
    const specs = signDashaExtSpecs(chart, c.sequence, def.info.yearsRule);
    const elapsed = c.elapsedAtBirthYears ? c.elapsedAtBirthYears(specs[0].years) : 0;
    const periods = signDashaExtBuildTree(chart, specs, birthMs, maxLevel, elapsed);
    const firstCycleYears = specs.filter((s) => s.cycle === 1).reduce((sum, s) => sum + s.years, 0);

    const tree: SignDashaExtTree = {
      system,
      dashaSystem: system,
      systemName: def.info.name,
      basis: 'RASHI',
      provisional: true,
      provisionalLabel: SIGN_DASHA_EXT_PROVISIONAL_LABEL,
      source: def.info.source,
      conventionNotes: [...def.notes],
      yearsRule: def.info.yearsRule,
      lagnaRashiIndex: lagna,
      startingSign: c.start,
      startingSignName: signDashaExtSignName(c.start),
      startingSignReason: c.startReason,
      direction: c.direction,
      directionReason: c.directionReason,
      sequence: c.sequence,
      totalCycleYears: firstCycleYears,
      cycles: Math.max(...specs.map((s) => s.cycle)),
      balanceAtBirthYears: specs[0].years - elapsed,
      elapsedAtBirthYears: elapsed,
      periods,
      mahadashas: periods,
    };
    if (c.sreeLagna) tree.sreeLagna = c.sreeLagna;
    const current = resolveCurrentPeriod(periods, options.targetDate);
    if (current) tree.currentPeriod = current;
    return tree;
  },
};
