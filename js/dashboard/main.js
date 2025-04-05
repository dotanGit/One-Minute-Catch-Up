import { initLogin } from './login.js';
import { initTimeline } from './timeline.js';
import { initShortcuts } from './shortcuts.js';

document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initTimeline();
  initShortcuts();
});
