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
  
export async function getGreetingFromCacheOrGenerate() {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const timeBlock = getTimeBlock();
  
    const cacheKey = isWeekend()
      ? `greeting_${date}_weekend`
      : isFirstDayOfWeek()
        ? `greeting_${date}_firstday_${timeBlock}`
        : `greeting_${date}_${timeBlock}`;
  
    console.log(`[⏱️ Greeting] Today: ${date}, Time Block: ${timeBlock}`);
    console.log(`[📦 Greeting] Cache key: ${cacheKey}`);
  
    const cached = await chrome.storage.local.get([cacheKey]);
    if (cached[cacheKey]) {
      console.log(`[✅ Greeting] Loaded from cache: ${cacheKey}`);
      return cached[cacheKey];
    }
  
    console.log(`[⚠️ Greeting] Cache miss → generating new greeting for: ${cacheKey}`);
  
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
  
    console.log(`[💾 Greeting] Saved new greeting to cache: ${cacheKey}`);
    await cleanOldGreetingCache(date);
  
    return { heading, summary, quote, author };
  }