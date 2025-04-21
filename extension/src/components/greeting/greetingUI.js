// greeting/greetingUI.js
import { getTodayGreeting } from './greetingManager.js';

export async function renderGreeting(containerSelector = '#greeting-container') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const greeting = await getTodayGreeting();
  if (!greeting) return;

  // 🔹 Split AI message into 2 parts (main + quote)
  const [main, quote] = greeting.split('. ', 2);

  // 🔹 Get time-based greeting and stored user name
  const { userName } = await chrome.storage.local.get(['userName']);
  const name = userName ? `, ${capitalizeFirstLetter(userName)}` : '';
  const timeGreeting = getTimeBasedGreeting();

  container.innerHTML = `
    <div class="daily-greeting">
      <p class="greeting-time">${timeGreeting}${name}.</p>
      <p class="greeting-text">${main?.trim()}.</p>
      ${quote ? `<p class="greeting-quote">"${quote?.trim()}"</p>` : ''}
    </div>
  `;
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