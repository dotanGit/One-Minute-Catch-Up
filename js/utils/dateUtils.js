// Delay helper (used by AI service too)
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Normalize date to start of the day
export function normalizeDateToStartOfDay(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);
  return localDate;
}

// Safely parse date
export function safeParseDate(date) {
  try {
    if (typeof date === 'string' || typeof date === 'number') {
      return new Date(date);
    } else if (date instanceof Date) {
      return new Date(date);
    }
    return new Date();
  } catch (error) {
    console.error('Error parsing date:', error);
    return new Date();
  }
}

// Safely get timestamp
export function safeGetTimestamp(date) {
  try {
    if (!date) return 0;
    if (typeof date === 'string' || typeof date === 'number') {
      date = new Date(date);
    }
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return 0;
    }
    return date.getTime();
  } catch (error) {
    console.error('Error getting timestamp:', error);
    return 0;
  }
}

// Safely convert date to ISO string
export function safeToISOString(date) {
  try {
    if (!date) return '';
    if (typeof date === 'string' || typeof date === 'number') {
      date = new Date(date);
    }
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString();
  } catch (error) {
    console.error('Error converting date to ISO string:', error);
    return '';
  }
}

// Compare dates (local timezone)
export function areDatesEqual(date1, date2) {
  const localDate1 = normalizeDateToStartOfDay(date1);
  const localDate2 = normalizeDateToStartOfDay(date2);
  return localDate1.getTime() === localDate2.getTime();
}
