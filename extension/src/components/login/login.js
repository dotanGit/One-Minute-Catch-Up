import { showTimeline } from '../timeline/timeline.js';
import { initTimeline } from '../timeline/timeline.js';
import { onTimelineInitialized } from '../timeline/timelineDomUtils.js';

export function initLogin() {
  console.log('[UI] 🚀 initLogin started');

  const loginButton = document.getElementById('login-button');
  const loadingSection = document.getElementById('loading');

  chrome.storage.local.get(['isLoggedIn'], function(result) {
    if (result.isLoggedIn) {
      console.log('[UI] ✅ Already logged in → loading timeline');
      loadTimeline(false); 
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
