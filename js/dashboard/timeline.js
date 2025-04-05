import { normalizeDateToStartOfDay } from '../utils/dateUtils.js';
import { safeParseDate } from '../utils/dateUtils.js';
import { buildTimeline } from './timelineRenderer.js';


const loadingSection = document.getElementById('loading');
const timelineEvents = document.getElementById('timeline-events');
const timelineWrapper = document.querySelector('.timeline-wrapper');


// Initialize currentDate at the top level
let currentDate = normalizeDateToStartOfDay(new Date());
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
    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(date);
    endTime.setHours(23, 59, 59, 999);
    
    chrome.history.search({
      text: '',
      startTime: startTime.getTime(),
      endTime: endTime.getTime(),
      maxResults: 100
    }, function(historyItems) {
      resolve(historyItems || []);
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


function getCalendarEvents() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getCalendarEvents' }, function(response) {
      resolve(response || { today: [], tomorrow: [] });
    });
  });
}


// Function to load timeline data for a specific date
async function loadTimelineData(date) {
  try {
    if (loadingSection) loadingSection.style.display = 'block';
    if (timelineEvents) timelineEvents.innerHTML = '';

    // Ensure date is properly parsed
    const normalizedDate = safeParseDate(date);
    
    const [history, drive, emails, calendar] = await Promise.all([
      getBrowserHistory(normalizedDate),
      getGoogleDriveActivity(normalizedDate),
      getGmailActivity(normalizedDate),
      getCalendarEvents()
    ]);

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
  loadTimelineData(currentDate);

  const prevDayButton = document.getElementById('prev-day');
  const nextDayButton = document.getElementById('next-day');

  if (prevDayButton) {
    prevDayButton.addEventListener('click', () => {
      currentDate.setDate(currentDate.getDate() - 1);
      updateTimelineDate();
      loadTimelineData(currentDate);
    });
  }

  if (nextDayButton) {
    nextDayButton.addEventListener('click', () => {
      currentDate.setDate(currentDate.getDate() + 1);
      updateTimelineDate();
      loadTimelineData(currentDate);
    });
  }
}
