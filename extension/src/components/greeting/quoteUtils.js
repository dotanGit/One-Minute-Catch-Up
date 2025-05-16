import { greetingPhrases } from './greetingPhrases.js';

const QUOTE_KEY = 'dailyQuote';

export async function getDailyQuote() {
  const today = new Date().toISOString().split('T')[0];
  const result = await chrome.storage.local.get(QUOTE_KEY);
  const saved = result[QUOTE_KEY];

  if (saved && saved.date === today) {
    return { quote: saved.quote, author: saved.author };
  }

  const quotes = greetingPhrases.quotes;
  let index = saved?.index || 0;
  if (index >= quotes.length) index = 0;

  const { quote, author } = quotes[index];
  const newData = { quote, author, date: today, index: index + 1 };

  await chrome.storage.local.set({ [QUOTE_KEY]: newData });

  return { quote, author };
}
