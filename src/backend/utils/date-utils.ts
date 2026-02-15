/**
 * Parses SQLite datetime strings correctly as UTC.
 *
 * SQLite CURRENT_TIMESTAMP returns UTC (e.g., "2025-02-15 14:30:45").
 * The timestamp is stored without timezone info, so we must parse it as UTC
 * to match SQLite's CURRENT_TIMESTAMP semantics.
 *
 * @param timestamp - The timestamp string from SQLite
 * @returns Date object or null if input is null/undefined
 */
export function parseSqliteDateTime(timestamp: string | null | undefined): Date | null {
  if (!timestamp) {
    return null;
  }

  const sqliteFormat = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
  if (sqliteFormat.test(timestamp)) {
    const [datePart, timePart] = timestamp.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);

    // Parse SQLite format as UTC to match CURRENT_TIMESTAMP semantics
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  }

  return new Date(timestamp);
}

/**
 * Parses required SQLite datetime fields (non-nullable).
 *
 * Use this for database fields that are always present (created_at, updated_at, added_at).
 * Throws an error if the timestamp is missing or invalid.
 *
 * @param timestamp - The timestamp string from SQLite (must not be null/undefined)
 * @returns Date object
 * @throws Error if timestamp is null/undefined
 */
export function parseRequiredSqliteDateTime(timestamp: string | null | undefined): Date {
  const date = parseSqliteDateTime(timestamp);
  if (!date) {
    throw new Error('Required timestamp is missing or invalid');
  }
  return date;
}
