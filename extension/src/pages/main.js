import { initLogin, loadTimeline } from '../components/login/login.js';
import { initTimelineMinimize } from '../components/timeline/timelineMinimize.js';
import { renderGreeting } from '../components/greeting/greeting.js';
import { getUserSummary } from '../components/summary/userSummaryBuilder.js';
import { shortcutsManager } from '../components/search/searchShortcuts.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check login status first
  const { isLoggedIn } = await chrome.storage.local.get(['isLoggedIn']);

  if (!isLoggedIn) {
    // Only wait for login if not already loggeßd in
    await initLogin();
  } else {
    // If already logged in, just initialize timeline right away
    initTimelineMinimize();
    loadTimeline(false);
  }

  // Proceed with greeting and summary
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const summary = await getUserSummary(yesterday);
  
  await renderGreeting();
});
