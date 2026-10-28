import { describe, expect, it } from 'vitest';
import {
  changeEmailSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  twoFactorCodeSchema,
} from './schemas';

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

describe('recovery schemas', () => {
  it('accepts a valid forgot-password address', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'author@example.com' }).success).toBe(
      true,
    );
    expect(forgotPasswordSchema.safeParse({ email: 'not-an-email' }).success).toBe(
      false,
    );
  });

  it('accepts a reset password only when both fields match', () => {
    expect(
      resetPasswordSchema.safeParse({
        newPassword: 'new-password-456',
        confirmPassword: 'new-password-456',
      }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        newPassword: 'new-password-456',
        confirmPassword: 'different-789',
      }).success,
    ).toBe(false);
  });

  it('requires a current password for an email change', () => {
    expect(
      changeEmailSchema.safeParse({
        newEmail: 'new@example.com',
        currentPassword: 'password123',
      }).success,
    ).toBe(true);
    expect(
      changeEmailSchema.safeParse({
        newEmail: 'new@example.com',
        currentPassword: '',
      }).success,
    ).toBe(false);
  });

  it('accepts only six-digit email codes', () => {
    expect(twoFactorCodeSchema.safeParse({ code: '123456' }).success).toBe(true);
    expect(twoFactorCodeSchema.safeParse({ code: '12345' }).success).toBe(false);
    expect(twoFactorCodeSchema.safeParse({ code: 'abcdef' }).success).toBe(false);
  });
});
