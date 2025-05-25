import { isWeekend, isFirstDayOfWeek, getTimeBlock } from './greeting.js';
import { getWeekendGreeting } from './weekendGreeting.js';
import { getFirstDayGreeting } from './firstDayGreeting.js';
import { getMorningGreeting } from './morningGreeting.js';
import { getAfternoonGreeting } from './afternoonGreeting.js';
import { getEveningGreeting } from './eveningGreeting.js';

async function cleanOldGreetingCache(currentDate) {
    const allItems = await chrome.storage.local.get(null);
    const todayPrefix = `greeting_${currentDate}`;
  
    const keysToRemove = Object.keys(allItems).filter(
      (key) => key.startsWith('greeting_') && !key.startsWith(todayPrefix)
    );
  
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log('[🧹 GreetingCache] Removed old cache keys:', keysToRemove);
    } else {
      console.log('[🧹 GreetingCache] No old cache keys to clean.');
    }
  }
  
export async function preFetchNextGreeting() {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const currentTimeBlock = getTimeBlock();
  
  // Determine next time block
  let nextTimeBlock;
  const hour = now.getHours();
  if (hour < 4) nextTimeBlock = 'morning';
  else if (hour < 12) nextTimeBlock = 'afternoon';
  else if (hour < 18) nextTimeBlock = 'evening';
  else nextTimeBlock = 'morning'; // Next day's morning

  const cacheKey = isWeekend()
    ? `greeting_${date}_weekend`
    : isFirstDayOfWeek()
      ? `greeting_${date}_firstday_${nextTimeBlock}`
      : `greeting_${date}_${nextTimeBlock}`;

  // Only pre-fetch if it's not already cached
  const cached = await chrome.storage.local.get([cacheKey]);
  if (!cached[cacheKey]) {
    console.log(`[🔄 Greeting] Pre-fetching next greeting for: ${cacheKey}`);
    await getGreetingFromCacheOrGenerate();
  }
}

export async function getGreetingFromCacheOrGenerate() {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const timeBlock = getTimeBlock();
  
    const cacheKey = isWeekend()
      ? `greeting_${date}_weekend`
      : isFirstDayOfWeek()
        ? `greeting_${date}_firstday_${timeBlock}`
        : `greeting_${date}_${timeBlock}`;
  
    const cached = await chrome.storage.local.get([cacheKey]);
    if (cached[cacheKey]) {
      return cached[cacheKey];
    }
  
    // Show loading state
    const container = document.querySelector('#greeting-container');
    if (container) {
      container.querySelector('.greeting-heading').textContent = '🤖 AI is crafting your next update...';
      container.querySelector('.greeting-summary').innerHTML = '<div class="loading-dots">...</div>';
      container.querySelector('.greeting-quote').innerHTML = '';
    }
  
    // Start both the fetch and the minimum loading time
    const fetchPromise = (async () => {
      let heading = '';
      let summary = '';
      let quote = '';
      let author = '';
    
      if (isWeekend()) {
        ({ heading, summary, quote, author } = await getWeekendGreeting());
      } else if (isFirstDayOfWeek()) {
        ({ summary, quote, author } = await getFirstDayGreeting());
        if (timeBlock === 'morning') ({ heading } = await getMorningGreeting());
        else if (timeBlock === 'afternoon') ({ heading } = await getAfternoonGreeting());
        else ({ heading } = await getEveningGreeting());
      } else {
        if (timeBlock === 'morning') ({ heading, summary, quote, author } = await getMorningGreeting());
        else if (timeBlock === 'afternoon') ({ heading, summary, quote, author } = await getAfternoonGreeting());
        else ({ heading, summary, quote, author } = await getEveningGreeting());
      }
    
      await chrome.storage.local.set({
        [cacheKey]: { heading, summary, quote, author, timestamp: Date.now() }
      });
    
      return { heading, summary, quote, author };
    })();

    // Wait for both the minimum time and the fetch to complete
    const [result] = await Promise.all([
      fetchPromise,
      new Promise(resolve => setTimeout(resolve, 3000)) // 3 seconds minimum
    ]);

    return result;
}