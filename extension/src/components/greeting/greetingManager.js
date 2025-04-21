// greeting/greetingManager.js
import { buildGreetingPrompt } from './greetingPromptBuilder.js';
import { getGreeting, saveGreeting } from './greetingStorage.js';
import { callGptGreeting } from './greetingService.js';

export async function initDailyGreeting(userSummary) {

  const todayKey = new Date().toISOString().split('T')[0]; // e.g. "2025-04-21"

  const existing = await getGreeting(todayKey);
  if (existing) {
    console.log('[Greeting] Found cached greeting:', existing);
    return;
  }

  const prompt = buildGreetingPrompt(userSummary);
  const greeting = await callGptGreeting(prompt);
  console.log('[Greeting] Final greeting output:', greeting);

  if (greeting) {
    await saveGreeting(todayKey, greeting);
    console.log('[Greeting] Saved new greeting:', greeting);
  }
}

export async function getTodayGreeting() {
  const todayKey = new Date().toISOString().split('T')[0];
  return await getGreeting(todayKey);
}
