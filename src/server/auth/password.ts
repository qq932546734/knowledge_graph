import bcrypt from "bcrypt";

import { ApiError, ERROR_CODES } from "@/lib/errors";

const MIN_PASSWORD_LENGTH = 12;

export function validatePasswordStrength(password: string): void {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    !hasUppercase ||
    !hasLowercase ||
    !hasDigit ||
    !hasSpecial
  ) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_ERROR,
      "Password must be at least 12 chars and include upper, lower, digit, and special char.",
      400,
    );
  }
}

export async function hashPassword(password: string): Promise<string> {
  validatePasswordStrength(password);
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
