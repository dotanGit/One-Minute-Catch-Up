import { getGreetingFromCacheOrGenerate } from './greetingCacheManager.js';
import { keys } from '../../../keys.js';

// Constants
export const OPENAI_API_KEY = keys.apiKey;

// Weekend configuration
export const WEEKEND_DAYS = ['5', '6'];
export const WEEKEND_PHRASE = 'Shabat Shalom';
export const FIRST_DAY_OF_THE_WEEK = (Number(WEEKEND_DAYS[1]) + 1) % 7;

// Checks if current day is weekend
export function isWeekend() {
  const day = new Date().getDay().toString();
  return WEEKEND_DAYS.includes(day);
}

// Checks if current day is first day of week
export function isFirstDayOfWeek() {
  return new Date().getDay() === FIRST_DAY_OF_THE_WEEK;
}

// Determines current time block based on hour
export function getTimeBlock() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening'; // This will cover 18:00-23:59 and 00:00-03:59
}


// Main function to render greeting in the UI
export async function renderGreeting(containerSelector = '#greeting-container') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Get user's name from storage and format it
  const { userName } = await chrome.storage.local.get(['userName']);
  const name = userName ? `${userName.charAt(0).toUpperCase()}${userName.slice(1).toLowerCase()}` : '';

  // Get greeting data from cache or generate new
  const { heading, summary, quote, author } = await getGreetingFromCacheOrGenerate();

   // Format heading based on whether it's weekend or not
  const headingText = isWeekend()
    ? `${heading} ${name}`.trim()
    : heading.includes('${name}')
      ? heading.replace(/\$\{name\}/g, name)
      : heading;

  // Update UI elements
  container.querySelector('.greeting-heading').textContent = headingText;
  container.querySelector('.greeting-summary').innerHTML = summary;
  container.querySelector('.greeting-quote').innerHTML =
    author
      ? `"${quote}" – <a href="#" class="quote-author" data-author="${author}">${author}</a>`
      : `"${quote}"`;
}


// Checks for time block changes every minute, this is per tab and not background
function checkTimeBlockChange() {
  const now = new Date();
  const hour = now.getHours();
  
  // Update greeting at time block boundaries
  if (hour === 4 || hour === 12 || hour === 18) {
    renderGreeting('#greeting-container', true);
  }
}

// Add this to your initialization code
setInterval(checkTimeBlockChange, 60000); // Check every minute


// ========================= Author Modal =========================
document.querySelector('.author-modal-close').addEventListener('click', () => {
  const modal = document.getElementById('authorModal');
  modal.style.display = 'none';
});

// Click handler for quote author links
document.addEventListener('click', async (e) => {
  const link = e.target.closest('.quote-author');
  if (!link) return;

  e.preventDefault();
  const author = link.dataset.author;
  const modal = document.getElementById('authorModal');

  // Fetch author info from Wikipedia
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(author)}`);
    const data = await res.json();

    // Update modal content
    document.getElementById('author-name').textContent = author;
    document.getElementById('author-image').src = data?.thumbnail?.source || '';
    document.getElementById('author-image').alt = `Photo of ${author}`;
    document.getElementById('author-description').textContent = data?.extract || 'No summary available.';
    document.getElementById('author-link').href = data?.content_urls?.desktop?.page || '#';
    document.getElementById('author-link').textContent = 'View on Wikipedia';
  } catch (err) {
    console.warn('Wikipedia fetch failed:', err);
  }

  modal.style.display = 'flex';
});

