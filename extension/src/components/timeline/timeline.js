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
  import { mergeTimelineData,filterHiddenEvents,filterAllByDate,getHiddenIdsSet,getIncrementalDataSince,filterBrowserBySession,getDateKey } from './timelineDataUtils.js';

  
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
    const today = normalizeDateToStartOfDay(new Date());
    window.loadedEventKeys = new Set();
    oldestLoadedDate = new Date(today);
    const dateKey = `timeline_${getDateKey(today)}`;
    const hiddenIds = await getHiddenIdsSet();
    const MIN_DELTA_INTERVAL = 1 * 1000; // 10 minutes
    const now = Date.now();

    let filteredData;
    let cachedData = await timelineCache.get(dateKey);

    if (!cachedData) {
      console.log('🔄 No cache found - performing full data fetch');
      // Full fetch (no cache at all)
      const [history, downloads] = await Promise.all([
        getBrowserHistoryService(today),
        getDownloadsService(today)
      ]);
      const raw = { history, drive: { files: [] }, emails: { all: [] }, calendar: { today: [], tomorrow: [] }, downloads };
      
      const cleaned = filterHiddenEvents(raw, hiddenIds);
      filteredData = filterAllByDate(cleaned, today);
      filteredData.history = filterBrowserBySession(filteredData.history);
      await timelineCache.set(dateKey, filteredData);
      await chrome.storage.local.set({ lastFetchedAtGlobal: now });
      console.log('✅ Full data fetch completed and cached');
    } else {
      console.log('📦 Using cached data for date:', dateKey);
      // Cached → maybe fetch delta
      const raw = cachedData.data;
      const cleaned = filterHiddenEvents(raw, hiddenIds);
      filteredData = filterAllByDate(cleaned, today);

      const { lastFetchedAtGlobal } = await chrome.storage.local.get('lastFetchedAtGlobal');
      const last = lastFetchedAtGlobal || 0;

      if (now - last > MIN_DELTA_INTERVAL && cachedData.lastFetchedAt) {
        console.log('🔄 Fetching data from cache using the Interval, Cache is stale - fetching delta updates');
        const delta = await getIncrementalDataSince(cachedData.lastFetchedAt);
        const deltaCleaned = filterHiddenEvents(delta, hiddenIds);
        const deltaFiltered = filterAllByDate(deltaCleaned, today);

        mergeTimelineData(filteredData, deltaFiltered);
        await timelineCache.set(dateKey, filteredData);
        await chrome.storage.local.set({ lastFetchedAtGlobal: now });
        console.log('✅ Delta updates applied and cached');
      } else {
        console.log('✅ Using fresh cached data - no updates needed');
      }
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

    buildTimeline(filteredData.history, filteredData.drive, filteredData.emails, filteredData.calendar, filteredData.downloads);
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

    if (await timelineCache.get(dateKey)) {
      console.log('📦 Using cached data for past date:', dateKey);
      const cached = await timelineCache.get(dateKey);
      raw = cached.data;
    } else {
      console.log('🔄 No cache found for past date - fetching data for:', dateKey);
      const [history, drive, emails, calendar, downloads] = await Promise.all([
        getBrowserHistoryService(startOfDay),
        getDriveActivity(startOfDay),
        getGmailActivity(startOfDay),
        getCalendarEvents(startOfDay),
        getDownloadsService(startOfDay)
      ]);
      raw = { history, drive, emails, calendar, downloads };
      console.log('✅ Fetched and cached data for past date:', dateKey);
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
      console.log('❌ No data found for past date:', dateKey);
    }
  } catch (error) {
    console.error('❌ Error loading timeline data:', error);
  }
}

  



