import { prisma } from '../../services/prisma.service';

export type AnalyticsPeriod = 'today' | '7d' | '30d' | '90d' | '12m' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  prevStartDate: Date;
  prevEndDate: Date;
  periodLabel: string;
}

export function parseAnalyticsDateRange(
  period: AnalyticsPeriod = '7d',
  customStart?: string,
  customEnd?: string
): DateRange {
  const now = new Date();

  if (period === 'custom' && customStart && customEnd) {
    const startDate = new Date(customStart);
    const endDate = new Date(customEnd);
    const duration = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime());
    const prevStartDate = new Date(startDate.getTime() - (duration > 0 ? duration : 86400000));
    return {
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
      periodLabel: `Custom (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`,
    };
  }

  let startDate: Date;
  let prevStartDate: Date;
  let prevEndDate: Date;
  let periodLabel = '7 Days';

  switch (period) {
    case 'today': {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      const duration = now.getTime() - startDate.getTime();
      prevEndDate = new Date(startDate.getTime());
      prevStartDate = new Date(startDate.getTime() - (duration > 0 ? duration : 86400000));
      periodLabel = 'Today';
      break;
    }
    case '30d': {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(startDate.getTime());
      prevStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      periodLabel = '30 Days';
      break;
    }
    case '90d': {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(startDate.getTime());
      prevStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      periodLabel = '90 Days';
      break;
    }
    case '12m': {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(startDate.getTime());
      prevStartDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
      periodLabel = '12 Months';
      break;
    }
    case '7d':
    default: {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(startDate.getTime());
      prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      periodLabel = '7 Days';
      break;
    }
  }

  return {
    startDate,
    endDate: now,
    prevStartDate,
    prevEndDate,
    periodLabel,
  };
}

export function formatChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return { changePercent: 0, text: '0.0%' };
    return { changePercent: null, text: 'No previous-period data' };
  }
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  const sign = pct >= 0 ? '+' : '';
  return { changePercent: pct, text: `${sign}${pct}%` };
}

// Simple in-memory analytics cache (TTL 60 seconds)
const analyticsCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = analyticsCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data as T;
  }
  return null;
}

function setCached<T>(key: string, data: T): void {
  analyticsCache.set(key, { timestamp: Date.now(), data });
}

export class AnalyticsService {
  /**
   * 1. Overview Analytics KPI Cards
   */
  public async getOverview(period: AnalyticsPeriod = '7d', customStart?: string, customEnd?: string) {
    const cacheKey = `overview_${period}_${customStart || ''}_${customEnd || ''}`;
    const cached = getCached<any>(cacheKey);
    if (cached) return cached;

    const range = parseAnalyticsDateRange(period, customStart, customEnd);
    const { startDate, endDate, prevStartDate, prevEndDate } = range;

    const [
      totalUsers,
      currentNewUsers,
      prevNewUsers,
      currentProfiles,
      prevProfiles,
      currentReportsCompleted,
      prevReportsCompleted,
      currentReportsFailed,
      prevReportsFailed,
      currentPaidOrders,
      prevPaidOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      prisma.user.count({ where: { createdAt: { gte: prevStartDate, lte: prevEndDate } } }),
      prisma.birthProfile.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      prisma.birthProfile.count({ where: { createdAt: { gte: prevStartDate, lte: prevEndDate } } }),
      prisma.report.count({ where: { status: 'COMPLETED', createdAt: { gte: startDate, lte: endDate } } }),
      prisma.report.count({ where: { status: 'COMPLETED', createdAt: { gte: prevStartDate, lte: prevEndDate } } }),
      prisma.report.count({ where: { status: 'FAILED', createdAt: { gte: startDate, lte: endDate } } }),
      prisma.report.count({ where: { status: 'FAILED', createdAt: { gte: prevStartDate, lte: prevEndDate } } }),
      prisma.order.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: { status: 'PAID', createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.order.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: { status: 'PAID', createdAt: { gte: prevStartDate, lte: prevEndDate } },
      }),
    ]);

    const currentRevenuePaise = currentPaidOrders._sum.amount || 0;
    const prevRevenuePaise = prevPaidOrders._sum.amount || 0;

    const result = {
      period: range.periodLabel,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      metrics: {
        totalUsers: { value: totalUsers, change: null },
        newUsers: { value: currentNewUsers, ...formatChange(currentNewUsers, prevNewUsers) },
        birthProfilesCreated: { value: currentProfiles, ...formatChange(currentProfiles, prevProfiles) },
        reportsCompleted: { value: currentReportsCompleted, ...formatChange(currentReportsCompleted, prevReportsCompleted) },
        reportsFailed: { value: currentReportsFailed, ...formatChange(currentReportsFailed, prevReportsFailed) },
        jyotiConversations: {
          value: 0,
          change: null,
          text: 'Local device storage',
          note: 'Jyoti chat history is currently stored locally on client devices.',
        },
        paidOrdersCount: { value: currentPaidOrders._count.id, ...formatChange(currentPaidOrders._count.id, prevPaidOrders._count.id) },
        revenueRupees: {
          value: currentRevenuePaise / 100,
          rawPaise: currentRevenuePaise,
          ...formatChange(currentRevenuePaise, prevRevenuePaise),
        },
      },
    };

    setCached(cacheKey, result);
    return result;
  }

  /**
   * 2. User Analytics
   */
  public async getUserAnalytics(period: AnalyticsPeriod = '7d', customStart?: string, customEnd?: string) {
    const cacheKey = `users_${period}_${customStart || ''}_${customEnd || ''}`;
    const cached = getCached<any>(cacheKey);
    if (cached) return cached;

    const range = parseAnalyticsDateRange(period, customStart, customEnd);
    const { startDate, endDate } = range;

    const [
      totalUsers,
      newRegistrations,
      verifiedUsers,
      unverifiedUsers,
      usersWithProfilesCount,
      paidUsersCount,
      usersRaw,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
      prisma.user.count({ where: { emailVerifiedAt: null } }),
      prisma.birthProfile.groupBy({
        by: ['userId'],
        _count: { userId: true },
      }),
      prisma.order.groupBy({
        by: ['userId'],
        where: { status: 'PAID' },
        _count: { userId: true },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { createdAt: true, emailVerifiedAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Group registration trend by day
    const trendMap = new Map<string, { date: string; newUsers: number; verifiedUsers: number }>();
    for (const u of usersRaw) {
      const dayKey = u.createdAt.toISOString().split('T')[0];
      const existing = trendMap.get(dayKey) || { date: dayKey, newUsers: 0, verifiedUsers: 0 };
      existing.newUsers += 1;
      if (u.emailVerifiedAt != null) existing.verifiedUsers += 1;
      trendMap.set(dayKey, existing);
    }

    const result = {
      period: range.periodLabel,
      metrics: {
        totalUsers,
        newRegistrations,
        verifiedUsers,
        unverifiedUsers,
        usersWithBirthProfiles: usersWithProfilesCount.length,
        paidUsers: paidUsersCount.length,
        retentionNote: '1-day, 7-day, and 30-day user retention analytics require event-level activity tracking telemetry.',
      },
      dailyTrend: Array.from(trendMap.values()),
    };

    setCached(cacheKey, result);
    return result;
  }

  /**
   * 3. Report Analytics & Pipeline Health
   */
  public async getReportAnalytics(period: AnalyticsPeriod = '7d', customStart?: string, customEnd?: string) {
    const cacheKey = `reports_${period}_${customStart || ''}_${customEnd || ''}`;
    const cached = getCached<any>(cacheKey);
    if (cached) return cached;

    const range = parseAnalyticsDateRange(period, customStart, customEnd);
    const { startDate, endDate } = range;

    const [
      reportsRequested,
      reportsCompleted,
      reportsFailed,
      reportsProcessing,
      completedWithTimes,
      byTypeRaw,
      recentFailures,
    ] = await Promise.all([
      prisma.report.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      prisma.report.count({ where: { status: 'COMPLETED', createdAt: { gte: startDate, lte: endDate } } }),
      prisma.report.count({ where: { status: 'FAILED', createdAt: { gte: startDate, lte: endDate } } }),
      prisma.report.count({
        where: {
          status: { in: ['PENDING', 'QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING', 'PROCESSING'] },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.report.findMany({
        where: {
          status: 'COMPLETED',
          completedAt: { not: null },
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { createdAt: true, completedAt: true },
      }),
      prisma.report.groupBy({
        by: ['reportType', 'status'],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _count: { id: true },
      }),
      prisma.report.findMany({
        where: { status: 'FAILED', createdAt: { gte: startDate, lte: endDate } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          reportType: true,
          errorCode: true,
          errorMessage: true,
          failedAt: true,
          updatedAt: true,
          user: { select: { email: true } },
        },
      }),
    ]);

    // Calculate Average Duration in Seconds
    let totalDurationMs = 0;
    for (const r of completedWithTimes) {
      if (r.completedAt) {
        totalDurationMs += r.completedAt.getTime() - r.createdAt.getTime();
      }
    }
    const avgDurationSeconds = completedWithTimes.length > 0 ? Math.round((totalDurationMs / completedWithTimes.length) / 1000) : 0;

    const successRate = reportsRequested > 0 ? Math.round((reportsCompleted / reportsRequested) * 1000) / 10 : 0;
    const failureRate = reportsRequested > 0 ? Math.round((reportsFailed / reportsRequested) * 1000) / 10 : 0;

    // Aggregate report type breakdown
    const typeMap = new Map<string, { reportType: string; total: number; completed: number; failed: number }>();
    for (const item of byTypeRaw) {
      const existing = typeMap.get(item.reportType) || { reportType: item.reportType, total: 0, completed: 0, failed: 0 };
      existing.total += item._count.id;
      if (item.status === 'COMPLETED') existing.completed += item._count.id;
      if (item.status === 'FAILED') existing.failed += item._count.id;
      typeMap.set(item.reportType, existing);
    }

    const result = {
      period: range.periodLabel,
      metrics: {
        reportsRequested,
        reportsCompleted,
        reportsFailed,
        reportsProcessing,
        avgDurationSeconds,
        successRate,
        failureRate,
      },
      breakdownByType: Array.from(typeMap.values()),
      recentFailures: recentFailures.map((f) => ({
        id: f.id,
        userEmail: f.user?.email || 'Unknown',
        reportType: f.reportType,
        errorCode: f.errorCode || 'UNKNOWN_ERROR',
        errorMessage: f.errorMessage || 'No error details recorded',
        failedAt: f.failedAt || f.updatedAt,
      })),
    };

    setCached(cacheKey, result);
    return result;
  }

  /**
   * 4. Jyoti AI Usage Analytics
   */
  public async getJyotiAnalytics() {
    return {
      note: 'Jyoti usage analytics are limited because chat history is currently stored locally on mobile client devices.',
      conversations: 0,
      messages: 0,
      activeUsers: 0,
      geminiFailures: 0,
      averageLatencyMs: 0,
    };
  }

  /**
   * 5. Revenue Analytics
   */
  public async getRevenueAnalytics(period: AnalyticsPeriod = '7d', customStart?: string, customEnd?: string) {
    const cacheKey = `revenue_${period}_${customStart || ''}_${customEnd || ''}`;
    const cached = getCached<any>(cacheKey);
    if (cached) return cached;

    const range = parseAnalyticsDateRange(period, customStart, customEnd);
    const { startDate, endDate } = range;

    const [
      paidAggregate,
      paidOrdersCount,
      failedOrdersCount,
      pendingOrdersCount,
      refundedOrdersCount,
      byTypeRaw,
      ordersRaw,
    ] = await Promise.all([
      prisma.order.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID', createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.order.count({ where: { status: 'PAID', createdAt: { gte: startDate, lte: endDate } } }),
      prisma.order.count({ where: { status: 'FAILED', createdAt: { gte: startDate, lte: endDate } } }),
      prisma.order.count({ where: { status: 'PENDING', createdAt: { gte: startDate, lte: endDate } } }),
      prisma.order.count({ where: { status: 'REFUNDED', createdAt: { gte: startDate, lte: endDate } } }),
      prisma.order.groupBy({
        by: ['reportType', 'status'],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.order.findMany({
        where: { status: 'PAID', createdAt: { gte: startDate, lte: endDate } },
        select: { createdAt: true, amount: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const totalRevenuePaise = paidAggregate._sum.amount || 0;

    // Aggregate report type revenue breakdown
    const typeMap = new Map<string, { reportType: string; paidCount: number; revenueRupees: number }>();
    for (const item of byTypeRaw) {
      if (item.status === 'PAID') {
        const typeKey = item.reportType || 'GENERAL_PURCHASE';
        const existing = typeMap.get(typeKey) || { reportType: typeKey, paidCount: 0, revenueRupees: 0 };
        existing.paidCount += item._count.id;
        existing.revenueRupees += (item._sum.amount || 0) / 100;
        typeMap.set(typeKey, existing);
      }
    }

    // Daily trend
    const trendMap = new Map<string, { date: string; revenueRupees: number; count: number }>();
    for (const o of ordersRaw) {
      const dayKey = o.createdAt.toISOString().split('T')[0];
      const existing = trendMap.get(dayKey) || { date: dayKey, revenueRupees: 0, count: 0 };
      existing.revenueRupees += o.amount / 100;
      existing.count += 1;
      trendMap.set(dayKey, existing);
    }

    const result = {
      period: range.periodLabel,
      metrics: {
        totalRevenueRupees: totalRevenuePaise / 100,
        totalRevenuePaise,
        successfulPayments: paidOrdersCount,
        failedPayments: failedOrdersCount,
        pendingPayments: pendingOrdersCount,
        refundedPayments: refundedOrdersCount,
      },
      revenueByReportType: Array.from(typeMap.values()),
      dailyRevenue: Array.from(trendMap.values()),
    };

    setCached(cacheKey, result);
    return result;
  }

  /**
   * 6. System Health Analytics
   */
  public async getSystemHealthAnalytics(period: AnalyticsPeriod = '7d', customStart?: string, customEnd?: string) {
    const cacheKey = `system_${period}_${customStart || ''}_${customEnd || ''}`;
    const cached = getCached<any>(cacheKey);
    if (cached) return cached;

    const range = parseAnalyticsDateRange(period, customStart, customEnd);
    const { startDate, endDate } = range;

    const [
      reportFailures,
      paymentFailures,
      topErrorCodesRaw,
    ] = await Promise.all([
      prisma.report.count({ where: { status: 'FAILED', createdAt: { gte: startDate, lte: endDate } } }),
      prisma.order.count({ where: { status: 'FAILED', createdAt: { gte: startDate, lte: endDate } } }),
      prisma.report.groupBy({
        by: ['errorCode'],
        where: { status: 'FAILED', errorCode: { not: null }, createdAt: { gte: startDate, lte: endDate } },
        _count: { id: true },
        _max: { updatedAt: true },
      }),
    ]);

    const topErrors = topErrorCodesRaw.map((e) => ({
      code: e.errorCode || 'UNKNOWN_ERROR',
      occurrences: e._count.id,
      lastOccurrence: e._max.updatedAt?.toISOString() || null,
    }));

    const result = {
      period: range.periodLabel,
      metrics: {
        reportFailures,
        paymentFailures,
      },
      topErrors,
    };

    setCached(cacheKey, result);
    return result;
  }

  /**
   * 7. CSV Export Generator
   */
  public async generateExportCsv(type: 'users' | 'reports' | 'revenue', period: AnalyticsPeriod = '7d', customStart?: string, customEnd?: string): Promise<string> {
    const range = parseAnalyticsDateRange(period, customStart, customEnd);
    const { startDate, endDate } = range;

    if (type === 'users') {
      const users = await prisma.user.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { id: true, email: true, fullName: true, role: true, emailVerifiedAt: true, createdAt: true },
        take: 5000,
      });

      const rows = [
        ['ID', 'Email', 'Full Name', 'Role', 'Email Verified', 'Created At'],
        ...users.map((u) => [
          u.id,
          u.email,
          u.fullName || '',
          u.role,
          u.emailVerifiedAt ? 'Yes' : 'No',
          u.createdAt.toISOString(),
        ]),
      ];
      return rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    }

    if (type === 'reports') {
      const reports = await prisma.report.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { id: true, userId: true, reportType: true, status: true, errorCode: true, createdAt: true, completedAt: true },
        take: 5000,
      });

      const rows = [
        ['ID', 'User ID', 'Report Type', 'Status', 'Error Code', 'Created At', 'Completed At'],
        ...reports.map((r) => [
          r.id,
          r.userId,
          r.reportType,
          r.status,
          r.errorCode || '',
          r.createdAt.toISOString(),
          r.completedAt ? r.completedAt.toISOString() : '',
        ]),
      ];
      return rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    }

    if (type === 'revenue') {
      const orders = await prisma.order.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { id: true, userId: true, razorpayOrderId: true, amount: true, status: true, reportType: true, createdAt: true },
        take: 5000,
      });

      const rows = [
        ['ID', 'User ID', 'Razorpay Order ID', 'Amount (INR)', 'Status', 'Report Type', 'Created At'],
        ...orders.map((o) => [
          o.id,
          o.userId,
          o.razorpayOrderId,
          (o.amount / 100).toFixed(2),
          o.status,
          o.reportType,
          o.createdAt.toISOString(),
        ]),
      ];
      return rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    }

    throw new Error('Unsupported export type');
  }
}

export const analyticsService = new AnalyticsService();
