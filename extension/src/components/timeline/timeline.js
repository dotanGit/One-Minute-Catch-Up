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
  import { mergeUniqueById,filterHiddenEvents,filterAllByDate,getHiddenIdsSet,getIncrementalDataSince,filterBrowserBySession,getDateKey } from './timelineDataUtils.js';

  
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
      const allKeys = await chrome.storage.local.get(null);
      const cacheKeys = Object.keys(allKeys).filter(key => key.startsWith('timeline_'));

      if (cacheKeys.length >= this.maxEntries) {
        const oldestKeys = cacheKeys
          .sort()
          .slice(0, cacheKeys.length - this.maxEntries + 1);
        await chrome.storage.local.remove(oldestKeys);
      }

      await chrome.storage.local.set({
        [dateKey]: {
          timestamp: Date.now(),
          lastFetchedAt: Date.now(), // 🔁 for delta logic
          data: data,
          date: dateKey.split('_')[1]
        }
      });
    } catch (error) {
      console.error('Cache write error:', error);
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
        
        // After 10 seconds, hide loading and show timeline
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
    window.loadedEventKeys = new Set();
    const hiddenIds = await getHiddenIdsSet();
    const today = normalizeDateToStartOfDay(new Date());

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      days.push(d);
    }

    const allFiltered = [];
    const MIN_DELTA_INTERVAL = 10 * 1000;
    const now = Date.now();

    for (const date of days) {
      const dateKey = `timeline_${getDateKey(date)}`;
      const isToday = getDateKey(date) === getDateKey(today);
      let cached = await timelineCache.get(dateKey);

      if (!cached) {
        // Full fetch if no cache
        const [history, drive, emails, calendar, downloads] = await Promise.all([
          getBrowserHistoryService(date),
          getDriveActivity(date),
          getGmailActivity(date),
          getCalendarEvents(date),
          getDownloadsService(date)
        ]);

        const raw = { history, drive, emails, calendar, downloads };
        const cleaned = filterHiddenEvents(raw, hiddenIds);
        const filtered = filterAllByDate(cleaned, date);
        filtered.history = filterBrowserBySession(filtered.history);

        await timelineCache.set(dateKey, filtered);
        cached = { data: filtered };
        console.log(`✅ Fetched & cached: ${dateKey}`);
      } else {
        // Delta fetch only for today
        if (isToday && now - cached.lastFetchedAt > MIN_DELTA_INTERVAL) {
          console.log(`🔄 Delta fetch for today: ${dateKey}`);
          const delta = await getIncrementalDataSince(cached.lastFetchedAt);
          const deltaCleaned = filterHiddenEvents(delta, hiddenIds);
          deltaCleaned.history = filterBrowserBySession(deltaCleaned.history);
        
          // 🔥 Merge only what was actually fetched
          cached.data.history = mergeUniqueById(cached.data.history, deltaCleaned.history, e => e.id);
          cached.data.downloads = mergeUniqueById(cached.data.downloads, deltaCleaned.downloads, d => d.id);
        
          await timelineCache.set(dateKey, cached.data);
          console.log(`✅ Delta merged and updated cache: ${dateKey}`);
        }
      }

      allFiltered.push(cached.data);
    }

    // Combine all days
    const combined = {
      history: allFiltered.flatMap(d => d.history),
      drive: { files: allFiltered.flatMap(d => d.drive.files) },
      emails: { all: allFiltered.flatMap(d => d.emails.all) },
      calendar: {
        today: allFiltered.flatMap(d => d.calendar.today),
        tomorrow: allFiltered.flatMap(d => d.calendar.tomorrow)
      },
      downloads: allFiltered.flatMap(d => d.downloads)
    };

    window.globalStartTime = Math.min(
      ...combined.history.map(e => normalizeTimestamp(e.lastVisitTime)),
      ...combined.drive.files.map(f => normalizeTimestamp(f.modifiedTime)),
      ...combined.emails.all.map(e => normalizeTimestamp(e.timestamp)),
      ...combined.calendar.today.map(e => safeGetTimestamp(e.start?.dateTime || e.start?.date)),
      ...combined.downloads.map(d => normalizeTimestamp(d.startTime))
    );

    if (timelineWrapper) timelineWrapper.style.visibility = 'hidden';

    buildTimeline(combined.history, combined.drive, combined.emails, combined.calendar, combined.downloads);
    markAllEventKeys(combined);

    const container = document.querySelector('.timeline-container');
    if (container) container.scrollLeft = container.scrollWidth;
    if (timelineWrapper) timelineWrapper.style.visibility = 'visible';

    initTimelineScroll();

  } catch (error) {
    console.error('Error initializing timeline:', error);
    if (timelineEvents) {
      timelineEvents.innerHTML = '<div class="error">Error loading timeline data</div>';
    }
  }
}




