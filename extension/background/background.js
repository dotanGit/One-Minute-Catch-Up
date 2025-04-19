import { getGmailActivity } from '../src/services/gmailService.js';
import { getDriveActivity } from '../src/services/driveService.js';
import { getCalendarEvents } from '../src/services/calendarService.js';
import { generateAISummary } from '../src/services/aiService.js';
import { getBrowserHistoryService } from '../src/services/browserHistoryService.js';
import {
  getHiddenIdsSet,
  filterHiddenEvents,
  filterAllByDate,
  getIncrementalDataSince,
  mergeTimelineData,
  mergeUniqueById,
  filterBrowserBySession,
  getDateKey
} from '../src/components/timeline/timelineDataUtils.js';
import { timelineCache } from '../src/components/timeline/cache.js';

// === CONFIG ===
const THIRTY_MIN = 30 * 60 * 1000;
const DEBOUNCE_DELAY = 5000;

// === STATE ===
let allowBackgroundSync = false;
let firstSyncBlocked = true;
let deltaTimer = null;
let isLoggedInCache = false;
let listenersInitialized = false;

// === AUTH ===
async function handleGoogleLogin() {
  try {
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(token);
      });
    });

    if (token) {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (profileRes.ok) {
        const profile = await profileRes.json();
        await chrome.storage.local.set({
          isLoggedIn: true,
          userInfo: {
            firstName: profile.given_name,
            lastName: profile.family_name,
            fullName: profile.name,
            email: profile.email
          }
        });
        return { success: true, token };
      }
    }

    return { success: false, error: 'Failed to get auth token' };
  } catch (err) {
    console.error('Login error:', err);
    return { success: false, error: err.message };
  }
}

async function getUserInfo() {
  try {
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(token);
      });
    });

    if (!token) throw new Error('Not authenticated');

    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 401) {
        await chrome.identity.removeCachedAuthToken({ token });
        throw new Error('Authentication expired. Please try again.');
      }
      throw new Error(`Profile API error: ${res.status}`);
    }

    const profile = await res.json();
    return { success: true, userInfo: profile };
  } catch (err) {
    console.error('Get user info error:', err);
    return { success: false, error: err.message };
  }
}

// === API-Side Sync ===
async function syncGmailDriveCalendar() {
  const { isLoggedIn } = await chrome.storage.local.get('isLoggedIn');
  if (!isLoggedIn) return;

  const now = Date.now();
  const { lastGmailCheck } = await chrome.storage.local.get('lastGmailCheck');

  if (!lastGmailCheck || now - lastGmailCheck > THIRTY_MIN) {
    const date = new Date();
    const dateKey = `timeline_${getDateKey(date)}`;
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [emails, drive, calendar] = await Promise.all([
      getGmailActivity(startOfDay),
      getDriveActivity(startOfDay),
      getCalendarEvents(startOfDay)
    ]);

    const existing = await chrome.storage.local.get(dateKey);
    const currentData = existing?.[dateKey]?.data || {
      history: [],
      drive: { files: [] },
      emails: { all: [] },
      calendar: { today: [], tomorrow: [] },
      downloads: []
    };

    const hiddenIds = await getHiddenIdsSet();
    const cleaned = filterHiddenEvents({ emails, drive, calendar }, hiddenIds);
    const filtered = filterAllByDate(cleaned, startOfDay);

    mergeTimelineData(currentData, filtered);

    await chrome.storage.local.set({
      [dateKey]: {
        timestamp: now,
        lastFetchedAt: now,
        data: currentData,
        date: dateKey.split('_')[1]
      },
      lastGmailCheck: now
    });
  }
}

// === Delta Fetch Logic ===
export async function runDeltaFetchForToday() {
  const today = new Date();
  const dateKey = `timeline_${getDateKey(today)}`;
  const now = Date.now();

  const cached = await timelineCache.get(dateKey);
  const lastFetchedAt = cached?.lastFetchedAt || 0;

  const delta = await getIncrementalDataSince(lastFetchedAt);
  const hiddenIds = await getHiddenIdsSet();
  const deltaCleaned = filterHiddenEvents(delta, hiddenIds);
  deltaCleaned.history = filterBrowserBySession(deltaCleaned.history);

  const baseData = cached?.data || {
    history: [],
    drive: { files: [] },
    emails: { all: [] },
    calendar: { today: [], tomorrow: [] },
    downloads: []
  };

  baseData.history = mergeUniqueById(baseData.history, deltaCleaned.history || [], e => e.id);
  baseData.downloads = mergeUniqueById(baseData.downloads, deltaCleaned.downloads || [], d => d.id);

  const payload = {
    data: {
      history: baseData.history,
      drive: baseData.drive,
      emails: baseData.emails,
      calendar: baseData.calendar,
      downloads: baseData.downloads
    },
    lastFetchedAt: now,
    timestamp: now,
    date: dateKey.split('_')[1]
  };

  await timelineCache.set(dateKey, payload);
}

// === Debounced Fetch Scheduler ===
function scheduleDeltaFetch() {
  if (deltaTimer) clearTimeout(deltaTimer);
  deltaTimer = setTimeout(() => {
    if (isLoggedInCache) {
      runDeltaFetchForToday();
    }
    deltaTimer = null;
  }, DEBOUNCE_DELAY);
}


// === Messages ===
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.action) {
    case 'login':
      handleGoogleLogin().then(sendResponse);
      return true;
    case 'getUserInfo':
      getUserInfo().then(sendResponse);
      return true;
    case 'getDriveActivity':
      getDriveActivity(new Date(msg.date)).then(sendResponse);
      return true;
    case 'getGmailActivity':
      getGmailActivity(new Date(msg.date)).then(sendResponse);
      return true;
    case 'getCalendarEvents':
      getCalendarEvents(new Date(msg.date)).then(sendResponse);
      return true;
    case 'generateAISummary':
      generateAISummary(msg.data).then(sendResponse);
      return true;
    case 'getBrowserHistory':
      getBrowserHistoryService(new Date(msg.date)).then(sendResponse);
      return true;
    case 'runDeltaNow':
      runDeltaFetchForToday();
      return true;
    case 'enableBackgroundSync':
      allowBackgroundSync = true;
      chrome.storage.local.get('isLoggedIn', ({ isLoggedIn }) => {
        isLoggedInCache = !!isLoggedIn;
      });
      return;
    case 'startFetchListeners':
      if (!listenersInitialized) {
        chrome.history.onVisited.addListener(scheduleDeltaFetch);
        chrome.downloads.onCreated.addListener(scheduleDeltaFetch);
        listenersInitialized = true;
        console.log('[BG] 🟢 Fetch listeners attached after initTimeline');
      }
      return;
  }
});

// === Periodic Tasks ===
setTimeout(() => {
  firstSyncBlocked = false;
}, 3000);

setInterval(() => {
  if (!firstSyncBlocked && allowBackgroundSync) {
    chrome.storage.local.get('isLoggedIn', ({ isLoggedIn }) => {
      if (isLoggedIn) syncGmailDriveCalendar();
    });
  }
}, THIRTY_MIN);
