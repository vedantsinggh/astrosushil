import { ReportInterpretationProvider } from './interpretation-provider.interface';
import { ReportSectionDto, ReportType } from '../types/report.types';

export class DeterministicInterpretationProvider implements ReportInterpretationProvider {
  public async generateInterpretations(
    reportType: ReportType,
    rawChartData: any
  ): Promise<ReportSectionDto[]> {
    const chart = rawChartData.chart || rawChartData.data || rawChartData;
    const sections: ReportSectionDto[] = [];

    const ascendantSign = chart.ascendant?.rashiName || chart.ascendant?.sign || 'Aries';
    const moonPlanet = (chart.planets || []).find((p: any) => (p.planet || p.name) === 'MOON');
    const moonSign = moonPlanet?.rashiName || moonPlanet?.sign || 'Taurus';
    const moonNakshatra = moonPlanet?.nakshatraName || moonPlanet?.nakshatra || 'Rohini';
    const sunPlanet = (chart.planets || []).find((p: any) => (p.planet || p.name) === 'SUN');
    const sunSign = sunPlanet?.rashiName || sunPlanet?.sign || 'Leo';

    if (reportType === ReportType.KUNDLI) {
      sections.push({
        id: 'ascendant_personality',
        title: 'Ascendant (Lagna) Overview',
        type: 'TEXT',
        content: `Your Ascendant is in ${ascendantSign}. The Lagna defines your physical vitality, outer persona, and life orientation. With ${ascendantSign} in the 1st house, your path is defined by direct action, leadership, and personal integrity.`,
        keyValues: {
          Lagna: ascendantSign,
          Focus: 'Self-Realization & Purpose',
        },
      });

      sections.push({
        id: 'moon_nakshatra_insight',
        title: 'Janma Nakshatra & Emotional Core',
        type: 'TEXT',
        content: `Your birth Moon is placed in ${moonSign} in ${moonNakshatra} Nakshatra. In Vedic astrology, the Moon Nakshatra governs your subconscious mind, emotional instinct, and foundational temperament.`,
        keyValues: {
          Rashi: moonSign,
          Nakshatra: moonNakshatra,
          Element: 'Emotional Harmony',
        },
      });

      sections.push({
        id: 'sun_soul_purpose',
        title: 'Sun Position & Vital Force',
        type: 'TEXT',
        content: `Your Sun is positioned in ${sunSign}. The Sun represents your core identity, soul purpose, authority, and inner drive.`,
        keyValues: {
          'Sun Sign': sunSign,
          Dharma: 'Personal Mastery & Honor',
        },
      });
    } else if (reportType === ReportType.PLANETARY_SUMMARY) {
      sections.push({
        id: 'planetary_balance',
        title: 'Planetary Force & Dynamics',
        type: 'TEXT',
        content: `Your natal planetary distribution shows key energy focal points across your chart. Planetary strengths and house placements indicate areas of life where momentum and natural aptitude are highest.`,
        keyValues: {
          'Lagna Lord Sign': ascendantSign,
          'Moon Sign': moonSign,
          'Sun Sign': sunSign,
        },
      });

      const retroPlanets = (chart.planets || [])
        .filter((p: any) => p.isRetrograde)
        .map((p: any) => p.planet || p.name);

      sections.push({
        id: 'retrograde_analysis',
        title: 'Retrograde Planetary Dynamics',
        type: 'TEXT',
        content: retroPlanets.length > 0
          ? `The following planets are in retrograde motion: ${retroPlanets.join(', ')}. Retrograde planets internalize their energy, requiring deep introspective focus and karmic mastery.`
          : 'All major planets are in direct motion in your natal chart, indicating smooth, forward-directed exterior expression of planetary energies.',
        keyValues: {
          'Retrograde Count': String(retroPlanets.length),
          'Retrograde Planets': retroPlanets.length > 0 ? retroPlanets.join(', ') : 'None',
        },
      });
    }

    return sections;
  }
}
