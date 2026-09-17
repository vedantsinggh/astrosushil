import {
  ASHTAKAVARGA_PLANETS,
  AshtakavargaPlanet,
  BhinnashtakavargaTable,
  SAV_EXPECTED_GRAND_TOTAL,
  SarvashtakavargaTable,
} from './ashtakavarga.types';

/**
 * Derives Sarvashtakavarga (SAV) deterministically by aggregating
 * the 7 individual planetary Bhinnashtakavarga (BAV) tables.
 */
export function calculateSarvashtakavarga(
  bavTables: Record<AshtakavargaPlanet, BhinnashtakavargaTable>
): SarvashtakavargaTable {
  const signList: number[] = new Array(12).fill(0);
  const byPlanet: Record<AshtakavargaPlanet, number[]> = {} as any;

  for (const planet of ASHTAKAVARGA_PLANETS) {
    const table = bavTables[planet];
    byPlanet[planet] = [...table.signList];

    for (let i = 0; i < 12; i++) {
      signList[i] += table.signList[i];
    }
  }

  const signs: Record<number, number> = {};
  for (let i = 0; i < 12; i++) {
    signs[i + 1] = signList[i];
  }

  const grandTotal = signList.reduce((acc, val) => acc + val, 0);

  // Invariant assertion: Grand total across all 12 signs in SAV must equal 337
  if (grandTotal !== SAV_EXPECTED_GRAND_TOTAL) {
    throw new Error(
      `Sarvashtakavarga invariant violation: Grand total is ${grandTotal}, expected ${SAV_EXPECTED_GRAND_TOTAL}`
    );
  }

  return {
    signs,
    signList,
    byPlanet,
    grandTotal,
  };
}
