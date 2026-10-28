import { describe, expect, it } from 'vitest';
import { changePasswordSchema } from './schemas';

describe('changePasswordSchema', () => {
  it('accepts a valid password change', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'password123',
      newPassword: 'new-password-456',
      confirmPassword: 'new-password-456',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a confirmation mismatch', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'password123',
      newPassword: 'new-password-456',
      confirmPassword: 'new-password-789',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a password equal to the current one', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'password123',
      newPassword: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects passwords shorter than eight characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'password123',
      newPassword: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
  });
});
