import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('密码至少需要 8 个字符');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('密码需要包含小写字母');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('密码需要包含大写字母');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('密码需要包含数字');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
