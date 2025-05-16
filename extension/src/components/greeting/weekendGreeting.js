import { greetingPhrases } from './greetingPhrases.js';
import { getDailyQuote } from './quoteUtils.js';

const WEEKEND_INDEX_KEY = 'weekendPhraseIndex';
const WEEKEND_PHRASE = 'Shabat Shalom';

export async function getWeekendGreeting() {
  const { [WEEKEND_INDEX_KEY]: storedIndex = 0 } = await chrome.storage.local.get([WEEKEND_INDEX_KEY]);
  const phrases = greetingPhrases.weekend;

  const index = storedIndex % phrases.length;
  const summary = phrases[index];

  const { quote, author } = await getDailyQuote();
  const heading = WEEKEND_PHRASE;

  await chrome.storage.local.set({ [WEEKEND_INDEX_KEY]: (index + 1) % phrases.length });

  return { heading, summary, quote, author };
}
