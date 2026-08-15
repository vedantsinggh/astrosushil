import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/utils/hash';

describe('Hash Utility', () => {
  it('should hash a password and verify it successfully', async () => {
    const rawPassword = 'SecurePassword123!';
    const hash = await hashPassword(rawPassword);

    expect(hash).toBeDefined();
    expect(hash).not.toEqual(rawPassword);

    const isValid = await verifyPassword(rawPassword, hash);
    expect(isValid).toBe(true);
  });

  it('should return false for incorrect password verification', async () => {
    const rawPassword = 'SecurePassword123!';
    const wrongPassword = 'WrongPassword456!';
    const hash = await hashPassword(rawPassword);

    const isValid = await verifyPassword(wrongPassword, hash);
    expect(isValid).toBe(false);
  });
});
