// greeting/greetingUI.js
import { getTodayGreeting, getTimeBasedGreeting, capitalizeFirstLetter } from './greetingManager.js';

export async function renderGreeting(containerSelector = '#greeting-container') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const { userName } = await chrome.storage.local.get(['userName']);
  const greeting = await getTodayGreeting(userName);
  const timeGreeting = getTimeBasedGreeting();
  const name = userName ? `, ${capitalizeFirstLetter(userName)}` : '';

  // Update the existing elements
  container.querySelector('.greeting-heading').textContent = `${timeGreeting}${name}.`;
  container.querySelector('.greeting-summary').textContent = greeting.summary;
  if (greeting.quote) {
    container.querySelector('.greeting-quote').textContent = greeting.quote;
  }
}
