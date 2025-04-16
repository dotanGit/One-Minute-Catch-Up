import { showTimeline } from '../timeline/timeline.js';

export function initLogin() {
  console.log('Login initialized');

  const loginButton = document.getElementById('login-button');
  const loginSection = document.getElementById('login-section');
  const loadingSection = document.getElementById('loading');
  const timelineWrapper = document.querySelector('.timeline-wrapper');

  // Check if user is already logged in
  chrome.storage.local.get(['isLoggedIn'], function(result) {
    if (result.isLoggedIn) {
      showTimeline(false); // Regular load, no loading animation
    } else {
      showLogin(); // Otherwise, show the login screen
    }
  });


  if (loginButton) {
    loginButton.addEventListener('click', function() {
      if (loadingSection) loadingSection.style.display = 'block';
      loginButton.disabled = true;

      chrome.runtime.sendMessage({ action: 'login' }, function(response) {
        if (response && response.success) {
          // Save login status
          chrome.storage.local.set({ isLoggedIn: true }, function() {
            showTimeline(true); // First login, show loading animation
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
