/**
 * Account profile completeness rules.
 *
 * The backend is the single source of truth for whether an account still needs
 * details before the user can continue into the app. Clients must read
 * `profileComplete` / `missingProfileFields` from the auth responses instead of
 * guessing locally.
 *
 * Required details mirror what the sign-up flows already collect:
 * - `fullName`: the register screen requires a full name.
 * - `phoneNumber`: a phone number verified by OTP (the phone login flow only
 *   ever stores phone numbers after OTP verification, so an unverified number
 *   is treated as missing).
 */
export type ProfileField = 'fullName' | 'phoneNumber';

export interface ProfileCompletenessInput {
  fullName?: string | null;
  phoneNumber?: string | null;
  phoneVerifiedAt?: Date | string | null;
}

export function getMissingProfileFields(user: ProfileCompletenessInput): ProfileField[] {
  const missing: ProfileField[] = [];
  if (!user.fullName || user.fullName.trim().length === 0) {
    missing.push('fullName');
  }
  if (!user.phoneNumber || !user.phoneVerifiedAt) {
    missing.push('phoneNumber');
  }
  return missing;
}

export function isProfileComplete(user: ProfileCompletenessInput): boolean {
  return getMissingProfileFields(user).length === 0;
}
