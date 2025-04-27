// ===== Imports =====
import {
    normalizeDateToStartOfDay,
    normalizeTimestamp,
    safeGetTimestamp
  } from '../../utils/dateUtils.js';
  import { buildTimeline } from './timelineRenderer.js';
  import { getDownloadsService } from '../../services/downloadService.js';
  import { getBrowserHistoryService } from '../../services/browserHistoryService.js';
  import { getGmailActivity } from '../../services/gmailService.js';
  import { getCalendarEvents } from '../../services/calendarService.js';
  import { getDriveActivity } from '../../services/driveService.js';
  import { initTimelineScroll } from './timelineScroll.js';
  import { filterHiddenEvents,filterAllByDate,getHiddenIdsSet,filterBrowserBySession,getDateKey } from './timelineDataUtils.js';
  import { timelineCache, cleanupHiddenEventIdsFromCache ,loadFirst6EventsHTML } from './cache.js';
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

    // === New: Simple display of cached HTML ===
    const cachedHTML = await loadFirst6EventsHTML();
    if (cachedHTML) {
      console.log('[TIMELINE] 🚀 Using cached mini timeline');
      const timelineEvents = document.getElementById('timeline-events');
      if (timelineEvents) {
        timelineEvents.innerHTML = cachedHTML;
      }

      // return; // 🛑 Stop here
    }
    
    // === New: Simple display of cached HTML ===
    window.loadedEventKeys = new Set();
    const hiddenIds = await getHiddenIdsSet();
    const today = normalizeDateToStartOfDay(new Date());
    const now = Date.now();

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = getDateKey(d);
      days.push(d);
    }

    const allFiltered = [];

    for (const date of days) {
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

        const newCache = { data: filtered, lastFetchedAt: now };
        await timelineCache.set(dateKey, newCache);

        const verify = await timelineCache.get(dateKey);

        cached = newCache;
      }

      const filteredFromCache = filterHiddenEvents(cached.data, hiddenIds);
      allFiltered.push(filteredFromCache);
    }

    allFiltered.forEach((d, i) => {
    });

    const combined = {
      history: allFiltered.flatMap(d => d.history || []),
      drive: { files: allFiltered.flatMap(d => d.drive?.files || []) },
      emails: { all: allFiltered.flatMap(d => d.emails?.all || []) },
      calendar: {
        today: allFiltered.flatMap(d => d.calendar?.today || []),
        tomorrow: allFiltered.flatMap(d => d.calendar?.tomorrow || [])
      },
      downloads: allFiltered.flatMap(d => d.downloads || [])
    };

    window.fullCombinedData = combined;
    await initTimelineFilterUI(handleFilterChange);

    window.globalStartTime = Math.min(
      ...combined.history.map(e => normalizeTimestamp(e.lastVisitTime)),
      ...combined.drive.files.map(f => normalizeTimestamp(f.modifiedTime)),
      ...combined.emails.all.map(e => normalizeTimestamp(e.timestamp)),
      ...combined.calendar.today.map(e => safeGetTimestamp(e.start?.dateTime || e.start?.date)),
      ...combined.downloads.map(d => normalizeTimestamp(d.startTime))
    );

    const filteredCombined = applyTimelineFilters(combined, timelineFilters);
    buildTimeline(filteredCombined.history, filteredCombined.drive, filteredCombined.emails, filteredCombined.calendar, filteredCombined.downloads);

    markAllEventKeys(combined);

    initTimelineScroll();
  } catch (error) {
    console.error('❌ Error initializing timeline:', error);
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
