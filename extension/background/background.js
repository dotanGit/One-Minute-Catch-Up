import { getGmailActivity } from '../src/services/gmailService.js';
import { getAuthToken } from '../src/utils/auth.js';
import { getDriveActivity } from '../src/services/driveService.js';
import { getCalendarEvents } from '../src/services/calendarService.js';
import { generateAISummary } from '../src/services/aiService.js';
import { getBrowserHistoryService } from '../src/services/browserHistoryService.js';
import { mergeTimelineData,filterHiddenEvents,filterAllByDate,getHiddenIdsSet } from '../src/components/timeline/timelineDataUtils.js';

// Google API configuration
const GOOGLE_API_KEY = 'AIzaSyC8e48p_XFSAUvX285wkk_tOJ3vCPRQPxk';
const OPENAI_API_KEY = 'XXXXXXXXXXXXXXXXXXXXsk-proj-8Y5Toe_sBnrdYSOCIYxtJ7druGPPKveiQyeF_hzE7VpMO-bZB7OkFttvoYMFA1J4Pb160WW_3CT3BlbkFJSgBlMNxiEb1Y5_hF4oi6yvfmXm3qtPtkWgNmUHaSf_mNqRCEUbhpwYwdoGxSEnr0FgTfIS5M4A';
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
];


// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'login':
      handleGoogleLogin().then(sendResponse);
      return true;
    case 'getUserInfo':
      getUserInfo().then(sendResponse);
      return true;
    case 'getDriveActivity':
      getDriveActivity(new Date(request.date)).then(sendResponse);
      return true;
    case 'getGmailActivity':
      getGmailActivity(new Date(request.date)).then(sendResponse);
      return true;
    case 'getCalendarEvents':
      getCalendarEvents(new Date(request.date)).then(sendResponse);
      return true;
    case 'generateAISummary':
      generateAISummary(request.data).then(sendResponse);
      return true;
    case 'getBrowserHistory':
      getBrowserHistoryService(new Date(request.date)).then(sendResponse);
      return true;
    case 'triggerSync':
      syncGmailDriveCalendar().then(() => sendResponse({ success: true }));
      return true;
  }
});

// Google OAuth2 login
async function handleGoogleLogin() {
  try {
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });

    if (token) {
      // Get user info immediately after login
      const profileResponse = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
      );

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
      
        // Save user info to storage
        await chrome.storage.local.set({ 
          isLoggedIn: true,
          userInfo: {
            firstName: profileData.given_name,
            lastName: profileData.family_name,
            fullName: profileData.name,
            email: profileData.email
          }
        });
      
        syncGmailDriveCalendar();
      }

      return { success: true, token };
    }
    return { success: false, error: 'Failed to get auth token' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

// Get user info
async function getUserInfo() {
  try {
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });

    if (!token) throw new Error('Not authenticated');

    // Get profile info from Profile API
    const profileResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!profileResponse.ok) {
      if (profileResponse.status === 401) {
        await chrome.identity.removeCachedAuthToken({ token });
        throw new Error('Authentication expired. Please try again.');
      }
      throw new Error(`Profile API error: ${profileResponse.status}`);
    }

    const profileData = await profileResponse.json();
    console.log('Profile data:', profileData);

    // Format user info using Profile API data
    const userInfo = {
      ...profileData,
      firstName: profileData.given_name,
      lastName: profileData.family_name,
      fullName: profileData.name,
      email: profileData.email
    };

    console.log('User info:', userInfo);
    return { success: true, userInfo };
  } catch (error) {
    console.error('Get user info error:', error);
    return { success: false, error: error.message };
  }
}


// Fetch Gmail/Drive/Calendar every 30 minutes in the background
const THIRTY_MIN = 30 * 60 * 1000;

async function syncGmailDriveCalendar() {
  const { isLoggedIn } = await chrome.storage.local.get('isLoggedIn');
  if (!isLoggedIn) {
    console.log('[BG] 🚫 Not logged in — skipping sync');
    return;
  }

  console.log('[BG] ⏳ Background sync triggered');
  const now = Date.now();
  const { lastGmailCheck } = await chrome.storage.local.get('lastGmailCheck');

  if (!lastGmailCheck || now - lastGmailCheck > THIRTY_MIN) {
    const date = new Date();
    const dateKey = `timeline_${date.toISOString().split('T')[0]}`;
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    console.log('📧 [BG] Fetching Gmail/Drive/Calendar (30 min interval passed)');
    const start = performance.now();

    const logApiTime = async (label, fn) => {
      const s = performance.now();
      const res = await fn;
      console.log(`⏱️ [BG] ${label} took ${Math.round(performance.now() - s)}ms`);
      return res;
    };

    const [emails, drive, calendar] = await Promise.all([
      logApiTime('Gmail', getGmailActivity(startOfDay)),
      logApiTime('Drive', getDriveActivity(startOfDay)),
      logApiTime('Calendar', getCalendarEvents(startOfDay))
    ]);

    console.log(`✅ [BG] Total Gmail/Drive/Calendar fetch took ${Math.round(performance.now() - start)}ms`);

    const existing = await chrome.storage.local.get(dateKey);
    const currentData = existing?.[dateKey]?.data || {
      history: [],
      drive: { files: [] },
      emails: { all: [] },
      calendar: { today: [], tomorrow: [] },
      downloads: []
    };

    const hiddenIds = await getHiddenIdsSet();
    const raw = { emails, drive, calendar };
    const cleaned = filterHiddenEvents(raw, hiddenIds);
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

    console.log('[BG] ✅ Sync complete. Cache updated');
  } else {
    console.log('⏱️ [BG] Skipping Gmail/Drive/Calendar — within 30 min window');
  }
}

// ✅ Only run every 30 min if logged in
setInterval(() => {
  chrome.storage.local.get('isLoggedIn', ({ isLoggedIn }) => {
    if (isLoggedIn) {
      syncGmailDriveCalendar();
    } else {
      console.log('[BG] ⏳ Skipping interval sync — not logged in');
    }
  });
}, THIRTY_MIN);
