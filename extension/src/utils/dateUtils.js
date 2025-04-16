// Delay helper (used by AI service too)
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Normalize date to start of UTC day (00:00:00 UTC)
export function normalizeDateToStartOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
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

// Convert to UTC timestamp in ms
export function safeGetTimestamp(input) {
  const d = safeParseDate(input);
  return d.getTime();
}

// Safely convert to ISO (UTC)
export function safeToISOString(input) {
  return safeParseDate(input).toISOString();
}

// Compare two dates by UTC day only
export function areDatesEqual(date1, date2) {
  const d1 = normalizeDateToStartOfDay(date1).getTime();
  const d2 = normalizeDateToStartOfDay(date2).getTime();
  return d1 === d2;
}


// Normalize timestamp to UTC millis
export function normalizeTimestamp(input) {
  if (!input) return 0;

  if (typeof input === 'number') return Math.floor(input); // 🔒 force integer

  const parsed = Date.parse(input);
  return isNaN(parsed) ? 0 : parsed;
}


