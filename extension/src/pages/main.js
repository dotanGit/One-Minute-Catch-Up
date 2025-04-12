import { initLogin } from '../components/login/login.js';
import { initTimeline } from '../components/timeline/timeline.js';
import { initShortcuts } from '../components/shortcuts/shortcuts.js';

document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initTimeline();
  initShortcuts();
});
