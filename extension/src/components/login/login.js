import { showTimeline } from '../timeline/timeline.js';
import { initTimeline } from '../timeline/timeline.js';
import { onTimelineInitialized } from '../timeline/timelineDomUtils.js';
import { getAuthToken } from '../../utils/auth.js';


export function initLogin() {
  return new Promise((resolve) => {

    const loginButton = document.getElementById('login-button');
    const loadingSection = document.getElementById('loading');

    chrome.storage.local.get(['isLoggedIn'], function(result) {
      if (result.isLoggedIn) {
        loadTimeline(false).then(resolve);
        chrome.runtime.sendMessage({ action: 'startFetchListeners' });
        chrome.runtime.sendMessage({ action: 'enableBackgroundSync' });
      } else {
        showLogin();
        // Attach to login button
        if (loginButton) {
          loginButton.addEventListener('click', function handler() {
            loginButton.removeEventListener('click', handler); // prevent double
            if (loadingSection) loadingSection.style.display = 'block';
            loginButton.disabled = true;

            chrome.runtime.sendMessage({ action: 'login' }, async function (response) {
              if (response && response.success) {

                chrome.storage.local.clear(async function () {

                  await chrome.storage.local.set({ isLoggedIn: true });

                  await fetchAndStoreUserName();

                  const loginSection = document.getElementById('login-section');
                  if (loginSection) loginSection.style.display = 'none';

                  await loadTimeline(true);

                  chrome.runtime.sendMessage({ action: 'startFetchListeners' });
                  chrome.runtime.sendMessage({ action: 'enableBackgroundSync' });
                  resolve(); // resolve after login and timeline load
                });

              } else {
                console.warn('[UI] ❌ Login failed:', response?.error);
                if (loadingSection) loadingSection.style.display = 'none';
                loginButton.disabled = false;
                alert('Login failed: ' + (response?.error || 'Unknown error'));
                resolve(); // still resolve to avoid hanging
              }
            });
          });
        }
      }
    });
  });
}

function showLogin() {
  const loginSection = document.getElementById('login-section');
  if (loginSection) loginSection.style.display = 'block';
}

export async function loadTimeline(withAnimation) {
  await initTimeline();
  onTimelineInitialized();
  showTimeline(withAnimation);
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
    await fetchAndStoreUserName();
  } catch (err) {
    console.error('[Login] Login failed:', err);
  }
});
