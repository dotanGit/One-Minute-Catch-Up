import { showTimeline } from './timeline.js';


export function initLogin() {
    console.log('Login initialized');
    const loginButton = document.getElementById('login-button');
    const loginSection = document.getElementById('login-section');
    const loadingSection = document.getElementById('loading');
    const timelineWrapper = document.querySelector('.timeline-wrapper');

    if (loginButton) {
        loginButton.addEventListener('click', function() {
            if (loadingSection) loadingSection.style.display = 'block';
          loginButton.disabled = true;
          
          chrome.runtime.sendMessage({ action: 'login' }, function(response) {
            if (response && response.success) {
                showTimeline();
            } else {
                if (loadingSection) loadingSection.style.display = 'none';
              loginButton.disabled = false;
              alert('Login failed: ' + (response?.error || 'Unknown error'));
            }
          });
        });
        }
  }
  