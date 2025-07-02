import { getGmailActivity } from '../src/services/gmailService.js';
import { getDriveActivity } from '../src/services/driveService.js';
import { getCalendarEvents } from '../src/services/calendarService.js';
import { generateAISummary } from '../src/services/aiService.js';
import { getBrowserHistoryService } from '../src/services/browserHistoryService.js';
import {getHiddenIdsSet,filterHiddenEvents,filterAllByDate,getIncrementalDataSince,mergeTimelineData,mergeUniqueById,filterBrowserBySession,getDateKey} from '../src/components/timeline/timelineDataUtils.js';
import { timelineCache } from '../src/components/timeline/cache.js';


// === CONFIG ===
const DEBOUNCE_DELAY = 15 * 1000; // 15 seconds
// === STATE ===
let allowBackgroundSync = false;
let deltaTimer = null;
let listenersInitialized = false;
let wallpaperUpdateInProgress = false;

// === AUTH ===
async function handleGoogleLogin() {
  try {
    console.log('[BG] 🔐 handleGoogleLogin triggered');
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
        console.log('[BG] ✅ Login complete & user info stored');
        return { success: true, token };
      }
    }

    return { success: false, error: 'Failed to get auth token' };
  } catch (err) {
    console.error('[BG] ❌ Login error:', err);
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

  const date = new Date();
  const dateKey = `timeline_${getDateKey(date)}`;

  const [emails, drive, calendar] = await Promise.all([
    getGmailActivity(date),
    getDriveActivity(date),
    getCalendarEvents(date)
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
  const filtered = filterAllByDate(cleaned, date);

  mergeTimelineData(currentData, filtered);

  await chrome.storage.local.set({
    [dateKey]: {
      timestamp: Date.now(),
      lastFetchedAt: Date.now(),
      data: currentData,
      date: dateKey.split('_')[1]
    }
  });
}

// === Delta Fetch Logic ===
export async function runDeltaFetchForToday() {
  console.log('[BG] 🔄 runDeltaFetchForToday started');
  const today = new Date();
  const dateKey = `timeline_${getDateKey(today)}`;
  console.log('[BG] 🔑 Using cache key:', dateKey);
  const now = Date.now();

  const cached = await timelineCache.get(dateKey);
  console.log('[BG]  Existing cache for', dateKey, ':', !!cached);
  
  const lastFetchedAt = cached?.lastFetchedAt || 0;

  const delta = await getIncrementalDataSince(lastFetchedAt);
  const hiddenIds = await getHiddenIdsSet();
  const deltaCleaned = filterHiddenEvents(delta, hiddenIds);
  deltaCleaned.history = filterBrowserBySession(deltaCleaned.history);

  const baseData = cached?.data || {
    history: [], drive: { files: [] }, emails: { all: [] },
    calendar: { today: [], tomorrow: [] }, downloads: []
  };

  baseData.history = mergeUniqueById(baseData.history, deltaCleaned.history || [], e => e.id);
  baseData.downloads = mergeUniqueById(baseData.downloads, deltaCleaned.downloads || [], d => d.id);

  const payload = {
    data: baseData,
    lastFetchedAt: now,
    timestamp: now,
    date: dateKey.split('_')[1]
  };

  await timelineCache.set(dateKey, payload);
  console.log('[BG] ✅ Delta fetch finished & cache updated for key:', dateKey);
}




// === Debounced Fetch Scheduler ===

async function isUserLoggedIn() {
  return new Promise((resolve) => {
    chrome.storage.local.get('isLoggedIn', (result) => {
      resolve(!!result?.isLoggedIn);
    });
  });
}

function scheduleDeltaFetch() {
  console.log('[DEBUG] scheduleDeltaFetch CALLED at', new Date().toLocaleTimeString());
  console.log('[BG] 🕓 scheduleDeltaFetch called');
  if (deltaTimer) {
    clearTimeout(deltaTimer);
    console.log('[BG] 🔁 Existing timer cleared');
  }
  deltaTimer = setTimeout(async () => {
    console.log('[BG] ⏰ Debounced timer expired');
    if (await isUserLoggedIn()) {
      console.log('[BG] ✅ Logged in → running delta fetch');
      runDeltaFetchForToday();
    } else {
      console.log('[BG] ❌ Skipped fetch → user not logged in yet');
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
      console.log('[BG] 🔄 enableBackgroundSync received');
      allowBackgroundSync = true;
      chrome.storage.local.set({ backgroundSyncEnabled: true });
      console.log('[BG] ✅ allowBackgroundSync set to:', allowBackgroundSync);
      return;
    case 'startFetchListeners':
      console.log('[BG] 📡 startFetchListeners message received');
      if (!listenersInitialized) {
        chrome.history.onVisited.addListener((historyItem) => {
          console.log('[BG] 🔍 onVisited event triggered for:', historyItem.url);
          scheduleDeltaFetch();
        });
        chrome.downloads.onCreated.addListener((download) => {
          console.log('[BG] 💾 onCreated event triggered for:', download.filename);
          scheduleDeltaFetch();
        });
        listenersInitialized = true;
        console.log('[BG] 🟢 Fetch listeners attached after initTimeline');
      }
      return;
  }
});

// === Periodic Tasks ===
// More reliable alarm-based approach
chrome.alarms.create('periodicSync', { periodInMinutes: 15 });
chrome.alarms.create('wallpaperUpdate', { periodInMinutes: 17 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  try {
    if (alarm.name === 'periodicSync') {
      console.log('[BG] ⏳ Periodic sync alarm triggered');
      
      const { backgroundSyncEnabled } = await chrome.storage.local.get('backgroundSyncEnabled');
      console.log('[BG] 📊 backgroundSyncEnabled from storage:', backgroundSyncEnabled);
      
      if (backgroundSyncEnabled) {
        console.log('[BG] ✅ Background sync enabled - running sync');
        const { isLoggedIn } = await chrome.storage.local.get('isLoggedIn');
        if (isLoggedIn) {
          await syncGmailDriveCalendar();
        }
      } else {
        console.log('[BG] ❌ Background sync disabled - skipping sync');
      }
    } else if (alarm.name === 'wallpaperUpdate') {
      if (!wallpaperUpdateInProgress) {
        wallpaperUpdateInProgress = true;
        console.log('[BG] 🖼️ Starting wallpaper sync check...');
        chrome.runtime.sendMessage({ action: 'updateWallpaper' });
        
        setTimeout(() => {
          wallpaperUpdateInProgress = false;
        }, 5000);
      }
    }
  } catch (error) {
    console.error('[BG] ❌ Alarm handler failed:', error);
  }
});

// === Auto-initialization on startup ===
console.log('[BG] 🚀 Background script loaded, checking login status...');

// Check login status and initialize on startup
chrome.storage.local.get(['isLoggedIn', 'backgroundSyncEnabled'], function(result) {
  console.log('[BG] 🔍 Login status on startup:', result.isLoggedIn);
  console.log('[BG] 🔍 Background sync status on startup:', result.backgroundSyncEnabled);
  
  if (result.isLoggedIn) {
    console.log('[BG] ✅ User is logged in, initializing listeners...');
    allowBackgroundSync = result.backgroundSyncEnabled || false;
    
    // Initialize listeners immediately if user is already logged in
    if (!listenersInitialized) {
      chrome.history.onVisited.addListener((historyItem) => {
        console.log('[BG] 🔍 onVisited event triggered for:', historyItem.url);
        scheduleDeltaFetch();
      });
      chrome.downloads.onCreated.addListener((download) => {
        console.log('[BG] 💾 onCreated event triggered for:', download.filename);
        scheduleDeltaFetch();
      });
      listenersInitialized = true;
      console.log('[BG] 🟢 Fetch listeners attached on startup');
    }
  } else {
    console.log('[BG] ❌ User not logged in on startup');
  }
});