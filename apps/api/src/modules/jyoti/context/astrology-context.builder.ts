import { prisma } from '../../../services/prisma.service';
import { astrologyService } from '../../astrology/astrology.service';

export interface AstrologyContextOptions {
  userId: string;
  birthProfileId?: string;
  currentScreen?: string;
}

export class AstrologyContextBuilder {
  /**
   * Assembles a compact, relevant astrology and app context string for LLM input.
   */
  public static async buildContext(options: AstrologyContextOptions): Promise<string> {
    const { userId, birthProfileId, currentScreen } = options;
    const contextParts: string[] = [];

    // 1. Current App Screen
    if (currentScreen) {
      contextParts.push(`USER CURRENT SCREEN: ${currentScreen}`);
    }

    try {
      // 2. User Account Status
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, fullName: true },
      });

      if (user) {
        contextParts.push(`USER ACCOUNT: Authenticated (${user.email}) | Role: ${user.role}`);
      } else {
        contextParts.push(`USER ACCOUNT: Guest Mode (Unauthenticated)`);
      }

      // 3. Saved Birth Profiles & Active Profile Selection
      const allProfiles = await prisma.birthProfile.findMany({
        where: { userId },
        select: { id: true, name: true, dateOfBirth: true, timeOfBirth: true, placeName: true, timezone: true },
        orderBy: { createdAt: 'asc' },
      });

      let targetProfile = allProfiles.find((p) => p.id === birthProfileId) || allProfiles[0];

      if (allProfiles.length > 0) {
        const profileSummaries = allProfiles.map(
          (p) => `- Profile "${p.name}": DoB ${p.dateOfBirth}, ToB ${p.timeOfBirth}, Location: ${p.placeName || 'Unknown'} (${p.timezone})`
        );
        contextParts.push(`SAVED BIRTH PROFILES (${allProfiles.length}):\n${profileSummaries.join('\n')}`);
      } else {
        contextParts.push('BIRTH PROFILE STATUS: No active birth profile found in backend database.');
        contextParts.push('INSTRUCTION: If the user asks about their personal chart, planetary placements, Kundli, horoscope, or predictions, kindly remind them to create their birth profile first and include an OPEN_BIRTH_PROFILE action button.');
      }

      // 4. Report Status Context
      const recentReports = await prisma.report.findMany({
        where: { userId },
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { id: true, reportType: true, status: true, progress: true, errorMessage: true, createdAt: true, completedAt: true },
      });

      if (recentReports.length > 0) {
        const reportSummaries = recentReports.map((r) => {
          let summary = `- Report ${r.reportType}: Status ${r.status} (${r.progress}%)`;
          if (r.status === 'FAILED' && r.errorMessage) {
            summary += ` | Failure Reason: ${r.errorMessage}`;
          }
          return summary;
        });
        contextParts.push(`USER REPORTS STATUS:\n${reportSummaries.join('\n')}`);
      } else {
        contextParts.push('USER REPORTS STATUS: No reports generated yet.');
      }

      // 5. Recent Orders / Payments Status
      const recentOrders = await prisma.order.findMany({
        where: { userId },
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: { id: true, reportType: true, status: true, amount: true, createdAt: true },
      });

      if (recentOrders.length > 0) {
        const orderSummaries = recentOrders.map(
          (o) => `- Order for ${o.reportType}: Status ${o.status}, Amount ₹${(o.amount / 100).toFixed(2)}`
        );
        contextParts.push(`RECENT ORDERS / PAYMENTS:\n${orderSummaries.join('\n')}`);
      }

      // 6. Notification Preferences
      const notifPref = await prisma.notificationPreference.findUnique({
        where: { userId },
      });
      if (notifPref) {
        contextParts.push(
          `NOTIFICATION SETTINGS: Push alerts: ${notifPref.pushEnabled ? 'ENABLED' : 'DISABLED'}, Report alerts: ${notifPref.reportAlerts ? 'ENABLED' : 'DISABLED'}, Astrology reminders: ${notifPref.astrologyReminders ? 'ENABLED' : 'DISABLED'}`
        );
      }

      // 7. Deterministic Astrology Chart Data
      if (targetProfile) {
        const chartResponse = await astrologyService.calculateChartForProfile(targetProfile.id, {
          id: userId,
          role: user?.role || 'USER',
        });

        const chartData = chartResponse.data || chartResponse.chart;

        if (chartData) {
          const hasValidAscendant = Boolean(chartData?.ascendant && (chartData.ascendant.rashiName || chartData.ascendant.name));
          const validPlanets = Array.isArray(chartData?.planets)
            ? chartData.planets.filter((p) => p && typeof p.planet === 'string' && p.planet.length > 0)
            : [];

          if (hasValidAscendant || validPlanets.length > 0) {
            contextParts.push('--- USER ASTROLOGY CHART DATA (DETERMINISTIC) ---');

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

            contextParts.push('--------------------------------------------------');
          }
        }
      }
    } catch (err: any) {
      console.warn('[AstrologyContextBuilder] Could not build complete context:', err?.message || err);
      contextParts.push('SYSTEM NOTE: Some backend context was unavailable. Rely on general Astro Sushil app knowledge & Vedic astrology principles.');
    }

    return contextParts.join('\n\n');
  }
}

