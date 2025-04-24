// ===== Imports =====
import {
    normalizeDateToStartOfDay,
    normalizeTimestamp,
    safeGetTimestamp
  } from '../../utils/dateUtils.js';
  import { buildTodayTimeline,appendPastTimeline } from './timelineRenderer.js';
  import { getDownloadsService } from '../../services/downloadService.js';
  import { getBrowserHistoryService } from '../../services/browserHistoryService.js';
  import { getGmailActivity } from '../../services/gmailService.js';
  import { getCalendarEvents } from '../../services/calendarService.js';
  import { getDriveActivity } from '../../services/driveService.js';
  import { initTimelineScroll } from './timelineScroll.js';
  import { filterHiddenEvents,filterAllByDate,getHiddenIdsSet,filterBrowserBySession,getDateKey } from './timelineDataUtils.js';
  import { timelineCache, cleanupHiddenEventIdsFromCache } from './cache.js';
  import { applyTimelineFilters, initTimelineFilterUI, timelineFilters } from './timelineFilters.js';

  

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
  

// ===== Timeline Functions =====
export function showTimeline(isFirstLogin = false) {
    const loginSection = document.getElementById('login-section');
    const loadingSection = document.getElementById('loading');
    const timelineWrapper = document.querySelector('.timeline-wrapper');
    const container = document.querySelector('.timeline-container');
    
    if (loginSection) loginSection.style.display = 'none';
    
    if (isFirstLogin) {        
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
    const now = Date.now();

    const todayKey = `timeline_${getDateKey(today)}`;
    let todayCache = await timelineCache.get(todayKey);

    if (!todayCache) {
      const [history, drive, emails, calendar, downloads] = await Promise.all([
        getBrowserHistoryService(today),
        getDriveActivity(today),
        getGmailActivity(today),
        getCalendarEvents(today),
        getDownloadsService(today)
      ]);
      const raw = { history, drive, emails, calendar, downloads };
      const cleaned = filterHiddenEvents(raw, hiddenIds);
      const filtered = filterAllByDate(cleaned, today);
      filtered.history = filterBrowserBySession(filtered.history);
      todayCache = { data: filtered, lastFetchedAt: now };
      await timelineCache.set(todayKey, todayCache);
    }

    // ✅ Phase 1: Render only today
    const todayData = todayCache.data;
    const renderedCount = buildTodayTimeline(todayData);

    // ✅ Phase 2: Load and append past 6 days
    const pastDaysData = [];
    for (let i = 1; i <= 6; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = `timeline_${getDateKey(date)}`;
      let cached = await timelineCache.get(dateKey);

      if (!cached) {
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
        cached = { data: filtered, lastFetchedAt: now };
        await timelineCache.set(dateKey, cached);
      }

      pastDaysData.push(cached.data);
    }

    appendPastTimeline(pastDaysData, renderedCount);
    initTimelineScroll();

  } catch (error) {
    console.error('❌ Error initializing timeline:', error);
    const timelineEvents = document.getElementById('timeline-events');
    if (timelineEvents) {
      timelineEvents.innerHTML = '<div class="error">Error loading timeline data</div>';
    }
  }
}



function handleFilterChange() {
  console.log('[DEBUG] 🔁 Filter change triggered');
  const filtered = applyTimelineFilters(window.fullCombinedData, timelineFilters);
  buildTimeline(filtered.history,filtered.drive,filtered.emails,filtered.calendar,filtered.downloads);
}
