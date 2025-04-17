import { initLogin } from '../components/login/login.js';
import { initTimeline } from '../components/timeline/timeline.js';
import { onTimelineInitialized } from '../components/timeline/timelineDomUtils.js';

document.addEventListener('DOMContentLoaded', async () => {
  initLogin();
  await initTimeline();
  onTimelineInitialized();
});
