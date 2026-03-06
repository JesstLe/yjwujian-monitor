import { db } from '../db/index';

/**
 * Clean up expired tokens from database
 * Should be called periodically (e.g., hourly)
 */
export function cleanupExpiredTokens(): {
  emailTokensDeleted: number;
  blacklistDeleted: number;
  loginAttemptsDeleted: number;
} {
  // Clean expired email tokens
  const emailTokensResult = db
    .prepare("DELETE FROM email_tokens WHERE expires_at < datetime('now')")
    .run();

  // Clean expired blacklist entries
  const blacklistResult = db
    .prepare("DELETE FROM token_blacklist WHERE expires_at < datetime('now')")
    .run();

  // Clean old login attempts (older than 7 days)
  const loginAttemptsResult = db
    .prepare("DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-7 days')")
    .run();

  return {
    emailTokensDeleted: emailTokensResult.changes,
    blacklistDeleted: blacklistResult.changes,
    loginAttemptsDeleted: loginAttemptsResult.changes,
  };
}

/**
 * Schedule periodic cleanup
 */
export function startCleanupScheduler(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
  // Run cleanup immediately on start
  const result = cleanupExpiredTokens();
  console.log('[Cleanup] Initial cleanup:', result);

  // Schedule periodic cleanup
  return setInterval(() => {
    const result = cleanupExpiredTokens();
    console.log('[Cleanup] Periodic cleanup:', result);
  }, intervalMs);
}
