import { initLogin } from '../components/login/login.js';
import { initTimelineMinimize } from '../components/timeline/timelineMinimize.js';
import { initDailyGreeting } from '../components/greeting/greetingManager.js';
import { renderGreeting } from '../components/greeting/greetingUI.js';
import { getUserSummary } from '../components/summary/userSummaryBuilder.js';

document.addEventListener('DOMContentLoaded', async () => {
  initLogin(); // login flow will now handle everything
  initTimelineMinimize();
  const summary = await getUserSummary(); // your logic here
  await initDailyGreeting(summary);
  await renderGreeting();
});
