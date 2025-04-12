import { normalizeDateToStartOfDay } from '../../utils/dateUtils.js';
import { safeParseDate } from '../../utils/dateUtils.js';
import { buildTimeline } from './timelineRenderer.js';
import { prependTimeline } from './timelineRenderer.js';
import { safeGetTimestamp } from '../../utils/dateUtils.js';


const loadingSection = document.getElementById('loading');
const timelineEvents = document.getElementById('timeline-events');
const timelineWrapper = document.querySelector('.timeline-wrapper');
window.globalStartTime = null;


// Initialize currentDate at the top level and export it
export let currentDate = normalizeDateToStartOfDay(new Date());
let currentTimelineData = null;
let oldestLoadedDate = new Date(currentDate);
let isLoadingMorePastDays = false;




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

    const allTimestamps = [
      ...history.map(item => item.lastVisitTime),
      ...drive.files.map(file => new Date(file.modifiedTime).getTime()),
      ...(emails.all?.map(email => Number(email.timestamp)) || []),
      ...(calendar.today?.map(event => safeGetTimestamp(event.start?.dateTime || event.start?.date)) || [])
    ].filter(Boolean);
    
    const earliestTimestamp = Math.min(...allTimestamps);
    window.globalStartTime = earliestTimestamp;
    

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

export async function initTimeline() {
  updateTimelineDate();

  const datesToLoad = [];
  const today = new Date(currentDate);
  for (let i = 0; i < 3; i++) { // or however many days you want
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    datesToLoad.push(safeParseDate(date));
  }

  const allData = await Promise.all(datesToLoad.map(date => 
    Promise.all([
      getBrowserHistory(date),
      getGoogleDriveActivity(date),
      getGmailActivity(date),
      getCalendarEvents(date)
    ]).then(([history, drive, emails, calendar]) => ({
      date,
      history,
      drive,
      emails,
      calendar
    }))
  ));

  const mergedData = {
    history: allData.flatMap(data => data.history),
    drive: { files: allData.flatMap(data => data.drive.files) },
    emails: { all: allData.flatMap(data => data.emails.all || []) },
    calendar: { today: allData.flatMap(data => data.calendar.today || []) }
  };

  // Set global start time
  const allTimestamps = [
    ...mergedData.history.map(item => item.lastVisitTime),
    ...mergedData.drive.files.map(file => new Date(file.modifiedTime).getTime()),
    ...(mergedData.emails.all?.map(email => Number(email.timestamp)) || []),
    ...(mergedData.calendar.today?.map(event => safeGetTimestamp(event.start?.dateTime || event.start?.date)) || [])
  ].filter(Boolean);

  const earliestTimestamp = Math.min(...allTimestamps);
  window.globalStartTime = earliestTimestamp;

  const timelineWrapper = document.querySelector('.timeline-wrapper');
  if (timelineWrapper) timelineWrapper.style.visibility = 'hidden';

  // Build full timeline
  buildTimeline(mergedData.history, mergedData.drive, mergedData.emails, mergedData.calendar);

  // ✅ Now set the scroll position immediately
  const container = document.querySelector('.timeline-container');
  container.scrollLeft = container.scrollWidth;

  // ✅ Finally, show the wrapper
  if (timelineWrapper) timelineWrapper.style.visibility = 'visible';
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


async function loadAndPrependTimelineData(date) {
  const dateKey = getDateKey(date);

  let cachedData;
  if (timelineCache.isValid(dateKey)) {
    cachedData = timelineCache.get(dateKey);
  } else {
    const normalizedDate = safeParseDate(date);
    const [history, drive, emails, calendar] = await Promise.all([
      getBrowserHistory(normalizedDate),
      getGoogleDriveActivity(normalizedDate),
      getGmailActivity(normalizedDate),
      getCalendarEvents(normalizedDate)
    ]);

    cachedData = { data: { history, drive, emails, calendar } };
    timelineCache.set(dateKey, cachedData.data);
  }

  const { history, drive, emails, calendar } = cachedData.data;

  const hasData = 
    (history && history.length > 0) ||
    (drive && drive.files && drive.files.length > 0) ||
    (emails && emails.all && emails.all.length > 0) ||
    (calendar && calendar.today && calendar.today.length > 0);

  if (hasData) {
    prependTimeline(history, drive, emails, calendar);
    oldestLoadedDate.setDate(oldestLoadedDate.getDate() - 1);
  }

  // ✅ Always expand width, no matter what
  const timelineEvents = document.getElementById('timeline-events');
  const timelineLine = document.querySelector('.timeline-line');

  if (timelineEvents && timelineLine) {
    const currentWidth = parseFloat(timelineEvents.style.width) || timelineEvents.scrollWidth;
    const extraWidth = 1000;
    timelineEvents.style.width = `${currentWidth + extraWidth}px`;
    timelineLine.style.width = `${currentWidth + extraWidth}px`;
  }
}



const container = document.querySelector('.timeline-container');
const scrollSpeed = 10;
let scrollInterval = null;

function startScroll(direction) {
  stopScroll(); // Clear previous interval

  scrollInterval = setInterval(() => {
    const isRTL = getComputedStyle(container).direction === 'rtl';
    const scrollAmount = scrollSpeed * (isRTL ? -1 : 1) * direction;
    container.scrollLeft += scrollAmount;
  }, 16); // ~60fps
}

function stopScroll() {
  if (scrollInterval !== null) {
    clearInterval(scrollInterval);
    scrollInterval = null;

    // ✨ Add this to force a repaint and eliminate the visual "jump"
    container.scrollLeft = container.scrollLeft;
  }
}

document.getElementById('scroll-left').addEventListener('mouseenter', () => startScroll(-1));
document.getElementById('scroll-left').addEventListener('mouseleave', stopScroll);

document.getElementById('scroll-right').addEventListener('mouseenter', () => startScroll(1));
document.getElementById('scroll-right').addEventListener('mouseleave', stopScroll);








container.addEventListener('scroll', () => {
  if (container.scrollLeft === 0 && !isLoadingMorePastDays) {
    isLoadingMorePastDays = true;

    const previousDate = new Date(oldestLoadedDate);

    loadAndPrependTimelineData(previousDate).finally(() => {
      isLoadingMorePastDays = false;
    });
  }
});
