import { prisma } from '../../services/prisma.service';
import { NotFoundError, ValidationError } from '../../errors/app-error';
import { BookingStatus, SlotStatus, EntitlementStatus } from '@prisma/client';
import { verifyPassword } from '../../utils/hash';
import { logger } from '../../utils/logger';
import { DeleteAccountInput, DeleteAccountResponse } from './users.schemas';

export class UsersService {
  public async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        googleId: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || (!user.email && !user.phoneNumber && !user.googleId)) {
      throw new NotFoundError('User profile not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  /**
   * Self-service account deletion and personal data erasure.
   *
   * Responsibilities:
   * 1. Derives target identity exclusively from authenticated user session.
   * 2. Scrubs all personally identifiable information (PII) from User record.
   * 3. Deletes birth profiles, natal charts, and generated reports.
   * 4. Cancels future consultations and returns locked appointment slots to AVAILABLE.
   * 5. Revokes courses and digital product entitlements.
   * 6. Deletes saved shipping addresses and scrubs order personal notes.
   * 7. Preserves legally mandated financial and transaction history (Orders, OrderItems, Refunds)
   *    in accordance with statutory tax/GST audit requirements (8-year retention).
   * 8. Revokes all active refresh tokens, push notification device tokens, and OTP records.
   * 9. Records immutable compliance audit log.
   */
  public async deleteOwnAccount(
    userId: string,
    input: DeleteAccountInput = {},
    clientIp?: string
  ): Promise<DeleteAccountResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    // Idempotent replay: if already deleted/anonymized, return cleanly
    const isAlreadyDeleted = !user.email && !user.phoneNumber && !user.googleId;
    if (isAlreadyDeleted) {
      return {
        success: true,
        message: 'Account has already been deleted and personal data removed.',
        deletedAt: user.updatedAt.toISOString(),
      };
    }

    // Reauthentication check: if user has a password and a password was provided, verify it
    if (user.passwordHash && input.password) {
      const isMatch = await verifyPassword(input.password, user.passwordHash);
      if (!isMatch) {
        throw new ValidationError('Invalid confirmation password');
      }
    }

    const now = new Date();

    // Execute deletion, anonymization, and scrubbing in a single atomic transaction
    await prisma.$transaction(async (tx) => {
      // 1. Cancel and release active/future consultation bookings
      const activeBookings = await tx.consultationBooking.findMany({
        where: {
          userId,
          status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED] },
        },
      });

      for (const booking of activeBookings) {
        await tx.consultationBooking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancellationReason: 'USER_ACCOUNT_DELETED',
            cancelledAt: now,
            customerPhone: null,
            customerEmail: null,
            primaryQuestion: '[DELETED UPON USER ACCOUNT DELETION]',
          },
        });

        // Release slot if future
        await tx.appointmentSlot.updateMany({
          where: { bookingId: booking.id },
          data: { status: SlotStatus.AVAILABLE, bookingId: null, lockedUntil: null },
        });
      }

      // Anonymize personal details on any remaining/past bookings
      await tx.consultationBooking.updateMany({
        where: { userId },
        data: {
          customerPhone: null,
          customerEmail: null,
          primaryQuestion: '[DELETED UPON USER ACCOUNT DELETION]',
        },
      });

      // 2. Delete user's birth profiles (which cascade-deletes reports linked to them)
      await tx.birthProfile.deleteMany({
        where: { userId },
      });

      // Also ensure any orphan reports for user are removed
      await tx.report.deleteMany({
        where: { userId },
      });

      // 3. Revoke course entitlements & delete learning progress
      await tx.courseEntitlement.updateMany({
        where: { userId, status: EntitlementStatus.ACTIVE },
        data: { status: EntitlementStatus.REVOKED },
      });
      await tx.lessonProgress.deleteMany({
        where: { userId },
      });

      // 4. Revoke digital product downloads
      await tx.digitalProductEntitlement.updateMany({
        where: { userId, status: EntitlementStatus.ACTIVE },
        data: { status: EntitlementStatus.REVOKED },
      });

      // 5. Delete or anonymize saved shipping addresses
      await tx.shippingAddress.deleteMany({
        where: { userId },
      });

      // 6. Scrub customer notes on orders while retaining financial transaction records
      await tx.order.updateMany({
        where: { userId },
        data: { notes: null },
      });

      // 7. Revoke active refresh tokens, device push tokens, and notification preferences
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.deviceToken.deleteMany({
        where: { userId },
      });
      await tx.otpVerification.deleteMany({
        where: { userId },
      });
      await tx.notificationPreference.deleteMany({
        where: { userId },
      });
      await tx.notification.deleteMany({
        where: { userId },
      });

      // 8. Anonymize User record (retain ID for Order/Refund integrity, but strip all PII)
      await tx.user.update({
        where: { id: userId },
        data: {
          email: null,
          phoneNumber: null,
          fullName: 'Deleted User',
          googleId: null,
          passwordHash: null,
          phoneVerifiedAt: null,
          emailVerifiedAt: null,
        },
      });

      // 9. Record immutable compliance Audit Log
      await tx.auditLog.create({
        data: {
          adminId: userId,
          adminEmail: 'SELF_SERVICE_USER',
          action: 'USER_ACCOUNT_DELETED',
          resource: `User:${userId}`,
          details: JSON.stringify({
            event: 'SELF_SERVICE_ACCOUNT_DELETION',
            deletedAt: now.toISOString(),
            piiScrubbed: true,
            birthProfilesDeleted: true,
            reportsDeleted: true,
            entitlementsRevoked: true,
            sessionsRevoked: true,
            financialRecordsRetained: true,
          }),
          ipAddress: clientIp || '127.0.0.1',
        },
      });
    });

    logger.info(
      { userId, event: 'USER_ACCOUNT_DELETED' },
      'User account successfully deleted, PII scrubbed, and sessions revoked'
    );

    return {
      success: true,
      message: 'Account and personal data successfully deleted and anonymized. All active sessions have been revoked.',
      deletedAt: now.toISOString(),
    };
  }
}

export const usersService = new UsersService();
