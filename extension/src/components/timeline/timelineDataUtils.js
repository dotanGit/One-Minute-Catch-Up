import { normalizeDateToStartOfDay, normalizeTimestamp } from '../../utils/dateUtils.js';
import { getBrowserHistoryService } from '../../services/browserHistoryService.js';
import { getDownloadsService } from '../../services/downloadService.js';
import { sessionManager } from './sessionManager.js';

const brandSessionMap = new Map();

export function getDateKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // local date string
}


function filterByLocalDay(events, getTs, targetDate) {
  const start = normalizeDateToStartOfDay(targetDate);
  const startMs = start.getTime();
  const endMs = startMs + 86400000;

  return events.filter(e => {
    const raw = normalizeTimestamp(getTs(e));
    const ts = new Date(raw).getTime(); // Local time interpretation
    return ts >= startMs && ts < endMs;
  });
}

export function filterAllByDate(data, date) {
  return {
    history: filterByLocalDay(data.history || [], e => e.lastVisitTime, date),
    drive: {
      files: filterByLocalDay(data.drive?.files || [], f => f.modifiedTime, date)
    },
    emails: {
      all: filterByLocalDay(data.emails?.all || [], e => e.timestamp, date)
    },
    calendar: {
      today: filterByLocalDay(data.calendar?.today || [], e => e.start?.dateTime || e.start?.date, date),
      tomorrow: filterByLocalDay(data.calendar?.tomorrow || [], e => e.start?.dateTime || e.start?.date, date)
    },
    downloads: filterByLocalDay(data.downloads || [], d => d.startTime, date)
  };
}

export function mergeUniqueById(baseArray, deltaArray, getId) {
  const seen = new Set(baseArray.map(getId));
  const merged = [...baseArray];
  for (const item of deltaArray) {
    if (!seen.has(getId(item))) {
      seen.add(getId(item));
      merged.push(item);
    }
  }
  return merged;
}

export function mergeTimelineData(base, delta) {
  base.history = mergeUniqueById(base.history, delta.history, e => e.id);
  base.drive.files = mergeUniqueById(base.drive.files, delta.drive.files, f => f.id);
  base.emails.all = mergeUniqueById(base.emails.all, delta.emails.all, e => e.id);
  base.calendar.today = mergeUniqueById(base.calendar.today, delta.calendar.today, e => e.id);
  base.calendar.tomorrow = mergeUniqueById(base.calendar.tomorrow, delta.calendar.tomorrow, e => e.id);
  base.downloads = mergeUniqueById(base.downloads, delta.downloads, d => d.id);
}

export async function getIncrementalDataSince(timestamp) {
  const since = new Date(timestamp);
  const start = performance.now();
  console.log(`🕒 Fetching incremental data since ${since.toISOString()}`);

  const logApiTime = async (label, fn) => {
    const s = performance.now();
    const res = await fn;
    console.log(`⏱️ ${label} took ${Math.round(performance.now() - s)}ms`);
    return res;
  };

  const [history, downloads] = await Promise.all([
    logApiTime('History', getBrowserHistoryService(since)),
    logApiTime('Downloads', getDownloadsService(since)),
  ]);

  console.log(`✅ Total delta fetch took ${Math.round(performance.now() - start)}ms`);

  return { history, downloads };
}

export async function getHiddenIdsSet() {
  return new Promise(resolve => {
    chrome.storage.local.get(['hiddenEventIds'], result => {
      resolve(new Set(result.hiddenEventIds || []));
    });
  });
}

export function filterHiddenEvents(data, hiddenIds) {
  return {
    history: (data.history || []).filter(e => !hiddenIds.has(e.id)),
    drive: { files: (data.drive?.files || []).filter(f => !hiddenIds.has(f.id)) },
    emails: { all: (data.emails?.all || []).filter(e => !hiddenIds.has(e.id)) },
    calendar: {
      today: (data.calendar?.today || []).filter(e => !hiddenIds.has(e.id)),
      tomorrow: (data.calendar?.tomorrow || []).filter(e => !hiddenIds.has(e.id))
    },
    downloads: (data.downloads || []).filter(d => !hiddenIds.has(String(d.id)))
  };
}

export function filterBrowserBySession(events, sessionMs = 30 * 60 * 1000) {
  // Update session timeout if different
  if (sessionMs !== sessionManager.sessionTimeoutMs) {
    sessionManager.sessionTimeoutMs = sessionMs;
  }

  // Clean up old sessions first
  sessionManager.cleanupOldSessions();
  
  const result = [];
  let filteredCount = 0;
  let createdCount = 0;

  for (const event of events) {
    try {
      const eventTime = normalizeTimestamp(event.lastVisitTime);
      const processResult = sessionManager.processVisit(event.url, eventTime);
      
      if (processResult.shouldCreateEvent) {
        result.push(event);
        createdCount++;
        console.log(`[SESSION] ✅ Created event for ${sessionManager.extractDomain(event.url)} (${processResult.reason})`);
      } else {
        filteredCount++;
        console.log(`[SESSION] 🚫 Filtered out ${sessionManager.extractDomain(event.url)} (${processResult.reason})`);
      }
    } catch (error) {
      console.error('[SESSION] ❌ Error processing event:', error);
      // Include the event if we can't process it
      result.push(event);
    }
  }

  console.log(`[SESSION] 📊 Session filtering complete: ${createdCount} created, ${filteredCount} filtered`);
  return result;
}

export function extractBrandKey(url) {
  const hostname = new URL(url).hostname.replace(/^www\./, '');
  const parts = hostname.split('.');
  return parts.length >= 2 ? parts[parts.length - 2] : hostname;
}

export { brandSessionMap };
