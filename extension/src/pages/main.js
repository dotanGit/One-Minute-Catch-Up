import { initLogin } from '../components/login/login.js';
import { initTimeline } from '../components/timeline/timeline.js';

document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initTimeline();
});
