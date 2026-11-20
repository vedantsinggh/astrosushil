import { AstroChart } from '../chart/astro-chart.types';
import { PlanetSymbol } from '../planets/planet.types';
import { CompoundRelationship } from '../planets/planetary-intelligence.types';
import { getCompoundRelationship, getNaturalRelationship, getTemporalRelationship } from '../planets/planetary-relationships';
import { getRashiRuler } from '../planets/planetary-dignity';
import { VargaCalculator } from '../varga/varga-calculator';
import { normalizeDegree } from '../coordinates/angular-math';
import { TAJIKA_DEEP_EXALTATION, TAJIKA_GRAHAS, tajikaHaddaOf } from './tajika-tables';
import {
  TajikaGraha,
  TajikaNeutralScoring,
  TajikaPanchaVargiyaPlanet,
  TajikaPanchaVargiyaResult,
  TajikaVargaComponent,
  TajikaVargaRelation,
} from './tajika-extended.types';

export const TAJIKA_PANCHA_VARGIYA_SOURCE =
  'Tajika Neelakanthi (Samjna Tantra, bala section) as given in P.V.R. Narasimha Rao, "Vedic Astrology: An Integrated ' +
  'Approach" (2000), ch. 28 §28.4.1-28.4.6 (Kshetra 30/15/7.5, Uchcha 0-20, Hadda 15/7.5/3.75, Drekkana 10/5/2.5, ' +
  'Navamsha 5/2.5/1.25; sum / 4; Table 72 Hadda lords); same scheme in B.V. Raman, "Varshaphal or the Hindu ' +
  'Progressed Horoscope", ch. 3 art. 37-46. Provisional – pending client review.';

/** Maximum units of each component (own = full, friend = 1/2, enemy = 1/4). §28.4.1-28.4.5. */
export const TAJIKA_PANCHA_VARGIYA_MAXIMA = { kshetra: 30, uchcha: 20, hadda: 15, drekkana: 10, navamsha: 5 } as const;

const vargaCalc = new VargaCalculator();

function relationFromCompound(c: CompoundRelationship, neutral: TajikaNeutralScoring): Exclude<TajikaVargaRelation, 'OWN'> {
  if (c === 'GREAT_FRIEND' || c === 'FRIEND') return 'FRIEND';
  if (c === 'NEUTRAL') return neutral === 'AS_FRIEND' ? 'FRIEND' : 'ENEMY';
  return 'ENEMY';
}

function scoreFor(relation: TajikaVargaRelation, max: number): number {
  return relation === 'OWN' ? max : relation === 'FRIEND' ? max / 2 : max / 4;
}

/** §28.4.6 classification of total / 4. */
export function tajikaPanchaVargiyaCategory(v: number): TajikaPanchaVargiyaPlanet['category'] {
  if (v < 5) return 'WEAK';
  if (v < 10) return 'ORDINARY';
  if (v < 15) return 'STRONG';
  if (v <= 20) return 'VERY_STRONG';
  return 'EXTRAORDINARY';
}

/** Uchcha bala: 20 x (arc from deep debilitation) / 180. §28.4.2. */
export function tajikaUchchaBala(planet: TajikaGraha, longitude: number): { deepDebilitationLongitude: number; arcFromDebilitation: number; score: number } {
  const deb = normalizeDegree(TAJIKA_DEEP_EXALTATION[planet] + 180);
  let arc = Math.abs(normalizeDegree(longitude) - deb);
  if (arc > 180) arc = 360 - arc;
  return { deepDebilitationLongitude: deb, arcFromDebilitation: arc, score: (arc / 180) * 20 };
}

/**
 * Pancha-vargiya Bala of the seven planets of any chart (natal, annual, prashna).
 * Positions come from the chart (engine ephemeris + configured ayanamsa); D3 / D9 signs from the engine's VargaCalculator.
 */
export function calculateTajikaPanchaVargiyaBala(
  chart: AstroChart,
  options: { neutralScoring?: TajikaNeutralScoring } = {},
): TajikaPanchaVargiyaResult {
  const neutralScoring = options.neutralScoring ?? 'AS_ENEMY';
  const signOf = (p: PlanetSymbol): number => {
    const pos = chart.planets[p];
    if (!pos) throw new Error(`Chart has no position for ${p}`);
    return pos.rashiIndex;
  };

  const component = (planet: TajikaGraha, lord: PlanetSymbol, rashiIndex: number, max: number): TajikaVargaComponent => {
    if (lord === planet) return { lord, rashiIndex, relation: 'OWN', maximum: max, score: max };
    const compound = getCompoundRelationship(getNaturalRelationship(planet, lord), getTemporalRelationship(signOf(planet), signOf(lord)));
    const relation = relationFromCompound(compound, neutralScoring);
    return { lord, rashiIndex, compoundRelationship: compound, relation, maximum: max, score: scoreFor(relation, max) };
  };

  const planets: TajikaPanchaVargiyaPlanet[] = TAJIKA_GRAHAS.map((planet) => {
    const pos = chart.planets[planet];
    if (!pos) throw new Error(`Chart has no position for ${planet}`);
    const lon = pos.longitude;
    const kshetra = component(planet, getRashiRuler(pos.rashiIndex), pos.rashiIndex, TAJIKA_PANCHA_VARGIYA_MAXIMA.kshetra);
    const u = tajikaUchchaBala(planet, lon);
    const hs = tajikaHaddaOf(lon);
    const hadda = { ...component(planet, hs.lord, hs.rashiIndex, TAJIKA_PANCHA_VARGIYA_MAXIMA.hadda), haddaStartDegree: hs.start, haddaEndDegree: hs.end };
    const d3 = vargaCalc.calculateLongitudeVarga(lon, 'D3');
    const drekkana = component(planet, getRashiRuler(d3), d3, TAJIKA_PANCHA_VARGIYA_MAXIMA.drekkana);
    const d9 = vargaCalc.calculateLongitudeVarga(lon, 'D9');
    const navamsha = component(planet, getRashiRuler(d9), d9, TAJIKA_PANCHA_VARGIYA_MAXIMA.navamsha);
    const total = kshetra.score + u.score + hadda.score + drekkana.score + navamsha.score;
    const vimshopaka = total / 4;
    return {
      planet,
      longitude: lon,
      kshetra,
      uchcha: { ...u, maximum: 20 as const },
      hadda,
      drekkana,
      navamsha,
      total,
      vimshopaka,
      category: tajikaPanchaVargiyaCategory(vimshopaka),
    };
  });

  return {
    planets,
    neutralScoring,
    provisional: true,
    source: TAJIKA_PANCHA_VARGIYA_SOURCE,
    conventionNotes: [
      'Friend / enemy of a varga lord is the compound (Panchadha) relationship from the rasi chart (natural BPHS table + temporal from D1 signs), as the source defines "friendly / inimical house" (P.V.R. Narasimha Rao ch. 3 §3.4.3).',
      `The source gives only own / friend / enemy values; a compound-neutral (sama) lord is scored ${neutralScoring === 'AS_ENEMY' ? 'with the enemy value' : 'with the friend value'} (option neutralScoring).`,
      'Drekkana = Parashari D3 (sign, 5th, 9th) and Navamsha = D9, both from the engine VargaCalculator.',
      'Uchcha bala is linear in the shortest arc from the deep debilitation point (exaltation + 180°).',
      'Only the seven grahas are scored (the text gives no bala for the nodes).',
    ],
  };
}
