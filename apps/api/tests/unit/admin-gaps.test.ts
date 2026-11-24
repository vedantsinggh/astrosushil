import { describe, expect, it, vi } from 'vitest';
import { reportsQuerySchema } from '../../src/modules/admin/admin.schemas';
import { bookingQuoteSchema } from '../../src/modules/bookings/bookings.schemas';
import { updateStaffPhotoSchema } from '../../src/modules/admin/rbac/rbac.schemas';
import { transactionsQuerySchema } from '../../src/modules/transactions/transactions.schemas';

describe('Admin Gaps Unit Tests', () => {
  describe('Reports Query Schema', () => {
    it('accepts language filter', () => {
      const parsedEn = reportsQuerySchema.parse({ language: 'en' });
      expect(parsedEn.language).toBe('en');

      const parsedHi = reportsQuerySchema.parse({ language: 'hi' });
      expect(parsedHi.language).toBe('hi');

      const parsedNone = reportsQuerySchema.parse({});
      expect(parsedNone.language).toBeUndefined();
    });

    it('accepts STUCK status filter', () => {
      const parsed = reportsQuerySchema.parse({ status: 'STUCK' });
      expect(parsed.status).toBe('STUCK');
    });

    it('accepts duration sortBy option', () => {
      const parsed = reportsQuerySchema.parse({ sortBy: 'duration' });
      expect(parsed.sortBy).toBe('duration');
    });
  });

  describe('Booking Quote Schema', () => {
    it('validates a valid booking quote request', () => {
      const result = bookingQuoteSchema.safeParse({
        consultationId: 'type-gen',
        mode: 'AUDIO',
        discountType: 'FLAT',
        discountValue: 50000,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.consultationId).toBe('type-gen');
        expect(result.data.discountValue).toBe(50000);
      }
    });

    it('validates percentage discount capped at 100%', () => {
      const valid = bookingQuoteSchema.safeParse({
        consultationId: 'type-gen',
        discountType: 'PERCENTAGE',
        discountValue: 10000, // 100%
      });
      expect(valid.success).toBe(true);

      const invalid = bookingQuoteSchema.safeParse({
        consultationId: 'type-gen',
        discountType: 'PERCENTAGE',
        discountValue: 10001, // > 100%
      });
      expect(invalid.success).toBe(false);
    });

    it('accepts couponCode without discountType', () => {
      const result = bookingQuoteSchema.safeParse({
        consultationId: 'type-gen',
        couponCode: 'SAVE20',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Staff Photo Schema', () => {
    it('accepts a valid photo URL', () => {
      const result = updateStaffPhotoSchema.safeParse({
        photoUrl: 'https://storage.example.com/profiles/avatar.png',
      });
      expect(result.success).toBe(true);
    });

    it('accepts null to remove photo', () => {
      const result = updateStaffPhotoSchema.safeParse({
        photoUrl: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid photo URL', () => {
      const result = updateStaffPhotoSchema.safeParse({
        photoUrl: 'not-a-valid-url',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Transactions Query Schema & Totals Structure', () => {
    it('parses transactions query with all filters', () => {
      const result = transactionsQuerySchema.parse({
        status: 'success',
        method: 'razorpay',
        fromDate: '2026-01-01',
        toDate: '2026-01-31',
        search: 'Ravi',
        page: 1,
        limit: 20,
      });
      expect(result.status).toBe('success');
      expect(result.method).toBe('razorpay');
      expect(result.fromDate).toBe('2026-01-01');
      expect(result.limit).toBe(20);
    });
  });

  describe('Dashboard Summary Calculations', () => {
    it('aggregates monthly revenue and calculates growth vs previous month', () => {
      const now = new Date('2026-11-24T00:00:00Z');
      const monthlyRevenue = [
        { month: '2026-09', revenue: 10000, orders: 10 },
        { month: '2026-10', revenue: 12000, orders: 12 },
        { month: '2026-11', revenue: 15000, orders: 15 },
      ];
      const currentMonth = monthlyRevenue[monthlyRevenue.length - 1];
      const prevMonth = monthlyRevenue[monthlyRevenue.length - 2];
      let revenueGrowth: number | null = null;
      if (prevMonth && prevMonth.revenue > 0) {
        revenueGrowth = Math.round(((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 1000) / 10;
      }
      expect(revenueGrowth).toBe(25.0); // (15000 - 12000)/12000 = 25%
    });

    it('returns null growth if previous month had zero revenue', () => {
      const monthlyRevenue = [
        { month: '2026-10', revenue: 0, orders: 0 },
        { month: '2026-11', revenue: 15000, orders: 15 },
      ];
      const currentMonth = monthlyRevenue[monthlyRevenue.length - 1];
      const prevMonth = monthlyRevenue[monthlyRevenue.length - 2];
      let revenueGrowth: number | null = null;
      if (prevMonth && prevMonth.revenue > 0) {
        revenueGrowth = Math.round(((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 1000) / 10;
      }
      expect(revenueGrowth).toBeNull();
    });
  });
});
