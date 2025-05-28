import { greetingPhrases } from './greetingPhrases.js';
import { getDailyQuote } from './quoteUtils.js';

const NEW_WEEK_INDEX_KEY = 'newWeekSummaryIndex';

export async function getFirstDayGreeting() {
  const phrases = greetingPhrases.newWeek;
  const result = await chrome.storage.local.get([NEW_WEEK_INDEX_KEY]);
  const index = result[NEW_WEEK_INDEX_KEY] || 0
  const summary = phrases[index % phrases.length];
  await chrome.storage.local.set({ [NEW_WEEK_INDEX_KEY]: (index + 1) % phrases.length });

  const { quote, author } = await getDailyQuote();

  return { summary, quote, author }; // No heading here
}
