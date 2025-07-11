import { initLogin, loadTimeline } from '../components/login/login.js';
import { initTimelineMinimize } from '../components/timeline/timelineMinimize.js';
import { renderGreeting } from '../components/greeting/greeting.js';
import { shortcutsManager } from '../components/search/searchShortcuts.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check login status first
  const { isLoggedIn } = await chrome.storage.local.get(['isLoggedIn']);

  if (!isLoggedIn) {
    // Only wait for login if not already logged in
    await initLogin();
  } else {
    // If already logged in, just initialize timeline right away
    initTimelineMinimize();
    loadTimeline(false);

  }

  // Render the appropriate greeting based on time of day
  await renderGreeting();
  shortcutsManager.renderShortcuts();
});
