import crypto from 'node:crypto';
import { prisma } from '../../services/prisma.service';
import { config } from '../../config';

export type StaffAuthScope = 'ADMIN_LOGIN' | 'PASSWORD_RESET';

const WINDOW_MINUTES = 15;
const LOCK_MINUTES = 15;
const MAX_FAILURES = 5;

function attemptId(scope: StaffAuthScope, email: string): string {
  return crypto
    .createHmac('sha256', config.JWT_SECRET)
    .update(`${scope}:${email.trim().toLowerCase()}`)
    .digest('hex');
}

/** Persistent per-staff-account throttling shared by login and password reset. */
export class StaffAuthAttemptService {
  public async isLocked(scope: StaffAuthScope, email: string): Promise<boolean> {
    const record = await prisma.staffAuthAttempt.findUnique({
      where: { id: attemptId(scope, email) },
      select: { lockedUntil: true },
    });
    return !!record?.lockedUntil && record.lockedUntil.getTime() > Date.now();
  }

  /** Atomically increments failures and starts a 15-minute lock after five within the window. */
  public async recordFailure(scope: StaffAuthScope, email: string): Promise<void> {
    const id = attemptId(scope, email);
    await prisma.$executeRaw`
      INSERT INTO "staff_auth_attempts" ("id", "attempts", "windowStartedAt", "lockedUntil", "updatedAt")
      VALUES (${id}, 1, clock_timestamp(), NULL, clock_timestamp())
      ON CONFLICT ("id") DO UPDATE SET
        "attempts" = CASE
          WHEN "staff_auth_attempts"."windowStartedAt" <= clock_timestamp() - (${WINDOW_MINUTES} * INTERVAL '1 minute') THEN 1
          ELSE "staff_auth_attempts"."attempts" + 1
        END,
        "windowStartedAt" = CASE
          WHEN "staff_auth_attempts"."windowStartedAt" <= clock_timestamp() - (${WINDOW_MINUTES} * INTERVAL '1 minute') THEN clock_timestamp()
          ELSE "staff_auth_attempts"."windowStartedAt"
        END,
        "lockedUntil" = CASE
          WHEN "staff_auth_attempts"."windowStartedAt" <= clock_timestamp() - (${WINDOW_MINUTES} * INTERVAL '1 minute') THEN NULL
          WHEN "staff_auth_attempts"."attempts" + 1 >= ${MAX_FAILURES} THEN clock_timestamp() + (${LOCK_MINUTES} * INTERVAL '1 minute')
          ELSE "staff_auth_attempts"."lockedUntil"
        END,
        "updatedAt" = clock_timestamp()
    `;
  }

  public async clear(scope: StaffAuthScope, email: string): Promise<void> {
    await prisma.staffAuthAttempt.deleteMany({ where: { id: attemptId(scope, email) } });
  }
}

export const staffAuthAttemptService = new StaffAuthAttemptService();
