import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS, getRashiByLongitude, getDegreeInRashi } from '../zodiac/rashi';
import { normalizeDegree } from '../coordinates/angular-math';

export type SadeSatiPhase = 'NONE' | 'PHASE_1_SETTING' | 'PHASE_2_PEAK' | 'PHASE_3_RISING';

export interface SadeSatiReport {
  isSadeSatiActive: boolean;
  phase: SadeSatiPhase;
  phaseName: string;
  sanskritPhaseName: string;
  natalMoonRashiIndex: number;
  natalMoonRashiName: string;
  saturnTransitRashiIndex: number;
  saturnTransitRashiName: string;
  houseFromMoon: number; // 1 to 12
  isDhaiyyaActive: boolean;
  dhaiyyaType: 'NONE' | 'KANTAKA_4TH' | 'ASHTAMA_8TH';
  dhaiyyaName: string;
  description: string;
}

export class SadeSatiCalculator {
  /**
   * Evaluates Sade Sati and Dhaiyya status given natal Moon longitude and transiting Saturn longitude.
   */
  public static evaluateSadeSati(
    natalMoonLongitude: number,
    transitSaturnLongitude: number
  ): SadeSatiReport {
    const moonRashiDef = getRashiByLongitude(normalizeDegree(natalMoonLongitude));
    const saturnRashiDef = getRashiByLongitude(normalizeDegree(transitSaturnLongitude));

    const moonRashi = moonRashiDef.index;
    const saturnRashi = saturnRashiDef.index;

    // House of Saturn relative to Moon (1 to 12)
    const houseFromMoon = ((saturnRashi - moonRashi + 12) % 12) + 1;

    let isSadeSatiActive = false;
    let phase: SadeSatiPhase = 'NONE';
    let phaseName = 'No active Sade Sati';
    let sanskritPhaseName = 'Shani Sade Sati Anupasthit';
    let description = 'Transiting Saturn is not currently in the 12th, 1st, or 2nd house from the natal Moon.';

    if (houseFromMoon === 12) {
      isSadeSatiActive = true;
      phase = 'PHASE_1_SETTING';
      phaseName = 'Phase 1: Setting / Ingress (12th from Moon)';
      sanskritPhaseName = 'Prathama Charana (Aroha)';
      description = 'Saturn is transiting the 12th house from natal Moon, marking the initial 2.5-year phase of Sade Sati affecting expenses, foreign connections, and sleep.';
    } else if (houseFromMoon === 1) {
      isSadeSatiActive = true;
      phase = 'PHASE_2_PEAK';
      phaseName = 'Phase 2: Peak / Janma Shani (1st from Moon)';
      sanskritPhaseName = 'Dvitiya Charana (Janma Shani / Madhya)';
      description = 'Saturn is directly transiting the natal Moon sign, marking the central 2.5-year peak phase affecting mind, health, identity, and personal responsibilities.';
    } else if (houseFromMoon === 2) {
      isSadeSatiActive = true;
      phase = 'PHASE_3_RISING';
      phaseName = 'Phase 3: Rising / Concluding (2nd from Moon)';
      sanskritPhaseName = 'Tritiya Charana (Avaroha)';
      description = 'Saturn is transiting the 2nd house from natal Moon, marking the final 2.5-year phase affecting family finances, speech, and material stabilization.';
    }

    // Dhaiyya (Small Panoti)
    let isDhaiyyaActive = false;
    let dhaiyyaType: 'NONE' | 'KANTAKA_4TH' | 'ASHTAMA_8TH' = 'NONE';
    let dhaiyyaName = 'No active Dhaiyya';

    if (houseFromMoon === 4) {
      isDhaiyyaActive = true;
      dhaiyyaType = 'KANTAKA_4TH';
      dhaiyyaName = 'Kantaka Shani / Ardha Ashtama Shani (4th from Moon)';
      if (!isSadeSatiActive) {
        description = 'Saturn is transiting the 4th house from natal Moon, creating 2.5-year Kantaka Shani affecting domestic peace, vehicles, and real estate.';
      }
    } else if (houseFromMoon === 8) {
      isDhaiyyaActive = true;
      dhaiyyaType = 'ASHTAMA_8TH';
      dhaiyyaName = 'Ashtama Shani (8th from Moon)';
      if (!isSadeSatiActive) {
        description = 'Saturn is transiting the 8th house from natal Moon, creating 2.5-year Ashtama Shani requiring caution in sudden transformations, vitality, and longevity.';
      }
    }

    return {
      isSadeSatiActive,
      phase,
      phaseName,
      sanskritPhaseName,
      natalMoonRashiIndex: moonRashi,
      natalMoonRashiName: moonRashiDef.sanskritName,
      saturnTransitRashiIndex: saturnRashi,
      saturnTransitRashiName: saturnRashiDef.sanskritName,
      houseFromMoon,
      isDhaiyyaActive,
      dhaiyyaType,
      dhaiyyaName,
      description,
    };
  }
}
