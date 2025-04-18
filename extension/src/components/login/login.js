import { showTimeline } from '../timeline/timeline.js';
import { initTimeline } from '../timeline/timeline.js';
import { onTimelineInitialized } from '../timeline/timelineDomUtils.js';

export function initLogin() {
  console.log('Login initialized');

  const loginButton = document.getElementById('login-button');
  const loadingSection = document.getElementById('loading');

  chrome.storage.local.get(['isLoggedIn'], function(result) {
    if (result.isLoggedIn) {
      loadTimeline(false); // user already logged in
    } else {
      showLogin(); // show login screen
    }
  });

  if (loginButton) {
    loginButton.addEventListener('click', function () {
      if (loadingSection) loadingSection.style.display = 'block';
      loginButton.disabled = true;

      // Ask background to login
      chrome.runtime.sendMessage({ action: 'login' }, async function (response) {
        if (response && response.success) {
          console.log('[LOGIN] ✅ Google login approved, now clearing cache...');
          
          // Clear all cached data
          chrome.storage.local.clear(async function () {
            console.log('[LOGIN] 🧹 Cache cleared');

            // Explicitly mark user as logged in again after clearing
            await chrome.storage.local.set({ isLoggedIn: true });

            // Hide login screen immediately
            const loginSection = document.getElementById('login-section');
            if (loginSection) loginSection.style.display = 'none';

            // Start syncing background data
            chrome.runtime.sendMessage({ action: 'triggerSync' });

            // Show timeline and init
            loadTimeline(true);

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


