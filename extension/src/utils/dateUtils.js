// Delay helper (used by AI service too)
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// ✅ Normalize date to start of LOCAL day (00:00:00 in user's timezone)
export function normalizeDateToStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ✅ Compare two dates by LOCAL day only
export function areDatesEqual(date1, date2) {
  const d1 = normalizeDateToStartOfDay(date1).getTime();
  const d2 = normalizeDateToStartOfDay(date2).getTime();
  return d1 === d2;
}

// Safely parse any date-like input
export function safeParseDate(input) {
  try {
    if (!input) return new Date();
    const date = new Date(input);
    return isNaN(date.getTime()) ? new Date() : date;
  } catch {
    return new Date();
  }
}

// Convert to timestamp in ms (still UTC under the hood, but used consistently)
export function safeGetTimestamp(input) {
  const d = safeParseDate(input);
  return d.getTime();
}

// Safely convert to ISO (will still show in UTC, but okay for external APIs)
export function safeToISOString(input) {
  return safeParseDate(input).toISOString();
}

// Normalize timestamp to integer millis
export function normalizeTimestamp(input) {
  if (!input) return 0;

  if (typeof input === 'number') return Math.floor(input); // 🔒 force integer

  const parsed = Date.parse(input);
  return isNaN(parsed) ? 0 : parsed;
}
