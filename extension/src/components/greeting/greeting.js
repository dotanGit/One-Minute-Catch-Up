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

// Add these new functions for caching
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
  console.log('[GREETING] Checking greeting type...');
  
  // Check if it's first day of the week
  if (isFirstDayOfWeek()) {
    console.log('[GREETING] First day of week - generating new greeting');
    return await getFirstDayGreeting();
  }
  
  // Check if it's weekend first and if we have the required weekend configuration
  if (isWeekend() && WEEKEND_DAYS && WEEKEND_PHRASE) {
    console.log('[GREETING] Weekend - generating new greeting');
    return await getWeekendGreeting();
  }

  // Check cache first
  const cacheKey = getGreetingCacheKey();
  console.log('[GREETING] Checking cache with key:', cacheKey);
  
  const cachedGreeting = await getCachedGreeting();
  if (cachedGreeting) {
    const cacheAge = Date.now() - cachedGreeting.timestamp;
    // Cache expires after 4 hours
    if (cacheAge < 4 * 60 * 60 * 1000) {
      console.log('[GREETING] ✅ Using cached greeting (age:', Math.round(cacheAge / 1000 / 60), 'minutes)');
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
  
  console.log('[GREETING] Generating new greeting for hour:', hour);
  if (hour < 12) {
    greeting = await getMorningGreeting();
  } else if (hour < 17) {
    greeting = await getAfternoonGreeting();
  } else {
    greeting = await getEveningGreeting();
  }

  // Cache the new greeting
  await cacheGreeting(greeting);
  console.log('[GREETING] 💾 Generated and cached new greeting');

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
  container.querySelector('.greeting-summary').innerHTML = isWeekend() && WEEKEND_DAYS && WEEKEND_PHRASE
    ? greeting.summary 
    : `Week Goal: ${WEEKLY_GOAL}<br>${greeting.summary}`;
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


