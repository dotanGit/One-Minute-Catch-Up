import { showTimeline } from '../timeline/timeline.js';
import { initTimeline } from '../timeline/timeline.js';
import { onTimelineInitialized } from '../timeline/timelineDomUtils.js';

export function initLogin() {
  console.log('Login initialized');

  const loginButton = document.getElementById('login-button');
  const loadingSection = document.getElementById('loading');

  chrome.storage.local.get(['isLoggedIn'], function(result) {
    if (result.isLoggedIn) {
      loadTimeline(false); 
    } else {
      showLogin(); 
    }
  });

  if (loginButton) {
    loginButton.addEventListener('click', function () {
      if (loadingSection) loadingSection.style.display = 'block';
      loginButton.disabled = true;

      chrome.runtime.sendMessage({ action: 'login' }, async function (response) {
        if (response && response.success) {
          console.log('[LOGIN] ✅ Google login approved, now clearing cache...');
          
          chrome.storage.local.clear(async function () {
            console.log('[LOGIN] 🧹 Cache cleared');

            await chrome.storage.local.set({ isLoggedIn: true });

            const loginSection = document.getElementById('login-section');
            if (loginSection) loginSection.style.display = 'none';

            // ✅ First build the timeline
            await loadTimeline(true);
            
            // ✅ Then allow background sync (and trigger it)
            chrome.runtime.sendMessage({ action: 'startFetchListeners' });
            chrome.runtime.sendMessage({ action: 'enableBackgroundSync' });

          });
        } else {
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
}


