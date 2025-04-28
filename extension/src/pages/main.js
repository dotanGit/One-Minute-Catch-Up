import { initLogin, loadTimeline } from '../components/login/login.js';
import { initTimelineMinimize } from '../components/timeline/timelineMinimize.js';
import { initDailyGreeting } from '../components/greeting/greetingManager.js';
import { renderGreeting } from '../components/greeting/greetingUI.js';
import { getUserSummary } from '../components/summary/userSummaryBuilder.js';

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

  // Proceed with greeting and summary
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const summary = await getUserSummary(yesterday);
  
  await initDailyGreeting(summary);
  await renderGreeting();
});
