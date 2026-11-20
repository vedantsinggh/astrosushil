/**
 * Personalised Horoscope evidence (`horo.*`, `avakahada.*`). Transit facts
 * always contain the word "transit" so they are never read as natal claims.
 */
import { AddEvidence, ordinal } from '../../evidence/evidence-registry';
import { addAvakahadaEvidence } from '../_annual-shared/avakahada';
import { pad2, PLANET_ASSOC, SLOW_PLANETS, TRANSIT_PLANETS } from '../_annual-shared/astro';
import { localDate } from '../_annual-shared/tables';
import { periodsBetween } from '../_annual-shared/transits';
import { AreaFactor, HORO_AREAS, HoroscopeYearData } from './calc/horoscope-year';
import { luckyFor } from './lucky';

const SRC = 'transit.TransitIngressSolver';

export function factorText(f: AreaFactor, tz: string): string {
  return `${f.planet} transits ${f.period.sign}, the ${ordinal(f.house)} from the ${f.from} (${localDate(f.period.startIso, tz)} to ${localDate(f.period.endIso, tz)})`;
}

export function addHoroscopeEvidence(add: AddEvidence, d: HoroscopeYearData, tz: string): void {
  addAvakahadaEvidence(add, d.avakahada);
  add('horo.period', 'horoscope', `This horoscope covers ${localDate(d.startIso, 'UTC')} to ${localDate(new Date(Date.parse(d.endIso) - 86400000).toISOString(), 'UTC')}`, d.windows.map((w) => w.label), 'report.horoscope.period');

  for (const w of d.windows) {
    add(`horo.window.${w.index}.dates`, 'horoscope-window', `Window ${w.index} of the year is ${w.label}`, w.label, 'report.horoscope.period');
    for (const planet of SLOW_PLANETS) {
      const ps = periodsBetween(d.transits[planet], w.startIso, w.endIso);
      add(`horo.window.${w.index}.${planet.toLowerCase()}`, 'transit-window',
        `During ${w.label}, ${planet} transits ${ps.map((p) => `${p.sign} (${p.startIso < w.startIso ? 'all along' : `from ${localDate(p.startIso, tz)}`}; the ${ordinal(p.houseFromMoon)} from the Moon and the ${ordinal(p.houseFromLagna)} from the Ascendant, classically ${p.gochara === 'favourable' ? 'supportive' : 'demanding'} from the Moon)`).join(', then ')}`,
        ps.map((p) => p.sign), SRC);
    }
  }

  for (const a of HORO_AREAS) {
    d.areaFactors[a.key].forEach((list, i) => {
      const w = d.windows[i];
      add(`horo.area.${a.key}.window.${w.index}`, 'transit-area',
        list.length
          ? `${a.label}, ${w.label}: slow-planet transits over the ${a.houses.map(ordinal).join(', ')} houses: ${list.map((f) => factorText(f, tz)).join('; ')}`
          : `${a.label}, ${w.label}: no slow-planet transit falls on the ${a.houses.map(ordinal).join(', ')} houses from the Moon or the Ascendant`,
        list.map((f) => f.planet), 'report.horoscope.areas');
    });
  }

  for (const planet of TRANSIT_PLANETS) {
    d.transits[planet].forEach((t, i) => {
      add(`horo.transit.${planet.toLowerCase()}.${pad2(i + 1)}`, 'transit-period',
        `${planet} transits ${t.sign} from ${localDate(t.startIso, tz)} to ${localDate(t.endIso, tz)}${t.retrograde ? ' (retrograde re-entry)' : ''}: the ${ordinal(t.houseFromMoon)} from the Moon and the ${ordinal(t.houseFromLagna)} house from the Ascendant (classically ${t.gochara === 'favourable' ? 'supportive' : 'demanding'} from the Moon)`,
        [t.sign, ordinal(t.houseFromMoon), ordinal(t.houseFromLagna)], SRC);
    });
  }

  const l = luckyFor(d.moonSignLord, d.lagnaLord);
  const src = 'report.horoscope.lucky';
  add('horo.lucky.planet', 'lucky', `The Moon sign's ruling planet is ${l.planet}; the Ascendant lord is ${l.secondary}`, l.planet, src);
  add('horo.lucky.number', 'lucky', `Supportive number (ruled by ${l.planet}) is ${l.number}`, l.number, src);
  add('horo.lucky.dates', 'lucky', `Supportive dates of the month: ${l.dates.join(', ')}`, l.dates.map(String), src);
  add('horo.lucky.weekday', 'lucky', `Supportive weekday is ${l.weekday}`, l.weekday, src);
  add('horo.lucky.colours', 'lucky', `Supportive colours: ${l.colours} (${l.planet}); also ${l.secondaryColours} (${l.secondary})`, l.colours.split(', '), src);
  add('horo.lucky.caution', 'lucky', l.enemies.length ? `Colours and dates that call for more patience come from ${l.planet}'s natural enemies (${l.enemies.join(', ')}): colours ${l.cautionColours || 'none distinct'}; dates ${l.cautionDates.join(', ')}` : `${l.planet} has no natural enemies among the seven planets`, l.enemies, src);
  add('horo.lucky.deity', 'lucky', `${l.planet} is traditionally honoured through ${PLANET_ASSOC[l.planet].deity} and the mantra "${PLANET_ASSOC[l.planet].mantra}"`, PLANET_ASSOC[l.planet].deity, src);
  add('horo.lucky.lagna-deity', 'lucky', `${l.secondary} is traditionally honoured through ${PLANET_ASSOC[l.secondary].deity} on ${PLANET_ASSOC[l.secondary].weekday}`, PLANET_ASSOC[l.secondary].deity, src);

  for (const n of d.numerology) {
    add(`horo.numerology.universal.${n.year}`, 'numerology', `Universal year number for ${n.year} is ${n.universal}`, n.universal, 'report.horoscope.numerology');
    add(`horo.numerology.personal.${n.year}`, 'numerology', `Personal year number for ${n.year} is ${n.personal}`, n.personal, 'report.horoscope.numerology');
  }
}
