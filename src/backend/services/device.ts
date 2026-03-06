import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
  fingerprint: string;
  name: string;
  browser: string;
  os: string;
}

/**
 * Parse user agent string and extract device information
 */
export function parseUserAgent(userAgent: string): DeviceInfo {
  // Use UAParser class instance (v2.x API)
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const browser = result.browser.name || 'Unknown Browser';
  const browserVersion = result.browser.version || '';
  const os = result.os.name || 'Unknown OS';
  const osVersion = result.os.version || '';

  const name = `${browser} on ${os}`;

  return {
    fingerprint: generateFingerprint(userAgent, os, browser),
    name,
    browser: `${browser} ${browserVersion}`.trim(),
    os: `${os} ${osVersion}`.trim(),
  };
}

/**
 * Generate a device fingerprint based on user agent, OS, and browser
 */
function generateFingerprint(
  userAgent: string,
  os: string,
  browser: string,
): string {
  // Simple fingerprint based on UA, OS, and browser
  const data = `${userAgent}|${os}|${browser}`;

  // Simple hash function (djb2 variant)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
