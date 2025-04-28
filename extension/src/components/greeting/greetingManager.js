// greeting/greetingManager.js
import { buildGreetingPrompt } from './greetingPromptBuilder.js';
import { getGreeting, saveGreeting } from './greetingStorage.js';
import { callGptGreeting } from './greetingService.js';

function getYesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

export async function initDailyGreeting(userSummary) {
  const yesterdayKey = getYesterdayKey();
  console.log('[DEBUG] Yesterday Key:', yesterdayKey);
  const existing = await getGreeting(yesterdayKey);

  if (existing) {
    console.log('[Greeting] Found cached greeting:', existing);
    return;
  }

  const prompt = buildGreetingPrompt(userSummary);
  const greeting = await callGptGreeting(prompt);
  console.log('[Greeting] Final greeting output:', greeting);

  if (greeting) {
    await saveGreeting(yesterdayKey, greeting);
    console.log('[Greeting] Saved new greeting:', greeting);
  }
}

export async function getTodayGreeting(userName) {
  const yesterdayKey = getYesterdayKey();
  const greeting = await getGreeting(yesterdayKey);
  if (greeting) return greeting;

  const time = getTimeBasedGreeting();
  const name = userName ? `, ${capitalizeFirstLetter(userName)}` : '';
  const quote = `"Every day is a fresh start." – Mary Pickford`;

  return `${time}${name}. I'm your new assistant. Tomorrow I'll give you a summary based on what you did today. ${quote}`;
}

export function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Good night';
}

export function capitalizeFirstLetter(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}
