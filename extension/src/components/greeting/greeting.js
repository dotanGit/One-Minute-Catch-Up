import { getGreetingFromCacheOrGenerate } from './greetingCacheManager.js';

// Constants
export const OPENAI_API_KEY = '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';

export const WEEKEND_DAYS = ['5', '6'];
export const WEEKEND_PHRASE = 'Shabat Shalom';
export const FIRST_DAY_OF_THE_WEEK = (Number(WEEKEND_DAYS[1]) + 1) % 7;

export function isWeekend() {
  const day = new Date().getDay().toString();
  return WEEKEND_DAYS.includes(day);
}

export function isFirstDayOfWeek() {
  return new Date().getDay() === FIRST_DAY_OF_THE_WEEK;
}

export function getTimeBlock() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening'; // This will cover 18:00-23:59 and 00:00-03:59
}


export async function renderGreeting(containerSelector = '#greeting-container') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const { userName } = await chrome.storage.local.get(['userName']);
  const name = userName ? `${userName.charAt(0).toUpperCase()}${userName.slice(1).toLowerCase()}` : '';

  const { heading, summary, quote, author } = await getGreetingFromCacheOrGenerate();

  // Format heading
  const headingText = isWeekend()
    ? `${heading} ${name}`.trim()
    : heading.includes('${name}')
      ? heading.replace(/\$\{name\}/g, name)
      : heading;

  // Inject into DOM
  container.querySelector('.greeting-heading').textContent = headingText;
  container.querySelector('.greeting-summary').innerHTML = summary;
  container.querySelector('.greeting-quote').innerHTML =
    author
      ? `"${quote}" – <a href="#" class="quote-author" data-author="${author}">${author}</a>`
      : `"${quote}"`;
}




// ========================= Author Modal =========================
document.querySelector('.author-modal-close').addEventListener('click', () => {
  const modal = document.getElementById('authorModal');
  modal.style.display = 'none';
});

document.addEventListener('click', async (e) => {
  const link = e.target.closest('.quote-author');
  if (!link) return;

  e.preventDefault();
  const author = link.dataset.author;
  const modal = document.getElementById('authorModal');

  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(author)}`);
    const data = await res.json();

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
