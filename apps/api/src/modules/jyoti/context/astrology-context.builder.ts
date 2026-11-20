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
        contextParts.push(`USER ACCOUNT: Authenticated | Role: ${user.role}`);
      } else {
        contextParts.push(`USER ACCOUNT: Guest Mode (Unauthenticated)`);
      }

      // 3. Saved Birth Profiles & Active Profile Selection
      const allProfiles = await prisma.birthProfile.findMany({
        where: { userId },
        select: { id: true, name: true, dateOfBirth: true, timeOfBirth: true, placeName: true, timezone: true },
        orderBy: { createdAt: 'asc' },
      });

      // Never silently substitute a different profile when a specific one was requested.
      const targetProfile = birthProfileId
        ? allProfiles.find((p) => p.id === birthProfileId)
        : allProfiles[0];
      if (birthProfileId && !targetProfile) {
        contextParts.push('ACTIVE PROFILE STATUS: The requested birth profile was not found for this user. Do NOT describe any personal chart placements; ask the user to select a valid birth profile.');
      }

      if (allProfiles.length > 0) {
        // Names and exact birth data are personal data and are not sent to the third-party LLM
        // (docs/jyoti.md privacy rule); the chart is computed server-side, so they are not needed.
        const profileSummaries = allProfiles.map(
          (p, i) => `- Profile ${i + 1}${targetProfile && p.id === targetProfile.id ? ' [ACTIVE]' : ''}`
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
          (o) => `- Order for ${o.reportType ?? 'bundle/other'}: Status ${o.status}, Amount ₹${(o.amount / 100).toFixed(2)}`
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

      // 7. Deterministic Astrology Chart Data (engine output only; the LLM must never derive these)
      if (targetProfile) {
        const activeIndex = allProfiles.findIndex((p) => p.id === targetProfile.id) + 1;
        contextParts.push(
          `ACTIVE BIRTH PROFILE: Profile ${activeIndex}. All chart data below belongs to this profile only.`
        );

        const chartResponse = await astrologyService.calculateChartForProfile(targetProfile.id, {
          id: userId,
          role: user?.role || 'USER',
        });

        const chartData = chartResponse.data || chartResponse.chart;
        const chartSection = chartData ? AstrologyContextBuilder.formatChart(chartData) : [];
        if (chartSection.length > 0) {
          contextParts.push('--- USER ASTROLOGY CHART DATA (DETERMINISTIC, Lahiri sidereal, whole-sign houses) ---');
          contextParts.push(...chartSection);

          // Current Vimshottari dasha from the deterministic dasha engine. Failure here must not
          // drop the chart itself, so it is isolated.
          try {
            const dasha = await astrologyService.calculateDasha(
              { birthProfileId: targetProfile.id, dashaSystem: 'VIMSHOTTARI', maxLevel: 3, targetDate: new Date().toISOString() },
              { id: userId, role: user?.role || 'USER' }
            );
            const dashaLine = AstrologyContextBuilder.formatActiveDasha(dasha?.activePeriods);
            contextParts.push(dashaLine ?? 'CURRENT VIMSHOTTARI DASHA: unavailable. Do NOT state or guess the current dasha.');
          } catch (dashaErr: any) {
            console.warn('[AstrologyContextBuilder] Could not compute current dasha:', dashaErr?.message || dashaErr);
            contextParts.push('CURRENT VIMSHOTTARI DASHA: unavailable. Do NOT state or guess the current dasha.');
          }

          contextParts.push('--------------------------------------------------');
          contextParts.push(
            'GROUNDING RULE: Use ONLY the computed values above for this user\'s ascendant, signs, houses, house lords, aspects, dignities and dashas. If something the user asks about is not listed above, say it is not available here instead of working it out yourself.'
          );
        } else {
          contextParts.push('CHART STATUS: The active profile\'s chart could not be computed. Do NOT state or guess any personal placements, houses or dashas.');
        }
      }
    } catch (err: any) {
      console.warn('[AstrologyContextBuilder] Could not build complete context:', err?.message || err);
      contextParts.push('SYSTEM NOTE: The user\'s chart data could not be loaded. Do NOT state or guess any personal planetary placements, dashas or predictions; tell the user their chart is currently unavailable and they should try again.');
    }

    return contextParts.join('\n\n');
  }

  /** Formats engine chart output into compact, factual lines. No astrology is derived here. */
  public static formatChart(chartData: any): string[] {
    const lines: string[] = [];
    const asc = chartData?.ascendant;
    if (asc && (asc.rashiName || asc.sign)) {
      lines.push(
        `Ascendant (Lagna): ${asc.rashiName || asc.sign}` +
          (typeof asc.degreeInRashi === 'number' ? ` (${asc.degreeInRashi.toFixed(2)}°)` : '') +
          (asc.nakshatraName ? `, ${asc.nakshatraName} Nakshatra` : '') +
          (asc.pada ? ` (Pada ${asc.pada})` : '') +
          (asc.lord ? `, Lagna lord ${asc.lord}` : '')
      );
    }

    const planets: any[] = Array.isArray(chartData?.planets)
      ? chartData.planets.filter((p: any) => p && typeof p.planet === 'string' && p.planet.length > 0)
      : [];
    if (planets.length > 0) {
      const planetLines = planets.map((p) => {
        const parts = [`- ${p.planet}: ${p.rashiName || p.sign || 'Rashi ' + p.rashiIndex}`];
        if (typeof p.degreeInRashi === 'number') parts[0] += ` ${p.degreeInRashi.toFixed(2)}°`;
        if (typeof p.house === 'number') parts.push(`house ${p.house}`);
        if (p.nakshatraName) parts.push(`${p.nakshatraName}${p.pada ? ' pada ' + p.pada : ''}`);
        if (p.dignity) parts.push(`dignity ${p.dignity}`);
        if (Array.isArray(p.lordship) && p.lordship.length > 0) parts.push(`lord of house ${p.lordship.join(' & ')}`);
        if (Array.isArray(p.aspectsCast) && p.aspectsCast.length > 0) parts.push(`aspects house ${p.aspectsCast.join(', ')}`);
        if (p.isRetrograde || p.retrograde) parts.push('retrograde');
        if (p.combust) parts.push('combust');
        return parts.join(', ');
      });
      lines.push('Planetary Positions:\n' + planetLines.join('\n'));
    }

    const houses: any[] = Array.isArray(chartData?.houses) ? chartData.houses : [];
    if (houses.length > 0) {
      const houseLines = houses.map((h) => {
        const num = h.houseNumber ?? h.number;
        const occupants = planets.filter((p) => p.house === num).map((p) => p.planet);
        return `- House ${num}: ${h.rashiName || h.sign}${h.lord ? `, lord ${h.lord}` : ''}, occupants: ${occupants.length > 0 ? occupants.join(', ') : 'none'}`;
      });
      lines.push('Houses (whole-sign, computed):\n' + houseLines.join('\n'));
    }

    return lines;
  }

  /** Formats the engine's active Vimshottari periods. Returns null when unavailable. */
  public static formatActiveDasha(active: any): string | null {
    if (!active?.mahadasha?.lord) return null;
    const fmt = (p: any) => `${p.lord} (${String(p.startDateIso).slice(0, 10)} to ${String(p.endDateIso).slice(0, 10)})`;
    const parts = [`Mahadasha ${fmt(active.mahadasha)}`];
    if (active.antardasha?.lord) parts.push(`Antardasha ${fmt(active.antardasha)}`);
    if (active.pratyantardasha?.lord) parts.push(`Pratyantardasha ${fmt(active.pratyantardasha)}`);
    return `CURRENT VIMSHOTTARI DASHA (computed for ${String(active.targetDateIso || new Date().toISOString()).slice(0, 10)}): ${parts.join('; ')}`;
  }
}
