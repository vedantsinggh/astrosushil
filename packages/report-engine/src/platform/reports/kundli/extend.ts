/**
 * Kundli `extend` hook: every extra deterministic calculation the report
 * needs beyond the core snapshot, built only on @astro/astrology-engine.
 */
import {
  AvakhadaChakraCalculator,
  AvakhadaChakraReport,
  DashaCalculator,
  getRashiRuler,
  GhatChakraCalculator,
  GhatChakraReport,
  ManglikStatus,
  MatchmakingCalculator,
  PanchangCalculator,
  PanchangOutput,
  PlanetSymbol,
  VimshottariDashaTree,
} from '@astro/astrology-engine';
import { ExtendContext } from '../../module';
import { BlockContext } from '../../render/blocks';
import { planetName, PlanetName, SIGNS } from '../../evidence/evidence-registry';
import { computeSignPeriods, SignPeriod } from '../../snapshot/transit-periods';
import { conjunctionGroups, ConjunctionGroup, houseAspects, kaalSarpPattern, KaalSarpPattern } from './calc/patterns';
import { computeSadeSatiCycles, SadeSatiCycle, sadeSatiStatusAt, SadeSatiPhaseName } from './calc/sade-sati';
import { bhayatBhabhog, computeVedicDay, GhatiPala, rituForMasa, samvatYears, VedicDay } from './calc/vedic-day';

export const SADE_SATI_HORIZON_YEARS = 100;

export interface KarakamshaFacts {
  atmakaraka: PlanetName;
  sign: string;
  signIndex: number;
  twelfthSign: string;
  twelfthLord: PlanetName;
  /** Planets in the 12th sign from the Karakamsha in the D9 chart. */
  twelfthOccupantsD9: PlanetName[];
}

export interface KundliExt {
  vedicDay: VedicDay;
  panchangBirth: PanchangOutput;
  panchangSunrise: PanchangOutput;
  bhayat?: { bhayat: GhatiPala; bhabhog: GhatiPala };
  samvat: { vikram: number; shaka: number };
  ritu: string;
  avakhada: AvakhadaChakraReport;
  ghat: GhatChakraReport;
  /** Vimshottari to pratyantardasha (level 3), whole life from birth. */
  dasha: VimshottariDashaTree;
  saturnLife: SignPeriod[];
  sadeSati: SadeSatiCycle[];
  sadeSatiNow: { activeIndex?: number; phase: SadeSatiPhaseName | null; nextIndex?: number };
  manglik: ManglikStatus;
  kaalSarp: KaalSarpPattern;
  conjunctions: ConjunctionGroup[];
  houseAspects: Record<number, PlanetName[]>;
  karakamsha?: KarakamshaFacts;
}

export function kundliExt(ctx: Pick<BlockContext, 'ext'>): KundliExt {
  const k = ctx.ext.kundli as KundliExt | undefined;
  if (!k) throw new Error('BLOCK_DATA_MISSING: kundli extension');
  return k;
}

function karakamsha(ctx: ExtendContext): KarakamshaFacts | undefined {
  const { natal, vargas } = ctx.snapshot;
  const ak = natal.planets.find((p) => String(p.charaKaraka ?? '').toUpperCase() === 'AK');
  const d9 = vargas.D9;
  if (!ak || !d9) return undefined;
  const placements = Object.values(d9.placements).filter((p) => p.planet !== 'Ascendant');
  const akD9 = placements.find((p) => String(p.planet) === String(ak.name));
  if (!akD9) return undefined;
  const twelfth = ((akD9.rashiIndex + 10) % 12) + 1;
  return {
    atmakaraka: planetName(ak.name),
    sign: SIGNS[akD9.rashiIndex - 1],
    signIndex: akD9.rashiIndex,
    twelfthSign: SIGNS[twelfth - 1],
    twelfthLord: planetName(getRashiRuler(twelfth)),
    twelfthOccupantsD9: placements.filter((p) => p.rashiIndex === twelfth).map((p) => planetName(String(p.planet))),
  };
}

export async function extendKundli(ctx: ExtendContext): Promise<Record<string, unknown>> {
  const { snapshot } = ctx;
  const { raw, natal, subject } = snapshot;
  const nt = raw.metadata.normalizedTime;
  const birthIso = nt.utcIsoString;
  const pc = new PanchangCalculator();

  const panchangBirth = pc.calculatePanchangForDate(new Date(birthIso), { withBoundaries: true });
  const vedicDay = computeVedicDay({
    birthIso, latitude: subject.latitude, longitude: subject.longitude, timezone: subject.timezone,
    timezoneOffsetMinutes: nt.timezoneOffsetMinutes, enginePanchang: panchangBirth, panchangCalculator: pc,
  });
  const panchangSunrise = pc.calculatePanchangForDate(new Date(vedicDay.sunriseIso), { withBoundaries: true });
  const masa = panchangBirth.hinduCalendar?.amantaMasa ?? '';
  const moon = natal.planets.find((p) => String(p.name) === 'MOON')!;

  const dasha = new DashaCalculator().calculateForChart(raw, { maxLevel: 3, targetDate: new Date(snapshot.asOfIso) });
  const saturnLife = await computeSignPeriods(PlanetSymbol.SATURN, new Date(birthIso), SADE_SATI_HORIZON_YEARS);
  const sadeSati = computeSadeSatiCycles(saturnLife, moon.rashiIndex);
  const now = sadeSatiStatusAt(sadeSati, saturnLife, moon.rashiIndex, snapshot.asOfIso);

  const ext: KundliExt = {
    vedicDay,
    panchangBirth,
    panchangSunrise,
    bhayat: bhayatBhabhog(birthIso, panchangBirth.nakshatra.startIso, panchangBirth.nakshatra.endIso),
    samvat: samvatYears(Number(subject.dateOfBirth.slice(0, 4)), Number(subject.dateOfBirth.slice(5, 7)), masa),
    ritu: rituForMasa(masa),
    avakhada: AvakhadaChakraCalculator.calculateAvakhada(moon.absoluteDegree, natal.ascendant.rashiIndex),
    ghat: GhatChakraCalculator.calculateGhatChakra(moon.rashiIndex),
    dasha,
    saturnLife,
    sadeSati,
    sadeSatiNow: { activeIndex: now.active?.index, phase: now.phase, nextIndex: now.next?.index },
    manglik: new MatchmakingCalculator().evaluateManglikDosha(raw),
    kaalSarp: kaalSarpPattern(natal),
    conjunctions: conjunctionGroups(natal),
    houseAspects: houseAspects(natal),
    karakamsha: karakamsha(ctx),
  };
  return { kundli: ext };
}
