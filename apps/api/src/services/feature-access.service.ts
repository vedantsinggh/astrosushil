import { prisma } from './prisma.service';

export interface FeatureAccessResult {
  feature: string;
  featureName: string;
  allowed: boolean;
  reason: string;
  source: string;
  details?: Record<string, any>;
}

export interface EntitlementItem {
  feature: string;
  name: string;
  allowed: boolean;
  status: string;
  source: string;
  expiresAt: string | null;
}

export class FeatureAccessService {
  private featureCatalog: Record<string, { name: string; isFree: boolean; reportTypeKey?: string }> = {
    BIRTH_CHART: { name: 'Basic Birth Chart Calculation', isFree: true },
    PLANET_POSITIONS: { name: 'Ephemeris & Planetary Longitudes', isFree: true },
    JYOTI_AI: { name: 'Jyoti AI Astrological Assistant', isFree: false },
    CAREER_REPORT: { name: 'Career Report Generation', isFree: false, reportTypeKey: 'CAREER' },
    KUNDLI_REPORT: { name: 'Full Kundli Analysis Report', isFree: false, reportTypeKey: 'KUNDLI' },
    PLANETARY_SUMMARY_REPORT: { name: 'Planetary Summary Report', isFree: false, reportTypeKey: 'PLANETARY_SUMMARY' },
    GUPTA_NADI_DOSSIER: { name: 'Gupta Nadi BNN Rule Dossier', isFree: false, reportTypeKey: 'GUPTA_NADI_DOSSIER' },
    MARRIAGE_COMPATIBILITY: { name: 'Marriage & Relationship Compatibility', isFree: false, reportTypeKey: 'MARRIAGE_COMPATIBILITY' },
  };

  public getCatalog() {
    return Object.entries(this.featureCatalog).map(([code, meta]) => ({
      code,
      name: meta.name,
      isFree: meta.isFree,
      reportTypeKey: meta.reportTypeKey || null,
    }));
  }

  /**
   * Helper to check if a user is currently suspended by inspecting audit logs
   */
  public async isUserSuspended(userId: string): Promise<boolean> {
    const latestStatusLog = await prisma.auditLog.findFirst({
      where: {
        resource: `User:${userId}`,
        action: { in: ['USER_SUSPENDED', 'USER_ACTIVATED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return latestStatusLog?.action === 'USER_SUSPENDED';
  }

  /**
   * Helper to find active manual entitlement grant for user & feature
   */
  public async getActiveManualGrant(userId: string, feature: string) {
    const latestGrantLog = await prisma.auditLog.findFirst({
      where: {
        resource: `User:${userId}`,
        action: { in: ['ENTITLEMENT_GRANTED', 'ENTITLEMENT_REVOKED'] },
        details: { contains: feature },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestGrantLog?.action === 'ENTITLEMENT_REVOKED') {
      return null;
    }

    if (latestGrantLog?.action === 'ENTITLEMENT_GRANTED') {
      try {
        const payload = JSON.parse(latestGrantLog.details || '{}');
        if (payload.feature === feature) {
          const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
          if (!expiresAt || expiresAt.getTime() > Date.now()) {
            return {
              expiresAt: payload.expiresAt || null,
              reason: payload.reason || 'Support entitlement grant',
              grantedBy: latestGrantLog.adminEmail,
              grantedAt: latestGrantLog.createdAt.toISOString(),
            };
          }
        }
      } catch (_e) {
        return null;
      }
    }

    return null;
  }

  public async evaluateFeatureAccess(userId: string | null, feature: string): Promise<FeatureAccessResult> {
    const meta = this.featureCatalog[feature];
    if (!meta) {
      return {
        feature,
        featureName: feature,
        allowed: false,
        reason: 'UNKNOWN_FEATURE',
        source: 'SYSTEM_CATALOG',
      };
    }

    // 1. Guest session checks
    if (!userId) {
      if (meta.isFree) {
        return {
          feature,
          featureName: meta.name,
          allowed: true,
          reason: 'GUEST_FREE_TIER',
          source: 'DEFAULT_FREE_ACCESS',
        };
      }
      return {
        feature,
        featureName: meta.name,
        allowed: false,
        reason: 'AUTHENTICATION_REQUIRED',
        source: 'GUEST_RESTRICTION',
        details: { message: 'Guest users must log in to access this feature' },
      };
    }

    // 2. User existence & suspension verification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerifiedAt: true, role: true },
    });

    if (!user) {
      return {
        feature,
        featureName: meta.name,
        allowed: false,
        reason: 'USER_NOT_FOUND',
        source: 'USER_VERIFICATION',
      };
    }

    const isSuspended = await this.isUserSuspended(userId);
    if (isSuspended) {
      return {
        feature,
        featureName: meta.name,
        allowed: false,
        reason: 'ACCOUNT_SUSPENDED',
        source: 'SECURITY_POLICY',
        details: { message: 'Account is suspended by administrator' },
      };
    }

    // 3. Manual Support Entitlement Grant check
    const manualGrant = await this.getActiveManualGrant(userId, feature);
    if (manualGrant) {
      return {
        feature,
        featureName: meta.name,
        allowed: true,
        reason: 'MANUAL_GRANT_ACTIVE',
        source: 'SUPPORT_ENTITLEMENT_GRANT',
        details: manualGrant,
      };
    }

    // 4. Free features for registered users
    if (meta.isFree || feature === 'JYOTI_AI') {
      return {
        feature,
        featureName: meta.name,
        allowed: true,
        reason: 'REGISTERED_TIER_GRANTED',
        source: 'REGISTERED_USER_POLICY',
      };
    }

    // 5. Paid features check: Completed PAID order for this report type
    if (meta.reportTypeKey) {
      const paidOrder = await prisma.order.findFirst({
        where: {
          userId,
          reportType: meta.reportTypeKey as any,
          status: 'PAID',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (paidOrder) {
        return {
          feature,
          featureName: meta.name,
          allowed: true,
          reason: 'PAID_PURCHASE_VERIFIED',
          source: `ORDER_${paidOrder.razorpayOrderId}`,
          details: { orderId: paidOrder.id, amount: paidOrder.amount, paidAt: paidOrder.updatedAt },
        };
      }

      return {
        feature,
        featureName: meta.name,
        allowed: false,
        reason: 'NO_ACTIVE_ORDER',
        source: 'ORDER_ENTITLEMENT_CHECK',
        details: { requiredReportType: meta.reportTypeKey },
      };
    }

    return {
      feature,
      featureName: meta.name,
      allowed: false,
      reason: 'NO_ACTIVE_ENTITLEMENT',
      source: 'ENTITLEMENT_ENGINE',
    };
  }

  public async getUserEntitlements(userId: string): Promise<{
    accountType: string;
    isGuest: boolean;
    isSuspended: boolean;
    activeEntitlements: EntitlementItem[];
    evaluatedAccess: FeatureAccessResult[];
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerifiedAt: true, createdAt: true },
    });

    const isGuest = !user || user.email.startsWith('guest_') || user.email.endsWith('@astrosushil.guest');
    const isSuspended = user ? await this.isUserSuspended(userId) : false;
    const accountType = isGuest ? 'GUEST' : isSuspended ? 'SUSPENDED' : 'REGISTERED';

    const evaluatedAccess: FeatureAccessResult[] = [];
    const activeEntitlements: EntitlementItem[] = [];

    for (const code of Object.keys(this.featureCatalog)) {
      const res = await this.evaluateFeatureAccess(userId, code);
      evaluatedAccess.push(res);

      activeEntitlements.push({
        feature: code,
        name: res.featureName,
        allowed: res.allowed,
        status: res.allowed ? 'ACTIVE' : 'INACTIVE',
        source: res.source,
        expiresAt: res.details?.expiresAt || null,
      });
    }

    return {
      accountType,
      isGuest,
      isSuspended,
      activeEntitlements,
      evaluatedAccess,
    };
  }
}

export const featureAccessService = new FeatureAccessService();
