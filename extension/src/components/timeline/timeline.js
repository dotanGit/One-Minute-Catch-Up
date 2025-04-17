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
  
  function formatDate(date) {
    const today = normalizeDateToStartOfDay(new Date());
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  
    if (date.toUTCString() === today.toUTCString()) return 'Today';
    if (date.toUTCString() === yesterday.toUTCString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
  
  function updateTimelineDate() {
    const timelineDate = document.querySelector('.timeline-date');
    if (timelineDate) {
      timelineDate.textContent = formatDate(currentDate);
    }
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
  

  function isEventAlreadyLoaded(key, event) {
    const exists = window.loadedEventKeys.has(key);
    if (exists) {
      console.warn('⚠️ Duplicate key blocked:', key, '📌 Event details:', {
        type: event?.type,
        title: event?.title || event?.subject || event?.name,
        timestamp: event?.timestamp || event?.lastVisitTime || event?.modifiedTime || event?.startTime,
      });
    }
    return exists;
  }
  
  
  function markEventAsLoaded(key) {
    window.loadedEventKeys.add(key);
  }
  
  // Use this once, before prepending:
  function filterNewEvents(events, getKey) {
    return events.filter(e => {
      const key = getKey(e);
      if (isEventAlreadyLoaded(key, e)) return false;
      markEventAsLoaded(key);
      return true;
    });
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
    updateTimelineDate();
    try {
      const today = normalizeDateToStartOfDay(new Date());
      const yesterday = new Date(today);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const days = [yesterday, today];
  
      const allData = await Promise.all(days.map(async date => {
        const dateKey = `timeline_${getDateKey(date)}`;
        const isValidCache = await timelineCache.isValid(dateKey);
  
        if (isValidCache) {
          const cachedData = await timelineCache.get(dateKey);
          const raw = cachedData.data;
          
          // Get hidden IDs from storage
          const hiddenIds = await new Promise(resolve => {
            chrome.storage.local.get(['hiddenEventIds'], (result) => {
              resolve(new Set(result.hiddenEventIds || []));
            });
          });

          // Filter out hidden events
          const filteredData = {
            history: (raw.history || []).filter(e => !hiddenIds.has(e.id)),
            drive: { 
              files: (raw.drive?.files || []).filter(f => !hiddenIds.has(f.id))
            },
            emails: { 
              all: (raw.emails?.all || []).filter(e => !hiddenIds.has(e.threadId))
            },
            calendar: {
              today: (raw.calendar?.today || []).filter(e => !hiddenIds.has(e.id)),
              tomorrow: (raw.calendar?.tomorrow || []).filter(e => !hiddenIds.has(e.id))
            },
            downloads: (raw.downloads || []).filter(d => !hiddenIds.has(d.downloadId))
          };

          return { date, ...filteredData };
        }
  
        const [history, drive, emails, calendar, downloads] = await Promise.all([
          getBrowserHistoryService(date),
          getDriveActivity(date),
          getGmailActivity(date),
          getCalendarEvents(date),
          getDownloadsService(date)
        ]);
  
        const data = { history, drive, emails, calendar, downloads };
        await timelineCache.set(dateKey, data);
        return { date, ...data };
      }));
  
      const mergedData = {
        history: allData.flatMap(d => filterByUTCDate(d.history || [], e => e.lastVisitTime, d.date)),
        drive: { files: allData.flatMap(d => filterByUTCDate(d.drive?.files || [], f => f.modifiedTime, d.date)) },
        emails: { all: allData.flatMap(d => filterByUTCDate(d.emails?.all || [], e => e.timestamp, d.date)) },
        calendar: { today: allData.flatMap(d => filterByUTCDate(d.calendar?.today || [], e => e.start?.dateTime || e.start?.date, d.date)) },
        downloads: allData.flatMap(d => filterByUTCDate(d.downloads || [], d => d.startTime, d.date))
      };
  
      const allTimestamps = [
        ...mergedData.history.map(e => normalizeTimestamp(e.lastVisitTime)),
        ...mergedData.drive.files.map(f => normalizeTimestamp(f.modifiedTime)),
        ...mergedData.emails.all.map(e => normalizeTimestamp(e.timestamp)),
        ...mergedData.calendar.today.map(e => safeGetTimestamp(e.start?.dateTime || e.start?.date)),
        ...mergedData.downloads.map(d => normalizeTimestamp(d.startTime))
      ].filter(Boolean);
  
      window.globalStartTime = Math.min(...allTimestamps);
      if (timelineWrapper) timelineWrapper.style.visibility = 'hidden';
  
      buildTimeline(mergedData.history, mergedData.drive, mergedData.emails, mergedData.calendar, mergedData.downloads);
      
      const markKeys = (arr, getKey) => {
        arr.forEach(e => {
          const key = getKey(e);
          if (key) window.loadedEventKeys.add(key);
        });
      };
      
      markKeys(mergedData.history, e => e.id || e.url + e.lastVisitTime);
      markKeys(mergedData.drive.files, f => f.id || f.name + f.modifiedTime);
      markKeys(mergedData.emails.all, e => e.id || e.threadId || e.subject + e.timestamp);
      markKeys(mergedData.calendar.today, e => e.id || (e.summary + safeGetTimestamp(e.start?.dateTime || e.start?.date)));
      markKeys(mergedData.downloads, d => d.id || d.url + d.startTime);
      

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
      let filteredData;
  
      const isValidCache = await timelineCache.isValid(dateKey);
      if (isValidCache) {
        const cachedData = await timelineCache.get(dateKey);
        const raw = cachedData.data;

        // Get hidden IDs from storage
        const hiddenIds = await new Promise(resolve => {
          chrome.storage.local.get(['hiddenEventIds'], (result) => {
            resolve(new Set(result.hiddenEventIds || []));
          });
        });

        filteredData = {
          history: filterByUTCDate((raw.history || []).filter(e => !hiddenIds.has(e.id)), e => e.lastVisitTime, startOfDay),
          drive: { files: filterByUTCDate((raw.drive?.files || []).filter(f => !hiddenIds.has(f.id)), f => f.modifiedTime, startOfDay) },
          emails: { all: filterByUTCDate((raw.emails?.all || []).filter(e => !hiddenIds.has(e.threadId)), e => e.timestamp, startOfDay) },
          calendar: {
            today: filterByUTCDate((raw.calendar?.today || []).filter(e => !hiddenIds.has(e.id)), e => e.start?.dateTime || e.start?.date, startOfDay),
            tomorrow: filterByUTCDate((raw.calendar?.tomorrow || []).filter(e => !hiddenIds.has(e.id)), e => e.start?.dateTime || e.start?.date, startOfDay)
          },
          downloads: filterByUTCDate((raw.downloads || []).filter(d => !hiddenIds.has(d.downloadId)), d => d.startTime, startOfDay)
        };
  
        await timelineCache.set(dateKey, filteredData);
      } else {
        const [history, drive, emails, calendar, downloads] = await Promise.all([
          getBrowserHistoryService(startOfDay),
          getDriveActivity(startOfDay),
          getGmailActivity(startOfDay),
          getCalendarEvents(startOfDay),
          getDownloadsService(startOfDay)
        ]);
  
        filteredData = {
          history: filterByUTCDate(history || [], e => e.lastVisitTime, startOfDay),
          drive: { files: filterByUTCDate(drive?.files || [], f => f.modifiedTime, startOfDay) },
          emails: { all: filterByUTCDate(emails?.all || [], e => e.timestamp, startOfDay) },
          calendar: {
            today: filterByUTCDate(calendar?.today || [], e => e.start?.dateTime || e.start?.date, startOfDay),
            tomorrow: filterByUTCDate(calendar?.tomorrow || [], e => e.start?.dateTime || e.start?.date, startOfDay)
          },
          downloads: filterByUTCDate(downloads || [], d => d.startTime, startOfDay)
        };
  
        await timelineCache.set(dateKey, filteredData);
      }
  
      const { history, drive, emails, calendar, downloads } = filteredData;
      const hasData = history.length || drive.files.length || emails.all.length || calendar.today.length || downloads.length;
  
      if (hasData) {
        prependTimeline(
            filterNewEvents(history, e => e.id || e.url + e.lastVisitTime),
            { files: filterNewEvents(drive.files, f => f.id || f.name + f.modifiedTime) },
            { all: filterNewEvents(emails.all, e => e.id || e.threadId || e.subject + e.timestamp) },
            {
              today: filterNewEvents(calendar.today, e => e.id || (e.summary + safeGetTimestamp(e.start?.dateTime || e.start?.date))),
              tomorrow: filterNewEvents(calendar.tomorrow, e => e.id || (e.summary + safeGetTimestamp(e.start?.dateTime || e.start?.date)))
            },
            filterNewEvents(downloads, d => d.id || d.url + d.startTime)
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
  



