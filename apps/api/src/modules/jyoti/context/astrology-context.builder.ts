import { prisma } from '../../../services/prisma.service';
import { astrologyService } from '../../astrology/astrology.service';

export interface AstrologyContextOptions {
  userId: string;
  birthProfileId?: string;
  currentScreen?: string;
}

export class AstrologyContextBuilder {
  /**
   * Assembles a compact, relevant astrology context string for LLM input.
   */
  public static async buildContext(options: AstrologyContextOptions): Promise<string> {
    const { userId, birthProfileId, currentScreen } = options;
    const contextParts: string[] = [];

    if (currentScreen) {
      contextParts.push(`USER CURRENT SCREEN: ${currentScreen}`);
    }

    try {
      let targetProfileId = birthProfileId;

      // If no specific birthProfileId requested, fetch primary profile for user
      if (!targetProfileId) {
        const primaryProfile = await prisma.birthProfile.findFirst({
          where: { userId },
          orderBy: { createdAt: 'asc' },
        });
        targetProfileId = primaryProfile?.id;
      }

      if (!targetProfileId) {
        contextParts.push('BIRTH PROFILE STATUS: No active birth profile found for user.');
        contextParts.push('INSTRUCTION: If user asks about their personal chart or planetary placements, gently remind them to create their birth profile first.');
        return contextParts.join('\n\n');
      }

      // Fetch calculated AstroChart using existing astrology service
      const chartResponse = await astrologyService.calculateChartForProfile(targetProfileId, {
        id: userId,
        role: 'USER',
      });

      const chartData = chartResponse.data || chartResponse.chart;

      if (!chartData) {
        contextParts.push('BIRTH PROFILE STATUS: Birth profile exists, but chart calculation data is unavailable.');
        return contextParts.join('\n\n');
      }

      const hasValidAscendant = Boolean(chartData?.ascendant && (chartData.ascendant.rashiName || chartData.ascendant.name));
      const validPlanets = Array.isArray(chartData?.planets)
        ? chartData.planets.filter((p) => p && typeof p.planet === 'string' && p.planet.length > 0)
        : [];

      if (!hasValidAscendant && validPlanets.length === 0) {
        contextParts.push('BIRTH PROFILE STATUS: Birth profile exists, but complete chart data is currently unavailable.');
        contextParts.push('INSTRUCTION: If the user asks for personal chart or planetary details, respond: "I don\'t have your complete chart data available right now. Please try again after your birth profile has been loaded." Do NOT invent planetary positions.');
        return contextParts.join('\n\n');
      }

      contextParts.push('--- USER ASTROLOGY CHART DATA ---');

      if (hasValidAscendant) {
        contextParts.push(
          `Ascendant (Lagna): ${chartData.ascendant.rashiName || 'Ascendant'} (${chartData.ascendant.degreeInRashi?.toFixed(2) || '0'}°) in ${chartData.ascendant.nakshatraName || ''} Nakshatra.`
        );
      }

      if (validPlanets.length > 0) {
        const planetSummaries = validPlanets.map(
          (p) => `- ${p.planet}: ${p.rashiName || 'Rashi ' + p.rashiIndex} (${p.degreeInRashi?.toFixed(2)}°), ${p.nakshatraName || 'Nakshatra ' + p.nakshatraIndex} (Pada ${p.pada || 1})${p.isRetrograde ? ' [Retrograde]' : ''}`
        );
        contextParts.push('Planetary Positions:\n' + planetSummaries.join('\n'));
      }

      contextParts.push('---------------------------------');
    } catch (err: any) {
      console.warn('[AstrologyContextBuilder] Could not build chart context:', err?.message || err);
      contextParts.push('BIRTH PROFILE STATUS: Error retrieving chart data. Rely on general Vedic astrology principles.');
    }

    return contextParts.join('\n\n');
  }
}
