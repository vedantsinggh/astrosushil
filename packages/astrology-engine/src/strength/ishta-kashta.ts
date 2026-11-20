import { PlanetSymbol } from '../planets/planet.types';
import { ShadbalaReport, SHADBALA_PLANETS } from './strength.types';

/**
 * Ishta Phala and Kashta Phala (BPHS, Ishta-Kashta chapter; also B.V. Raman,
 * "Graha and Bhava Balas"):
 *
 *   Ishta  = sqrt(Uchcha Bala x Cheshta Bala)
 *   Kashta = sqrt((60 - Uchcha Bala) x (60 - Cheshta Bala))
 *
 * Both inputs are in shashtiamsas (virupas) on a 0-60 scale, so each result is 0-60.
 * Inputs are taken verbatim from the engine's existing Shadbala report; this module adds no
 * new strength convention. (Note: the engine's Cheshta Bala uses its own documented
 * convention; Ishta/Kashta inherit it.)
 */

export interface IshtaKashtaPhala {
  planet: PlanetSymbol;
  uchchaBala: number;
  cheshtaBala: number;
  ishtaPhala: number;
  kashtaPhala: number;
  /** Ishta - Kashta; positive means the planet leans towards auspicious results. */
  net: number;
}

const clamp60 = (x: number): number => Math.min(60, Math.max(0, x));

export function calculateIshtaKashtaFromBalas(uchchaBala: number, cheshtaBala: number): { ishta: number; kashta: number } {
  const u = clamp60(uchchaBala);
  const c = clamp60(cheshtaBala);
  return { ishta: Math.sqrt(u * c), kashta: Math.sqrt((60 - u) * (60 - c)) };
}

export function calculateIshtaKashtaPhala(shadbala: ShadbalaReport): IshtaKashtaPhala[] {
  const out: IshtaKashtaPhala[] = [];
  for (const planet of SHADBALA_PLANETS) {
    const s = shadbala.planets[planet];
    if (!s) continue;
    const { ishta, kashta } = calculateIshtaKashtaFromBalas(s.sthanaBala.uchchaBala, s.cheshtaBala);
    out.push({
      planet,
      uchchaBala: s.sthanaBala.uchchaBala,
      cheshtaBala: s.cheshtaBala,
      ishtaPhala: ishta,
      kashtaPhala: kashta,
      net: ishta - kashta,
    });
  }
  return out;
}
