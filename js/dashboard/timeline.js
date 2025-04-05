import { normalizeDateToStartOfDay } from '../utils/dateUtils.js';


// Initialize currentDate at the top level
let currentDate = normalizeDateToStartOfDay(new Date());

// Function to get date key for cache
function getDateKey(date) {
  return date.toISOString().split('T')[0];
}

// Function to format date for display
function formatDate(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
}

export function initTimeline() {
  console.log('Timeline initialized');
}

export function showTimeline() {
  const loginSection = document.getElementById('login-section');
  const loadingSection = document.getElementById('loading');
  const timelineWrapper = document.querySelector('.timeline-wrapper');

  if (loginSection) loginSection.style.display = 'none';
  if (loadingSection) loadingSection.style.display = 'none';
  if (timelineWrapper) timelineWrapper.style.display = 'block';
}
