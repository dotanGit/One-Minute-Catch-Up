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
  console.trace('[DEBUG] ❗ initTimeline called directly');
  const start = performance.now();
  console.log('=====================[TIMER] ⏱️ Timeline init started====================');

  try {
    console.log('[UI] 🟢 initTimeline called');
    window.loadedEventKeys = new Set();
    await cleanupHiddenEventIdsFromCache();
    const hiddenIds = await getHiddenIdsSet();
    const today = normalizeDateToStartOfDay(new Date());
    const now = Date.now();

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = getDateKey(d);
      console.log(`[UI] 📅 Adding day: ${d.toISOString()} → dateKey: timeline_${key}`);
      days.push(d);
    }

    const allFiltered = [];

    for (const date of days) {
      const dateKey = `timeline_${getDateKey(date)}`;
      let cached = await timelineCache.get(dateKey);
      console.log(`[UI] 🔍 Loading cache for: ${dateKey}, exists: ${!!cached}`);
      console.log(`[UI] 🧩 Cache object for ${dateKey}:`, cached);

      if (!cached) {
        console.log(`[UI] 🚨 No cache for ${dateKey}, doing full fetch`);
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
        console.log(`[DEBUG] 🧪 Filtered data before saving to cache (${dateKey}):`, {
          history: filtered.history?.length,
          downloads: filtered.downloads?.length,
          emails: filtered.emails?.all?.length,
          drive: filtered.drive?.files?.length,
          calendarToday: filtered.calendar?.today?.length,
          calendarTomorrow: filtered.calendar?.tomorrow?.length
        });

        const verify = await timelineCache.get(dateKey);
        console.log(`[UI] 🔎 Verify saved cache → ${dateKey}:`, {
          history: verify?.data?.history?.length,
          downloads: verify?.data?.downloads?.length
        });

        cached = newCache;
        console.log(`[UI] ✅ Fetched & cached: ${dateKey}`);
      }

      const filteredFromCache = filterHiddenEvents(cached.data, hiddenIds);
      allFiltered.push(filteredFromCache);
      console.log(`[UI] 📦 Cached data → ${dateKey} → history: ${filteredFromCache?.history?.length || 0}, downloads: ${filteredFromCache?.downloads?.length || 0}`);
    }

    allFiltered.forEach((d, i) => {
      console.log(`[UI] 🧪 allFiltered[${i}] → history: ${d?.history?.length}, downloads: ${d?.downloads?.length}`);
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

    console.log('[UI] 🧪 Final combined object before render:', {
      history: combined.history.length,
      drive: combined.drive.files.length,
      emails: combined.emails.all.length,
      calendarToday: combined.calendar.today.length,
      calendarTomorrow: combined.calendar.tomorrow.length,
      downloads: combined.downloads.length
    });

    console.log(`[UI] 📊 Combined totals → history: ${combined.history.length}, downloads: ${combined.downloads.length}`);

    window.globalStartTime = Math.min(
      ...combined.history.map(e => normalizeTimestamp(e.lastVisitTime)),
      ...combined.drive.files.map(f => normalizeTimestamp(f.modifiedTime)),
      ...combined.emails.all.map(e => normalizeTimestamp(e.timestamp)),
      ...combined.calendar.today.map(e => safeGetTimestamp(e.start?.dateTime || e.start?.date)),
      ...combined.downloads.map(d => normalizeTimestamp(d.startTime))
    );

    if (timelineWrapper) timelineWrapper.style.visibility = 'hidden';

    const filteredCombined = applyTimelineFilters(combined, timelineFilters);
    buildTimeline(filteredCombined.history, filteredCombined.drive, filteredCombined.emails, filteredCombined.calendar, filteredCombined.downloads);

    markAllEventKeys(combined);

    if (timelineWrapper) timelineWrapper.style.visibility = 'visible';

    initTimelineScroll();

    console.log('[UI] ✅ Timeline built');
    console.log('=====================[TIMER] ✅ Timeline built in', (performance.now() - start).toFixed(0), 'ms====================  ');
  } catch (error) {
    console.error('❌ Error initializing timeline:', error);
    if (timelineEvents) {
      timelineEvents.innerHTML = '<div class="error">Error loading timeline data</div>';
    }
  }
}


// document.addEventListener('DOMContentLoaded', async () => {
//   await initTimeline();
//   initTimelineFilterUI(() => {
//     initTimeline(); // re-render if filter changes
//   });
// });
