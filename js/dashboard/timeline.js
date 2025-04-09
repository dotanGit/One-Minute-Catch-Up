import { normalizeDateToStartOfDay } from '../utils/dateUtils.js';
import { safeParseDate } from '../utils/dateUtils.js';
import { buildTimeline } from './timelineRenderer.js';


const loadingSection = document.getElementById('loading');
const timelineEvents = document.getElementById('timeline-events');
const timelineWrapper = document.querySelector('.timeline-wrapper');


// Initialize currentDate at the top level and export it
export let currentDate = normalizeDateToStartOfDay(new Date());
let currentTimelineData = null;


// Function to get date key for cache
function getDateKey(date) {
  return date.toISOString().split('T')[0];
}

// Function to format date for display
function formatDate(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
}


function updateTimelineDate() {
  const timelineDate = document.querySelector('.timeline-date');
  if (timelineDate) {
    timelineDate.textContent = formatDate(currentDate);
  }
}

function getBrowserHistory(date) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ 
      action: 'getBrowserHistory', 
      date: date.toISOString()
    }, function(response) {
      resolve(response || []);
    });
  });
}

function getGoogleDriveActivity(date) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ 
      action: 'getDriveActivity', 
      date: date.toISOString()
    }, function(response) {
      resolve(response || { files: [] });
    });
  });
}


function getGmailActivity(date) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ 
      action: 'getGmailActivity', 
      date: date.toISOString()
    }, function(response) {
      resolve(response || { emails: [] });
    });
  });
}


function getCalendarEvents(date) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ 
      action: 'getCalendarEvents',
      date: date.toISOString()
    }, function(response) {
      resolve(response || { today: [], tomorrow: [] });
    });
  });
}


// Function to load timeline data for a specific date
async function loadTimelineData(date) {
  try {
    const dateKey = getDateKey(date);
    
    // Check cache first
    if (timelineCache.isValid(dateKey)) {
      const cachedData = timelineCache.get(dateKey);
      buildTimeline(
        cachedData.data.history,
        cachedData.data.drive,
        cachedData.data.emails,
        cachedData.data.calendar
      );
      return; // Exit early if we have valid cached data
    }

    // Only show loading if we need to fetch new data
    if (loadingSection) loadingSection.style.display = 'block';
    
    const normalizedDate = safeParseDate(date);
    
    const [history, drive, emails, calendar] = await Promise.all([
      getBrowserHistory(normalizedDate),
      getGoogleDriveActivity(normalizedDate),
      getGmailActivity(normalizedDate),
      getCalendarEvents(normalizedDate)
    ]);

    // Cache the new data
    timelineCache.set(dateKey, { history, drive, emails, calendar });

    // Now clear and build new timeline
    if (timelineEvents) timelineEvents.innerHTML = '';
    buildTimeline(history, drive, emails, calendar);
    currentTimelineData = { history, drive, emails, calendar };

  } catch (error) {
    console.error('Error loading timeline data:', error);
    if (timelineEvents) {
      timelineEvents.innerHTML = `<div class="error">Error loading timeline data</div>`;
    }
  } finally {
    if (loadingSection) loadingSection.style.display = 'none';
  }
}

async function prefetchAdjacentDays(currentDate) {
  const tomorrow = new Date(currentDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(currentDate);
  yesterday.setDate(yesterday.getDate() - 1);

  // Prefetch in background without showing loading indicator
  [yesterday, tomorrow].forEach(date => {
    const dateKey = getDateKey(date);
    if (!timelineCache.isValid(dateKey)) {
      loadTimelineData(date).catch(console.error);
    }
  });
}

export function showTimeline() {
  const loginSection = document.getElementById('login-section');
  const loadingSection = document.getElementById('loading');
  const timelineWrapper = document.querySelector('.timeline-wrapper');

  if (loginSection) loginSection.style.display = 'none';
  if (loadingSection) loadingSection.style.display = 'none';
  if (timelineWrapper) timelineWrapper.style.display = 'block';
}

export function initTimeline() {
  updateTimelineDate();
  
  // Initial load of current day and prefetch adjacent days
  loadTimelineData(currentDate).then(() => {
    // Prefetch yesterday and tomorrow silently after initial load
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);

    // Prefetch both adjacent days silently
    [yesterday, tomorrow].forEach(date => {
      const dateKey = getDateKey(date);
      if (!timelineCache.isValid(dateKey)) {
        silentLoadTimelineData(date).catch(console.error);
      }
    });
  });

  const prevDayButton = document.getElementById('prev-day');
  const nextDayButton = document.getElementById('next-day');

  if (prevDayButton) {
    prevDayButton.addEventListener('click', async () => {
      currentDate.setDate(currentDate.getDate() - 1);
      updateTimelineDate();
      await loadTimelineData(currentDate);
      
      // Prefetch one more day back quietly
      const prevDate = new Date(currentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateKey = getDateKey(prevDate);
      if (!timelineCache.isValid(prevDateKey)) {
        silentLoadTimelineData(prevDate).catch(console.error);
      }
    });
  }

  if (nextDayButton) {
    nextDayButton.addEventListener('click', async () => {
      currentDate.setDate(currentDate.getDate() + 1);
      updateTimelineDate();
      await loadTimelineData(currentDate);
      
      // Prefetch one more day forward quietly
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateKey = getDateKey(nextDate);
      if (!timelineCache.isValid(nextDateKey)) {
        silentLoadTimelineData(nextDate).catch(console.error);
      }
    });
  }
}

// New function for silent loading (no loading indicator)
async function silentLoadTimelineData(date) {
  try {
    const dateKey = getDateKey(date);
    
    // Skip if already in cache
    if (timelineCache.isValid(dateKey)) return;

    const normalizedDate = safeParseDate(date);
    
    const [history, drive, emails, calendar] = await Promise.all([
      getBrowserHistory(normalizedDate),
      getGoogleDriveActivity(normalizedDate),
      getGmailActivity(normalizedDate),
      getCalendarEvents(normalizedDate)
    ]);

    // Cache the new data
    timelineCache.set(dateKey, { history, drive, emails, calendar });
  } catch (error) {
    console.error('Error in silent load:', error);
  }
}

// Add this to timeline.js
const timelineCache = {
  data: new Map(), // Store timeline data
  maxEntries: 7,   // Store up to 7 days of data
  
  // Get cached data for a date
  get(dateKey) {
    return this.data.get(dateKey);
  },
  
  // Set data in cache
  set(dateKey, data) {
    // Remove oldest entry if we exceed maxEntries
    if (this.data.size >= this.maxEntries) {
      const oldestKey = this.data.keys().next().value;
      this.data.delete(oldestKey);
    }
    this.data.set(dateKey, {
      timestamp: Date.now(),
      data: data
    });
  },

  // Check if cache is valid (less than 30 minutes old)
  isValid(dateKey) {
    const entry = this.data.get(dateKey);
    if (!entry) return false;
    const age = Date.now() - entry.timestamp;
    return age < 30 * 60 * 1000; // 30 minutes
  }
};
