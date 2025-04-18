// ===== Imports =====
import {
    normalizeDateToStartOfDay,
    normalizeTimestamp,
    safeGetTimestamp
  } from '../../utils/dateUtils.js';
  import { buildTimeline, prependTimeline } from './timelineRenderer.js';
  import { getDownloadsService } from '../../services/downloadService.js';
  import { getBrowserHistoryService } from '../../services/browserHistoryService.js';
  import { getGmailActivity } from '../../services/gmailService.js';
  import { getCalendarEvents } from '../../services/calendarService.js';
  import { getDriveActivity } from '../../services/driveService.js';
  import { initTimelineScroll } from './timelineScroll.js';


  
  // ===== Global Variables =====
  const loadingSection = document.getElementById('loading');
  const timelineEvents = document.getElementById('timeline-events');
  const timelineWrapper = document.querySelector('.timeline-wrapper');
  window.globalStartTime = null;
  
  export let currentDate = normalizeDateToStartOfDay(new Date());
  export let oldestLoadedDate = new Date(currentDate);
  export let isLoadingMorePastDays = { value: false }; // make it reactive for scroll module

  window.loadedEventKeys = window.loadedEventKeys || new Set();


// ===== Helper Functions =====
  function getDateKey(date) {
    return date.toISOString().split('T')[0];
  }
  
  
  function filterByUTCDate(events, getTs, targetDate) {
    const start = normalizeDateToStartOfDay(targetDate);
    const startMs = start.getTime();
    const endMs = startMs + 86400000; // 24 hours later (exclusive upper bound)
  
    return events.filter(e => {
      const ts = Math.floor(normalizeTimestamp(getTs(e)));
      return ts >= startMs && ts < endMs; // ✅ use exclusive end
    });
  }


  function filterAllByDate(data, date) {
    return {
      history: filterByUTCDate(data.history || [], e => e.lastVisitTime, date),
      drive: {
        files: filterByUTCDate(data.drive?.files || [], f => f.modifiedTime, date)
      },
      emails: {
        all: filterByUTCDate(data.emails?.all || [], e => e.timestamp, date)
      },
      calendar: {
        today: filterByUTCDate(data.calendar?.today || [], e => e.start?.dateTime || e.start?.date, date),
        tomorrow: filterByUTCDate(data.calendar?.tomorrow || [], e => e.start?.dateTime || e.start?.date, date)
      },
      downloads: filterByUTCDate(data.downloads || [], d => d.startTime, date)
    };
  }
  
    
  function filterNewEvents(events, getKey) {
    return events.filter(e => {
      const key = getKey(e);
      if (window.loadedEventKeys.has(key)) {
        return false;
      }
      window.loadedEventKeys.add(key);
      return true;
    });
  }
  

  function markAllEventKeys(filteredData) {
    const mark = (arr, getKey) => {
      arr.forEach(e => {
        const key = String(getKey(e));
        if (key) window.loadedEventKeys.add(key);
      });
    };
  
    mark(filteredData.history, e => e.id);
    mark(filteredData.drive.files, f => f.id);
    mark(filteredData.emails.all, e => e.id);
    mark(filteredData.calendar.today, e => e.id);
    mark(filteredData.downloads, d => d.id);
  }
  

  // Variable to store the last visit timestamp for each brand for the browser history 
  const brandSessionMap = new Map(); 

  function extractBrandKey(url) {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    return parts.length >= 2 ? parts[parts.length - 2] : hostname;
  }

  function filterBrowserBySession(events, sessionMs = 15 * 60 * 1000) {
    const now = Date.now();
    const result = [];
  
    for (const event of events) {
      try {
        const eventTime = normalizeTimestamp(event.lastVisitTime);
        const brand = extractBrandKey(event.url);
        const lastSeen = brandSessionMap.get(brand);
  
        if (!lastSeen || eventTime - lastSeen > sessionMs) {
          brandSessionMap.set(brand, eventTime);
          result.push(event);
        }
      } catch {
        // skip bad URLs
      }
    }
  
    // Cleanup: remove brands not seen for a while
    for (const [brand, timestamp] of brandSessionMap.entries()) {
      if (now - timestamp > sessionMs) {
        brandSessionMap.delete(brand);
      }
    }
  
    return result;
  }
  


  // Helper to get hidden IDs
async function getHiddenIdsSet() {
  return new Promise(resolve => {
    chrome.storage.local.get(['hiddenEventIds'], result => {
      resolve(new Set(result.hiddenEventIds || []));
    });
  });
}

// Helper to filter hidden events by type
function filterHiddenEvents(data, hiddenIds) {
  return {
    history: (data.history || []).filter(e => !hiddenIds.has(e.id)),
    drive: { files: (data.drive?.files || []).filter(f => !hiddenIds.has(f.id)) },
    emails: { all: (data.emails?.all || []).filter(e => !hiddenIds.has(e.threadId)) },
    calendar: {
      today: (data.calendar?.today || []).filter(e => !hiddenIds.has(e.id)),
      tomorrow: (data.calendar?.tomorrow || []).filter(e => !hiddenIds.has(e.id))
    },
    downloads: (data.downloads || []).filter(d => !hiddenIds.has(String(d.id)))
  };
}


// ===== Cache Logic =====
const timelineCache = {
    maxEntries: 7,
    
    async get(dateKey) {
        try {
            const result = await chrome.storage.local.get(dateKey);
            return result[dateKey];
        } catch (error) {
            console.error('Cache read error:', error);
            return null;
        }
    },
    
    async set(dateKey, data) {
        try {
            // Get all keys to manage maxEntries
            const allKeys = await chrome.storage.local.get(null);
            const cacheKeys = Object.keys(allKeys).filter(key => key.startsWith('timeline_'));
            
            // Remove oldest entries if we exceed maxEntries
            if (cacheKeys.length >= this.maxEntries) {
                const oldestKeys = cacheKeys
                    .sort()
                    .slice(0, cacheKeys.length - this.maxEntries + 1);
                await chrome.storage.local.remove(oldestKeys);
            }

            // Save new data
            await chrome.storage.local.set({
                [dateKey]: {
                    timestamp: Date.now(),
                    data: data,
                    date: dateKey.split('_')[1] // Store the date for comparison
                }
            });
        } catch (error) {
            console.error('Cache write error:', error);
        }
    },

    async isValid(dateKey) {
        try {
            const entry = await this.get(dateKey);
            if (!entry) return false;

            // Get the date from the cache key
            const cacheDate = new Date(entry.date);
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);

            // If it's a previous day, cache is always valid
            if (cacheDate < today) {
                return true;
            }

            // For today, use 30-minute cache
            const age = Date.now() - entry.timestamp;
            const isValid = age < 30 * 60 * 1000; // 30 minutes
            console.log(`Cache age for today: ${Math.round(age / 1000 / 60)} minutes`);
            return isValid;

        } catch (error) {
            console.error('Cache validation error:', error);
            return false;
        }
    }
};


// ===== Timeline Functions =====
export function showTimeline(isFirstLogin = false) {
    const loginSection = document.getElementById('login-section');
    const loadingSection = document.getElementById('loading');
    const timelineWrapper = document.querySelector('.timeline-wrapper');
    const container = document.querySelector('.timeline-container');
    
    if (loginSection) loginSection.style.display = 'none';
    
    if (isFirstLogin) {
        // Show loading animation only during first login
        if (loadingSection) loadingSection.style.display = 'flex';
        
        // After 6 seconds, hide loading and show timeline
        setTimeout(() => {
            if (loadingSection) loadingSection.style.display = 'none';
            if (timelineWrapper) {
                timelineWrapper.style.display = 'block';
                timelineWrapper.style.visibility = 'visible';
            }
            if (container) {
                container.scrollLeft = container.scrollWidth;
            }
        }, 10000);
    } else {
        // For regular loads, just show timeline immediately
        if (loadingSection) loadingSection.style.display = 'none';
        if (timelineWrapper) {
            timelineWrapper.style.display = 'block';
            timelineWrapper.style.visibility = 'visible';
        }
        if (container) {
            container.scrollLeft = container.scrollWidth;
        }
    }
}


export async function initTimeline() {
  try {
    const today = normalizeDateToStartOfDay(new Date());
    window.loadedEventKeys = new Set();
    oldestLoadedDate = new Date(today);
    const dateKey = `timeline_${getDateKey(today)}`;
    const hiddenIds = await getHiddenIdsSet();

    let filteredData;
    const isValidCache = await timelineCache.isValid(dateKey);
    if (isValidCache) {
      const cachedData = await timelineCache.get(dateKey);
      const raw = cachedData.data;
      const cleaned = filterHiddenEvents(raw, hiddenIds);
      filteredData = filterAllByDate(cleaned, today);
    } else {
      const [history, drive, emails, calendar, downloads] = await Promise.all([
        getBrowserHistoryService(today),
        getDriveActivity(today),
        getGmailActivity(today),
        getCalendarEvents(today),
        getDownloadsService(today)
      ]);
      const raw = { history, drive, emails, calendar, downloads };
      const cleaned = filterHiddenEvents(raw, hiddenIds);
      filteredData = filterAllByDate(cleaned, today);
      filteredData.history = filterBrowserBySession(filteredData.history);
      await timelineCache.set(dateKey, filteredData);
    }
    const allTimestamps = [
      ...filteredData.history.map(e => normalizeTimestamp(e.lastVisitTime)),
      ...filteredData.drive.files.map(f => normalizeTimestamp(f.modifiedTime)),
      ...filteredData.emails.all.map(e => normalizeTimestamp(e.timestamp)),
      ...filteredData.calendar.today.map(e => safeGetTimestamp(e.start?.dateTime || e.start?.date)),
      ...filteredData.downloads.map(d => normalizeTimestamp(d.startTime))
    ].filter(Boolean);

    window.globalStartTime = Math.min(...allTimestamps);
    if (timelineWrapper) timelineWrapper.style.visibility = 'hidden';

    buildTimeline(filteredData.history, filteredData.drive,filteredData.emails,filteredData.calendar,filteredData.downloads);

    markAllEventKeys(filteredData);

    const container = document.querySelector('.timeline-container');
    if (container) container.scrollLeft = container.scrollWidth;
    if (timelineWrapper) timelineWrapper.style.visibility = 'visible';

    initTimelineScroll({
      oldestLoadedDateRef: { value: oldestLoadedDate },
      isLoadingMorePastDays
    });
  } catch (error) {
    console.error('Error initializing timeline:', error);
    if (timelineEvents) {
      timelineEvents.innerHTML = '<div class="error">Error loading timeline data</div>';
    }
  }
}


export async function loadAndPrependTimelineData(date) {
  const startOfDay = normalizeDateToStartOfDay(date);
  const dateKey = `timeline_${getDateKey(startOfDay)}`;

  try {
    const hiddenIds = await getHiddenIdsSet();
    let raw;

    if (await timelineCache.isValid(dateKey)) {
      const cached = await timelineCache.get(dateKey);
      raw = cached.data;
    } else {
      const [history, drive, emails, calendar, downloads] = await Promise.all([
        getBrowserHistoryService(startOfDay),
        getDriveActivity(startOfDay),
        getGmailActivity(startOfDay),
        getCalendarEvents(startOfDay),
        getDownloadsService(startOfDay)
      ]);
      raw = { history, drive, emails, calendar, downloads };
    }

    const cleaned = filterHiddenEvents(raw, hiddenIds);
    const filteredData = filterAllByDate(cleaned, startOfDay);
    filteredData.history = filterBrowserBySession(filteredData.history);
    await timelineCache.set(dateKey, filteredData);

    const { history, drive, emails, calendar, downloads } = filteredData;
    const hasData = history.length || drive.files.length || emails.all.length || calendar.today.length || downloads.length;

    if (hasData) {
      prependTimeline(
        filterNewEvents(history, e => e.id),
        { files: filterNewEvents(drive.files, f => f.id) },
        { all: filterNewEvents(emails.all, e => e.id) },
        {
          today: filterNewEvents(calendar.today, e => e.id),
          tomorrow: filterNewEvents(calendar.tomorrow, e => e.id)
        },
        filterNewEvents(downloads, d => d.id)
      );

      const newOldestLoadedDate = new Date(startOfDay);
      newOldestLoadedDate.setUTCDate(newOldestLoadedDate.getUTCDate() - 1);
      oldestLoadedDate = newOldestLoadedDate;
      console.log('✅ Updated oldestLoadedDate to:', oldestLoadedDate.toISOString());
    } else {
      console.log('No data found for date:', dateKey);
    }
  } catch (error) {
    console.error('Error loading timeline data:', error);
  }
}

  



