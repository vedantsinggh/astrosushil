/**
 * Classical "lucky associations" for the annual horoscope (decision HOR-004,
 * following DECISIONS.md D-003): everything is derived from the ruling planet
 * of the natal Moon sign (the basis of a Rashi horoscope) and, secondarily,
 * the Ascendant lord, via fixed traditional correspondences and the natural
 * (naisargika) friendships and enmities of BPHS ch. 3.
 */
import { getNaturalRelationship } from '@astro/astrology-engine';
import { PlanetName } from '../../evidence/evidence-registry';
import { datesForNumber, NUMBER_PLANET, PLANET_ASSOC, SYMBOL } from '../_annual-shared/astro';

export interface LuckyAssociations {
  planet: PlanetName;
  secondary: PlanetName;
  number: number;
  dates: number[];
  weekday: string;
  colours: string;
  secondaryColours: string;
  gem: string;
  enemies: PlanetName[];
  cautionColours: string;
  cautionNumbers: number[];
  cautionDates: number[];
}

const relation = (a: PlanetName, b: PlanetName) => String(getNaturalRelationship(SYMBOL[a], SYMBOL[b])).toUpperCase();

export function luckyFor(moonSignLord: PlanetName, lagnaLord: PlanetName): LuckyAssociations {
  const a = PLANET_ASSOC[moonSignLord];
  const enemies = (['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as PlanetName[])
    .filter((p) => p !== moonSignLord && relation(moonSignLord, p).includes('ENEMY'));
  const cautionNumbers = NUMBER_PLANET.map((p, i) => ({ p, n: i + 1 })).filter((x) => enemies.includes(x.p)).map((x) => x.n);
  return {
    planet: moonSignLord,
    secondary: lagnaLord,
    number: a.number,
    dates: datesForNumber(a.number),
    weekday: a.weekday,
    colours: a.colours,
    secondaryColours: PLANET_ASSOC[lagnaLord].colours,
    gem: a.gem,
    enemies,
    cautionColours: [...new Set(enemies.flatMap((p) => PLANET_ASSOC[p].colours.split(', ')))]
      .filter((c) => !`${a.colours}, ${PLANET_ASSOC[lagnaLord].colours}`.split(', ').includes(c)).join(', '),
    cautionNumbers,
    cautionDates: cautionNumbers.flatMap(datesForNumber).sort((x, y) => x - y),
  };
}
