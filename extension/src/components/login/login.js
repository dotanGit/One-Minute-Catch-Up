import { showTimeline } from '../timeline/timeline.js';
import { initTimeline } from '../timeline/timeline.js';
import { onTimelineInitialized } from '../timeline/timelineDomUtils.js';
import { getAuthToken } from '../../utils/auth.js';


export function initLogin() {
  console.log('[UI] 🚀 initLogin started');

  const loginButton = document.getElementById('login-button');
  const loadingSection = document.getElementById('loading');

  chrome.storage.local.get(['isLoggedIn'], function(result) {
    if (result.isLoggedIn) {
      console.log('[UI] ✅ Already logged in → loading timeline');
      loadTimeline(false); 
      chrome.runtime.sendMessage({ action: 'startFetchListeners' });
      chrome.runtime.sendMessage({ action: 'enableBackgroundSync' });
    } else {
      console.log('[UI] 👋 No login → showing login screen');
      showLogin(); 
    }
  });

  if (loginButton) {
    loginButton.addEventListener('click', function () {
      console.log('[UI] 🔐 Login button clicked');
      if (loadingSection) loadingSection.style.display = 'block';
      loginButton.disabled = true;

      chrome.runtime.sendMessage({ action: 'login' }, async function (response) {
        if (response && response.success) {
          console.log('[UI] ✅ Login response received');

          chrome.storage.local.clear(async function () {
            console.log('[UI] 🧹 Local storage cleared');

            await chrome.storage.local.set({ isLoggedIn: true });
            console.log('[UI] 📥 isLoggedIn saved');

            await fetchAndStoreUserName();

            const loginSection = document.getElementById('login-section');
            if (loginSection) loginSection.style.display = 'none';

            console.log('[UI] 🧱 Loading timeline...');
            await loadTimeline(true);

            console.log('[UI] 🔄 Sending messages to start listeners & sync');
            chrome.runtime.sendMessage({ action: 'startFetchListeners' });
            chrome.runtime.sendMessage({ action: 'enableBackgroundSync' });
          });

        } else {
          console.warn('[UI] ❌ Login failed:', response?.error);
          if (loadingSection) loadingSection.style.display = 'none';
          loginButton.disabled = false;
          alert('Login failed: ' + (response?.error || 'Unknown error'));
        }
      });
    });
  }
}

function showLogin() {
  const loginSection = document.getElementById('login-section');
  if (loginSection) loginSection.style.display = 'block';
}

async function loadTimeline(withAnimation) {
  await initTimeline();
  onTimelineInitialized();
  showTimeline(withAnimation);
  console.log('[UI] ✅ Timeline loaded');
}


export async function fetchAndStoreUserName() {
  try {
    const token = await getAuthToken();
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const profile = await response.json();
    const name = profile.given_name || profile.name || '';
    await chrome.storage.local.set({ userName: name });
    console.log('[Login] Stored user name:', name);
  } catch (err) {
    console.error('[Login] Failed to fetch user name:', err);
  }
}

// Attach this to your login button
document.getElementById('login-button').addEventListener('click', async () => {
  try {
    const token = await getAuthToken();

    // ✅ Fetch and store the name
    await fetchAndStoreUserName();

    // continue with your other logic, e.g.
    // await initTimeline();
    // hide login UI, show dashboard, etc.

  } catch (err) {
    console.error('[Login] Login failed:', err);
  }
});
