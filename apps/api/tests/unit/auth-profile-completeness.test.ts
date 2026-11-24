import { describe, it, expect } from 'vitest';
import { getMissingProfileFields, isProfileComplete } from '../../src/modules/auth/profile-completeness';

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

