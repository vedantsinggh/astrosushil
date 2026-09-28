import { PlanetSymbol } from '../planets/planet.types';
import { YogaChartContext } from './yoga.types';

export class YogaPredicates {
  public static isPlanetInHouse(planet: PlanetSymbol, house: number, ctx: YogaChartContext): boolean {
    return ctx.planets[planet]?.house === house;
  }

  public static isPlanetInHouses(planet: PlanetSymbol, houses: number[], ctx: YogaChartContext): boolean {
    const pHouse = ctx.planets[planet]?.house;
    return pHouse !== undefined && houses.includes(pHouse);
  }

  public static isPlanetInKendra(planet: PlanetSymbol, ctx: YogaChartContext): boolean {
    const pHouse = ctx.planets[planet]?.house;
    return pHouse === 1 || pHouse === 4 || pHouse === 7 || pHouse === 10;
  }

  public static isPlanetInTrikona(planet: PlanetSymbol, ctx: YogaChartContext): boolean {
    const pHouse = ctx.planets[planet]?.house;
    return pHouse === 1 || pHouse === 5 || pHouse === 9;
  }

  public static isPlanetInDusthana(planet: PlanetSymbol, ctx: YogaChartContext): boolean {
    const pHouse = ctx.planets[planet]?.house;
    return pHouse === 6 || pHouse === 8 || pHouse === 12;
  }

  public static isLordOfHouse(planet: PlanetSymbol, house: number, ctx: YogaChartContext): boolean {
    return ctx.houseLords[house] === planet;
  }

  public static getHousesLordedBy(planet: PlanetSymbol, ctx: YogaChartContext): number[] {
    return ctx.lordHouses[planet] || [];
  }

  public static isPlanetExalted(planet: PlanetSymbol, ctx: YogaChartContext): boolean {
    return ctx.planets[planet]?.dignity === 'EXALTED';
  }

  public static isPlanetDebilitated(planet: PlanetSymbol, ctx: YogaChartContext): boolean {
    return ctx.planets[planet]?.dignity === 'DEBILITATED';
  }

  public static isPlanetOwnSign(planet: PlanetSymbol, ctx: YogaChartContext): boolean {
    const dignity = ctx.planets[planet]?.dignity;
    return dignity === 'OWN_SIGN' || dignity === 'MOOLATRIKONA';
  }

  public static isPlanetMoolatrikona(planet: PlanetSymbol, ctx: YogaChartContext): boolean {
    return ctx.planets[planet]?.dignity === 'MOOLATRIKONA';
  }

  public static isPlanetInOwnOrExalted(planet: PlanetSymbol, ctx: YogaChartContext): boolean {
    const dignity = ctx.planets[planet]?.dignity;
    return dignity === 'EXALTED' || dignity === 'OWN_SIGN' || dignity === 'MOOLATRIKONA';
  }

  public static isPlanetCombust(planet: PlanetSymbol, ctx: YogaChartContext): boolean {
    return ctx.planets[planet]?.isCombust === true;
  }

  public static isPlanetRetrograde(planet: PlanetSymbol, ctx: YogaChartContext): boolean {
    return ctx.planets[planet]?.isRetrograde === true;
  }

  public static areConjunct(planetA: PlanetSymbol, planetB: PlanetSymbol, ctx: YogaChartContext): boolean {
    return ctx.planets[planetA]?.rashiIndex === ctx.planets[planetB]?.rashiIndex;
  }

  public static getHouseFromMoon(planet: PlanetSymbol, ctx: YogaChartContext): number {
    const moonRashi = ctx.moonPlanet.rashiIndex;
    const pRashi = ctx.planets[planet]?.rashiIndex || 1;
    return ((pRashi - moonRashi + 12) % 12) + 1;
  }

  public static getHouseFromSun(planet: PlanetSymbol, ctx: YogaChartContext): number {
    const sunRashi = ctx.sunPlanet.rashiIndex;
    const pRashi = ctx.planets[planet]?.rashiIndex || 1;
    return ((pRashi - sunRashi + 12) % 12) + 1;
  }

  public static getHouseFromPlanet(planet: PlanetSymbol, referencePlanet: PlanetSymbol, ctx: YogaChartContext): number {
    const refRashi = ctx.planets[referencePlanet]?.rashiIndex || 1;
    const pRashi = ctx.planets[planet]?.rashiIndex || 1;
    return ((pRashi - refRashi + 12) % 12) + 1;
  }

  public static isKendraFromMoon(planet: PlanetSymbol, ctx: YogaChartContext): boolean {
    const hFromMoon = this.getHouseFromMoon(planet, ctx);
    return hFromMoon === 1 || hFromMoon === 4 || hFromMoon === 7 || hFromMoon === 10;
  }

  public static isKendraFromLagna(planet: PlanetSymbol, ctx: YogaChartContext): boolean {
    return this.isPlanetInKendra(planet, ctx);
  }

  public static isKendraFromRashi(rashiIndex: number, referenceRashi: number): boolean {
    const dist = ((rashiIndex - referenceRashi + 12) % 12) + 1;
    return dist === 1 || dist === 4 || dist === 7 || dist === 10;
  }

  public static isNaturalBenefic(planet: PlanetSymbol): boolean {
    return (
      planet === PlanetSymbol.JUPITER ||
      planet === PlanetSymbol.VENUS ||
      planet === PlanetSymbol.MERCURY ||
      planet === PlanetSymbol.MOON
    );
  }

  public static isNaturalMalefic(planet: PlanetSymbol): boolean {
    return (
      planet === PlanetSymbol.SATURN ||
      planet === PlanetSymbol.MARS ||
      planet === PlanetSymbol.SUN ||
      planet === PlanetSymbol.RAHU ||
      planet === PlanetSymbol.KETU
    );
  }

  public static areInMutualAspect(planetA: PlanetSymbol, planetB: PlanetSymbol, ctx: YogaChartContext): boolean {
    return ctx.mutualAspects.some(
      (m) =>
        (m.planetA === planetA && m.planetB === planetB) ||
        (m.planetA === planetB && m.planetB === planetA)
    );
  }
}

