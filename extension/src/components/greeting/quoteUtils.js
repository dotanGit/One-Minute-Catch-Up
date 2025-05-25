import { greetingPhrases } from './greetingPhrases.js';

const QUOTE_KEY = 'dailyQuote';

export async function getDailyQuote() {
  const now = new Date();
  const hour = now.getHours();
  
  // If it's before 4 AM, use yesterday's date
  const date = hour < 4 
    ? new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : now.toISOString().split('T')[0];

  const result = await chrome.storage.local.get(QUOTE_KEY);
  const saved = result[QUOTE_KEY];

  if (saved && saved.date === date) {
    return { quote: saved.quote, author: saved.author };
  }

  const quotes = greetingPhrases.quotes;
  let index = saved?.index || 0;
  if (index >= quotes.length) index = 0;

  const { quote, author } = quotes[index];
  const newData = { quote, author, date: date, index: index + 1 };

  await chrome.storage.local.set({ [QUOTE_KEY]: newData });

  return { quote, author };
}
