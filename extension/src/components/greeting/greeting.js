import { getMorningGreeting } from './morningGreeting.js';
import { getAfternoonGreeting } from './afternoonGreeting.js';
import { getEveningGreeting } from './eveningGreeting.js';
import { getWeekendGreeting } from './weekendGreeting.js';
import { getFirstDayGreeting } from './firstDayGreeting.js';

// Constants
export const OPENAI_API_KEY = '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';

// Goals (temporary until user input is implemented)
export const WEEKLY_GOAL = "Complete Catch UP project";
export const DAILY_GOAL = "Implement the new feature and review pull requests";
export const USER_ROLE = "Computer Science Student";
export const USER_INTRESTS = "Math, Physics , AI";
export const WEEKEND_DAYS = ['5', '6'];
export const WEEKEND_PHRASE = "Shabat Shalom";


// Time utilities
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Good night';
}

function isWeekend() {
  // Only consider it weekend if both WEEKEND_DAYS and WEEKEND_PHRASE are defined
  if (!WEEKEND_DAYS || !WEEKEND_PHRASE) return false;
  
  const day = new Date().getDay().toString();
  return WEEKEND_DAYS.includes(day);
}

function isFirstDayOfWeek() {
  // Only check for first day if WEEKEND_DAYS is defined
  if (!WEEKEND_DAYS) return false;
  
  const day = new Date().getDay().toString();
  // Get the last weekend day
  const lastWeekendDay = Math.max(...WEEKEND_DAYS.map(Number));
  // Check if current day is the day after the last weekend day
  return day === ((lastWeekendDay + 1) % 7).toString();
}

async function getGreetingForTime() {
  // Check if it's first day of the week
  if (isFirstDayOfWeek()) {
    return await getFirstDayGreeting();
  }
  
  // Check if it's weekend first and if we have the required weekend configuration
  if (isWeekend() && WEEKEND_DAYS && WEEKEND_PHRASE) {
    return await getWeekendGreeting();
  }

  const hour = new Date().getHours();
  
  if (hour < 12) {
    return await getMorningGreeting();
  } else if (hour < 17) {
    return await getAfternoonGreeting();
  } else {
    return await getEveningGreeting();
  }
}

// UI Component
export async function renderGreeting(containerSelector = '#greeting-container') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Get user name
  const { userName } = await chrome.storage.local.get(['userName']);
  
  // Get appropriate greeting based on time of day
  const greeting = await getGreetingForTime();
  const timeGreeting = getTimeBasedGreeting();
  const name = userName ? `${userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase()}` : '';

  // Update UI
  container.querySelector('.greeting-heading').textContent = isWeekend() && WEEKEND_DAYS && WEEKEND_PHRASE
    ? `${WEEKEND_PHRASE} ${name}!`
    : isFirstDayOfWeek()
    ? `Good Week ${name}!`
    : `${timeGreeting}, ${name}`;
  container.querySelector('.greeting-summary').innerHTML = isWeekend() && WEEKEND_DAYS && WEEKEND_PHRASE
    ? greeting.summary 
    : `Week Goal: ${WEEKLY_GOAL}<br>${greeting.summary}`;
  container.querySelector('.greeting-quote').textContent = greeting.quote;
}
