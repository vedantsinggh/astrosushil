/**
 * One name per customer on website and app (2026-11-26): a booking never shows a placeholder
 * such as "Valued Client" while the account, a birth profile or a phone number gives a name.
 */
import { describe, it, expect, vi } from 'vitest';
import { customerDisplayName } from '../../src/modules/birth-profiles/account-identity';

function db(user: unknown) {
  return { user: { findUnique: vi.fn(async () => user) } } as never;
}

describe('customerDisplayName', () => {
  it('prefers the name typed on the form', async () => {
    expect(await customerDisplayName(db({ fullName: 'Account Name', birthProfiles: [] }), 'u1', '  Typed Name ')).toBe('Typed Name');
  });

  it('uses the account name, then the Self/oldest birth profile, then the phone', async () => {
    expect(await customerDisplayName(db({ fullName: 'Asha Verma', birthProfiles: [{ name: 'X' }] }), 'u1')).toBe('Asha Verma');
    expect(await customerDisplayName(db({ fullName: null, phoneNumber: '+919800000000', birthProfiles: [{ name: 'Ravi Kumar' }] }), 'u1')).toBe('Ravi Kumar');
    expect(await customerDisplayName(db({ fullName: '  ', phoneNumber: '+919800000000', email: null, birthProfiles: [] }), 'u1')).toBe('+919800000000');
  });

  it('falls back to "Customer" only when nothing is known', async () => {
    expect(await customerDisplayName(db(null), 'u1')).toBe('Customer');
  });

  it('asks for the Self profile first, then the oldest', async () => {
    const findUnique = vi.fn(async () => ({ fullName: null, birthProfiles: [] }));
    await customerDisplayName({ user: { findUnique } } as never, 'u1');
    const calls = findUnique.mock.calls as unknown as Array<[{ select: { birthProfiles: { orderBy: unknown } } }]>;
    expect(calls[0][0].select.birthProfiles.orderBy).toEqual([{ isSelf: 'desc' }, { createdAt: 'asc' }]);
  });
});
