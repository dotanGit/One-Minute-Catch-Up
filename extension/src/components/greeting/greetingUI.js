// greeting/greetingUI.js
import { getTodayGreeting, getTimeBasedGreeting, capitalizeFirstLetter } from './greetingManager.js';

export async function renderGreeting(containerSelector = '#greeting-container') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const { userName } = await chrome.storage.local.get(['userName']);
  const greeting = await getTodayGreeting(userName);
  if (!greeting) return;

  // First-time greeting format (detected by known phrase)
  if (greeting.includes("I'm your new assistant")) {
    container.innerHTML = `
      <div class="daily-greeting">
        <p class="greeting-text">${greeting}</p>
      </div>
    `;
    return;
  }

  const [main, quote] = greeting.split('. ', 2);
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
