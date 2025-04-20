import { initLogin } from '../components/login/login.js';
import { initTimelineMinimize } from '../components/timeline/timelineMinimize.js';

document.addEventListener('DOMContentLoaded', () => {
  initLogin(); // login flow will now handle everything
  initTimelineMinimize();
});
