/**
 * Numerology evidence (namespace `num.`) and the shared `extend` step.
 *
 * Name numerology is computed locally from the snapshot's subject name; only
 * the resulting numbers enter the registry (and so the prompts) — never the
 * name or its letters.
 */
import { AddEvidence, EvidenceRegistry, ordinal } from '../../evidence/evidence-registry';
import { ExtendContext } from '../../module';
import { ChartSnapshot } from '../../snapshot/chart-snapshot';
import {
  HARMONY_LABEL,
  LINE_LABEL,
  MONTHS,
  NUMBER_PLANET,
  numberHarmony,
  PLANET_AVATAR,
  PLANET_COLOUR,
  PLANET_DAY,
  planetRelation,
} from './associations';
import {
  computeNumerologyProfile,
  engineLahiriAyanamsa,
  KuaResult,
  LO_SHU_CELL,
  NAME_PLANE_ORDER,
  NumerologyProfile,
  numbersReducingTo,
  tropicalSign,
} from './numerology';

export interface NumerologyExt {
  profile: NumerologyProfile;
  sunSign: string;
}

export function computeNumerologyExt(snapshot: ChartSnapshot, opts: { useName: boolean }): NumerologyExt {
  const profile = computeNumerologyProfile({
    dateOfBirth: snapshot.subject.dateOfBirth,
    name: opts.useName ? snapshot.subject.name : undefined,
    gender: snapshot.subject.gender,
    asOf: new Date(snapshot.asOfIso),
  });
  const sun = snapshot.natal.planets.find((p) => String(p.name).toUpperCase() === 'SUN')!;
  const jd = snapshot.natal.calculation.normalizedTime.julianDayUT;
  const sunSign = tropicalSign(sun.absoluteDegree + engineLahiriAyanamsa(jd));
  return { profile, sunSign };
}

/** `extend` for numerology reports. */
export function numerologyExtend(opts: { useName: boolean }) {
  return async (ctx: ExtendContext): Promise<Record<string, unknown>> => ({ numerology: computeNumerologyExt(ctx.snapshot, opts) });
}

export function numerologyExtOf(ext: Record<string, unknown>): NumerologyExt {
  const n = ext.numerology as NumerologyExt | undefined;
  if (!n) throw new Error('BLOCK_DATA_MISSING: numerology');
  return n;
}

const SRC = 'platform.numerology';
const list = (xs: Array<string | number>) => xs.join(', ');

function kuaLabel(k: KuaResult): string {
  return `Kua number (${k.gender} formula, solar year ${k.solarYear}) is ${k.value}${k.fiveSubstituted ? ' (5 is replaced by ' + k.value + ')' : ''}`;
}

/** Adds every `num.*` evidence item. Core `numerology.mulank` / `numerology.bhagyank` are reused, not duplicated. */
export function addNumerologyEvidence(add: AddEvidence, registry: EvidenceRegistry, n: NumerologyExt): void {
  const p = n.profile;
  if (registry.get('numerology.mulank')?.value !== p.mulank || registry.get('numerology.bhagyank')?.value !== p.bhagyank) {
    throw new Error('NUMEROLOGY_INCONSISTENT: canonical module disagrees with core numerology evidence');
  }
  const mp = NUMBER_PLANET[p.mulank];
  const bp = NUMBER_PLANET[p.bhagyank];
  add('num.mulank.planet', 'numerology', `The ruling planet of Mulank ${p.mulank} is ${mp}`, mp, SRC);
  add('num.bhagyank.planet', 'numerology', `The ruling planet of Bhagyank ${p.bhagyank} is ${bp}`, bp, SRC);
  add('num.birth-day', 'numerology', `Born on day ${p.birthDay.day} of the month (digit sum ${p.birthDay.compound}, Mulank ${p.mulank})`, p.birthDay.day, SRC);
  const h = numberHarmony(p.mulank, p.bhagyank);
  add('num.combination', 'numerology',
    `Mulank ${p.mulank} (${mp}) with Bhagyank ${p.bhagyank} (${bp}): ${h === 'same' ? 'the same number' : `${mp} regards ${bp} as ${planetRelation(mp, bp)}, ${bp} regards ${mp} as ${planetRelation(bp, mp)}; combination is ${HARMONY_LABEL[h].en.toLowerCase()}`}`,
    HARMONY_LABEL[h].en.toLowerCase(), SRC);
  add('num.sun-sign', 'numerology', `Western (tropical) Sun sign is ${n.sunSign}`, n.sunSign, SRC);
  add('num.weekday', 'numerology', `Supportive weekday of ${mp} (Mulank ruler) is ${PLANET_DAY[mp].en}`, PLANET_DAY[mp].en, SRC);
  add('num.colours', 'numerology', `Traditional colours of ${mp} (Mulank ruler): ${PLANET_COLOUR[mp].en}`, PLANET_COLOUR[mp].en, SRC);
  add('num.avatar', 'numerology', `BPHS associates ${mp} with the avatar ${PLANET_AVATAR[mp].en}`, PLANET_AVATAR[mp].en, SRC);

  const friendly: string[] = [];
  const demanding: string[] = [];
  for (let k = 1; k <= 9; k++) {
    const hk = numberHarmony(p.mulank, k);
    if (hk === 'harmonious') friendly.push(String(k));
    if (hk === 'demanding') demanding.push(String(k));
    add(`num.harmony.${k}`, 'numerology',
      `Mulank ${p.mulank} with number ${k} (${NUMBER_PLANET[k]}): ${HARMONY_LABEL[hk].en.toLowerCase()}`, HARMONY_LABEL[hk].en.toLowerCase(), SRC);
  }
  add('num.friendly-numbers', 'numerology', friendly.length ? `Numbers in harmony with Mulank ${p.mulank}: ${list(friendly)}` : `No number is in full harmony with Mulank ${p.mulank}`, friendly, SRC);
  add('num.demanding-numbers', 'numerology', demanding.length ? `Numbers that need patience with Mulank ${p.mulank}: ${list(demanding)}` : `No number is in mutual opposition with Mulank ${p.mulank}`, demanding, SRC);
  add('num.lucky-dates', 'numerology', `Dates of the month that reduce to ${p.mulank}: ${list(numbersReducingTo(p.mulank, 1, 31))}`, numbersReducingTo(p.mulank, 1, 31).map(String), SRC);

  // Lo Shu
  const g = p.loShu;
  for (let k = 1; k <= 9; k++) {
    add(`num.loshu.count.${k}`, 'numerology', `Number ${k} appears ${g.counts[k]} time${g.counts[k] === 1 ? '' : 's'} in the Lo Shu grid`, g.counts[k], SRC);
  }
  add('num.loshu.missing', 'numerology', g.missing.length ? `Missing numbers in the Lo Shu grid: ${list(g.missing)}` : 'No number is missing from the Lo Shu grid', g.missing.map(String), SRC);
  add('num.loshu.repeated', 'numerology', g.repeated.length ? `Repeated numbers in the Lo Shu grid: ${list(g.repeated.map((k) => `${k} (${g.counts[k]} times)`))}` : 'No number repeats in the Lo Shu grid', g.repeated.map(String), SRC);
  const lines = g.completeLines.map((id) => LINE_LABEL[id].en);
  add('num.loshu.complete-lines', 'numerology', lines.length ? `Complete lines in the Lo Shu grid: ${list(lines)}` : 'No line of the Lo Shu grid is complete', lines, SRC);
  const empty = g.emptyLines.map((id) => LINE_LABEL[id].en);
  add('num.loshu.empty-lines', 'numerology', empty.length ? `Fully empty lines in the Lo Shu grid: ${list(empty)}` : 'No line of the Lo Shu grid is fully empty', empty, SRC);
  const elementCounts = new Map<string, number>();
  for (let k = 1; k <= 9; k++) elementCounts.set(LO_SHU_CELL[k].element, (elementCounts.get(LO_SHU_CELL[k].element) ?? 0) + g.counts[k]);
  const absentEl = [...elementCounts].filter(([, c]) => c === 0).map(([e]) => e);
  add('num.loshu.elements', 'numerology', `Elements in the grid: ${[...elementCounts].map(([e, c]) => `${e} ${c}`).join(', ')}`, [...elementCounts].map(([e, c]) => `${e} ${c}`), SRC);
  add('num.loshu.elements-absent', 'numerology', absentEl.length ? `Elements absent from the grid: ${list(absentEl)}` : 'No element is absent from the grid', absentEl, SRC);

  // Kua
  if (p.kua) {
    const k = p.kua;
    add('num.kua', 'numerology', kuaLabel(k), k.value, SRC);
    add('num.kua.element', 'numerology', `Kua ${k.value} element is ${k.element}`, k.element, SRC);
    add('num.kua.group', 'numerology', `Kua ${k.value} belongs to the ${k.group} group`, k.group, SRC);
    for (const [key, dir] of Object.entries(k.favourable)) {
      add(`num.kua.direction.${key}`, 'numerology', `Kua ${k.value} ${key} direction is ${dir}`, dir, SRC);
    }
  } else if (p.kuaBoth) {
    add('num.kua.male-formula', 'numerology', kuaLabel(p.kuaBoth.male), p.kuaBoth.male.value, SRC);
    add('num.kua.female-formula', 'numerology', kuaLabel(p.kuaBoth.female), p.kuaBoth.female.value, SRC);
  }

  // Name
  if (p.name) {
    const nm = p.name;
    add('num.name.number', 'numerology', `Chaldean name number is ${nm.number.value} (compound ${nm.number.compound})`, nm.number.value, SRC);
    add('num.name.planet', 'numerology', `Name number ${nm.number.value} is ruled by ${NUMBER_PLANET[nm.number.value] ?? 'none'}`, NUMBER_PLANET[nm.number.value] ?? 'none', SRC);
    add('num.name.first-letter', 'numerology', `The name begins with a letter of Chaldean value ${nm.firstLetterValue} (${NUMBER_PLANET[nm.firstLetterValue]})`, nm.firstLetterValue, SRC);
    add('num.soul-urge', 'numerology', `Soul urge number (vowels) is ${nm.soulUrge.value}`, nm.soulUrge.value, SRC);
    add('num.personality', 'numerology', `Personality number (consonants) is ${nm.personality.value}`, nm.personality.value, SRC);
    const hn = numberHarmony(p.mulank, nm.number.value);
    add('num.name.harmony', 'numerology', `Name number ${nm.number.value} with Mulank ${p.mulank}: ${HARMONY_LABEL[hn].en.toLowerCase()}`, HARMONY_LABEL[hn].en.toLowerCase(), SRC);
    for (const plane of NAME_PLANE_ORDER) {
      add(`num.name.plane.${plane}`, 'numerology', `${plane[0].toUpperCase() + plane.slice(1)} plane of expression has ${nm.planes.counts[plane]} letter${nm.planes.counts[plane] === 1 ? '' : 's'}`, nm.planes.counts[plane], SRC);
    }
    add('num.maturity', 'numerology', `Maturity number (Bhagyank ${p.bhagyank} + name number ${nm.number.value}) is ${p.maturity}`, p.maturity!, SRC);
    add('num.bridge.bhagyank-name', 'numerology', `Bridge number between Bhagyank and name number is ${p.bridges.bhagyankName}`, p.bridges.bhagyankName!, SRC);
  }
  add('num.bridge.mulank-bhagyank', 'numerology', `Bridge number between Mulank and Bhagyank is ${p.bridges.mulankBhagyank}`, p.bridges.mulankBhagyank, SRC);

  // Cycles
  const asOfYear = p.months[0].year;
  add('num.py.current', 'numerology', `Personal year for ${asOfYear} is ${p.personalYearNow}`, p.personalYearNow, SRC);
  add('num.py.next', 'numerology', `Personal year for ${asOfYear + 1} is ${p.personalYearNext}`, p.personalYearNext, SRC);
  for (const m of p.months) {
    add(`num.pm.${String(m.index).padStart(2, '0')}`, 'numerology',
      `Forecast month ${m.index} is ${MONTHS[m.month - 1].en} ${m.year}: personal month ${m.personalMonth} within personal year ${m.personalYear}`,
      m.personalMonth, SRC);
  }
  add('num.age', 'numerology', `Age on the report date is ${p.age}`, p.age, SRC);
  for (const c of p.cycles) {
    const span = c.toAge === undefined ? `from age ${c.fromAge} onwards` : `ages ${c.fromAge} to ${c.toAge}`;
    add(`num.pinnacle.${c.index}`, 'numerology', `${ordinal(c.index)} pinnacle (${span}) is ${c.pinnacle}`, c.pinnacle, SRC);
    add(`num.challenge.${c.index}`, 'numerology', `${ordinal(c.index)} challenge (${span}) is ${c.challenge}`, c.challenge, SRC);
  }
  const cur = p.currentCycle;
  add('num.cycle.current', 'numerology', `The current life cycle is the ${ordinal(cur.index)} (pinnacle ${cur.pinnacle}, challenge ${cur.challenge})`, ordinal(cur.index), SRC);
}

/** Evidence contributor for module.evidence. */
export function numerologyEvidence(add: AddEvidence, ctx: { ext: Record<string, unknown>; registry: EvidenceRegistry }): void {
  addNumerologyEvidence(add, ctx.registry, numerologyExtOf(ctx.ext));
}
