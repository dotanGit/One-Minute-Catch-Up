import { getMorningGreeting } from './morningGreeting.js';
import { getAfternoonGreeting } from './afternoonGreeting.js';
import { getEveningGreeting } from './eveningGreeting.js';
import { getWeekendGreeting } from './weekendGreeting.js';
import { getFirstDayGreeting } from './firstDayGreeting.js';

// Constants
export const OPENAI_API_KEY = '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';

// Goals (temporary until user input is implemented)
export const WEEKLY_GOAL = "Complete Catch UP project";
export const DAILY_GOAL = "Working out, job interview, school";
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
  if (!WEEKEND_DAYS || !WEEKEND_PHRASE) return false;
  
  const day = new Date().getDay().toString();
  return WEEKEND_DAYS.includes(day);
}

function isFirstDayOfWeek() {
  if (!WEEKEND_DAYS) return false;
  
  const day = new Date().getDay().toString();
  const lastWeekendDay = Math.max(...WEEKEND_DAYS.map(Number));
  return day === ((lastWeekendDay + 1) % 7).toString();
}

// Cache Handle 
function getGreetingCacheKey() {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const hour = now.getHours();
  let timePeriod;
  
  if (hour < 12) timePeriod = 'morning';
  else if (hour < 17) timePeriod = 'afternoon';
  else timePeriod = 'evening';
  
  return `greeting_${date}_${timePeriod}`;
}

async function getCachedGreeting() {
  const cacheKey = getGreetingCacheKey();
  const result = await chrome.storage.local.get(cacheKey);
  return result[cacheKey];
}

async function cacheGreeting(greeting) {
  const cacheKey = getGreetingCacheKey();
  await chrome.storage.local.set({
    [cacheKey]: {
      ...greeting,
      timestamp: Date.now()
    }
  });
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

  // Check cache first
  const cacheKey = getGreetingCacheKey();
  
  const cachedGreeting = await getCachedGreeting();
  if (cachedGreeting) {
    const cacheAge = Date.now() - cachedGreeting.timestamp;
    // Cache expires after 4 hours
    if (cacheAge < 4 * 60 * 60 * 1000) {
      return {
        summary: cachedGreeting.summary,
        quote: cachedGreeting.quote,
        author: cachedGreeting.author
      };
    } else {
      console.log('[GREETING] ❌ Cache expired (age:', Math.round(cacheAge / 1000 / 60), 'minutes)');
    }
  } else {
    console.log('[GREETING] ❌ No cached greeting found');
  }

  const hour = new Date().getHours();
  let greeting;
  
  if (hour < 12) {
    greeting = await getMorningGreeting();
  } else if (hour < 17) {
    greeting = await getAfternoonGreeting();
  } else {
    greeting = await getEveningGreeting();
  }

  // Cache the new greeting
  await cacheGreeting(greeting);
  return greeting;
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


    const hour = new Date().getHours();
    let summaryContent;
    
    if (isWeekend() && WEEKEND_DAYS && WEEKEND_PHRASE) {
      summaryContent = greeting.summary;
    } else if (hour < 12) {
      summaryContent = WEEKLY_GOAL
        ? `Week Goal: ${WEEKLY_GOAL}<br>${greeting.summary}`
        : greeting.summary;
    } else {
      summaryContent = DAILY_GOAL
        ? `Today's Goal: ${DAILY_GOAL}<br>${greeting.summary}`
        : greeting.summary;
    }    
    container.querySelector('.greeting-summary').innerHTML = summaryContent;
    

    const quoteElement = container.querySelector('.greeting-quote');
    if (greeting.author) {
      quoteElement.innerHTML = `${greeting.quote} – <a href="#" class="quote-author" data-author="${greeting.author}">${greeting.author}</a>`;
    
      const authorLink = quoteElement.querySelector('.quote-author');
      authorLink.addEventListener('click', async (e) => {
        e.preventDefault();
    
        const author = e.target.dataset.author;
        const modal = document.getElementById('authorModal');
    
        // Fetch data from Wikipedia
        let wikiData = {};
        try {
          const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(author)}`);
          wikiData = await res.json();
        } catch (err) {
          console.warn('Wikipedia fetch failed:', err);
        }
    
        // Fill modal
        document.getElementById('author-name').textContent = author;
        document.getElementById('author-image').src = wikiData?.thumbnail?.source || '';
        document.getElementById('author-image').alt = `Photo of ${author}`;
        document.getElementById('author-description').textContent = wikiData?.extract || 'No Wikipedia summary available.';
        document.getElementById('author-link').href = wikiData?.content_urls?.desktop?.page || '#';
        document.getElementById('author-link').textContent = 'View on Wikipedia';
        
    
        // Show modal
        modal.style.display = 'flex';
      });
    } else {
      quoteElement.textContent = `${greeting.quote}`;
    }    
}

document.querySelector('.author-modal-close').addEventListener('click', () => {
  const modal = document.getElementById('authorModal');
  modal.style.display = 'none';
});


