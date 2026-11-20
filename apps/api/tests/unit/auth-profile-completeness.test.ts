import { describe, it, expect } from 'vitest';
import { getMissingProfileFields, isProfileComplete } from '../../src/modules/auth/profile-completeness';
import { checkGoogleAudience, parseGoogleClientIds } from '../../src/modules/auth/google-auth.service';

describe('Account profile completeness', () => {
  it('requires a name and an OTP-verified phone number', () => {
    expect(getMissingProfileFields({})).toEqual(['fullName', 'phoneNumber']);
    expect(
      getMissingProfileFields({ fullName: 'Asha', phoneNumber: '+919700011122', phoneVerifiedAt: new Date() })
    ).toEqual([]);
  });

  it('treats a blank name as missing', () => {
    expect(
      getMissingProfileFields({ fullName: '   ', phoneNumber: '+919700011122', phoneVerifiedAt: new Date() })
    ).toEqual(['fullName']);
  });

  it('treats an unverified phone number as missing', () => {
    expect(getMissingProfileFields({ fullName: 'Asha', phoneNumber: '+919700011122', phoneVerifiedAt: null })).toEqual([
      'phoneNumber',
    ]);
    expect(isProfileComplete({ fullName: 'Asha', phoneNumber: '+919700011122' })).toBe(false);
  });
});

describe('Google ID token audience check', () => {
  it('parses comma-separated client IDs', () => {
    expect(parseGoogleClientIds(' a.apps.googleusercontent.com , ,b.apps.googleusercontent.com')).toEqual([
      'a.apps.googleusercontent.com',
      'b.apps.googleusercontent.com',
    ]);
    expect(parseGoogleClientIds(undefined)).toEqual([]);
  });

  it('accepts only configured audiences', () => {
    const allowed = ['web.apps.googleusercontent.com', 'ios.apps.googleusercontent.com'];
    expect(checkGoogleAudience('web.apps.googleusercontent.com', allowed, true)).toBe('accepted');
    expect(checkGoogleAudience('other-app.apps.googleusercontent.com', allowed, true)).toBe('rejected');
    expect(checkGoogleAudience(undefined, allowed, false)).toBe('rejected');
  });

  it('fails closed in production when no client IDs are configured', () => {
    expect(checkGoogleAudience('anything', [], true)).toBe('not_configured');
    expect(checkGoogleAudience('anything', [], false)).toBe('accepted');
  });
});
