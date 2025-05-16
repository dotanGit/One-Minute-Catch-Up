import { greetingPhrases } from './greetingPhrases.js';
import { getDailyQuote } from './quoteUtils.js';
import { OPENAI_API_KEY } from './greeting.js';
import { getUserSummary } from '../summary/userSummaryBuilder.js';

const MORNING_INDEX_KEY = 'morningHeadingIndex';

export async function getMorningGreeting() {
  // --- Heading ---
  const headings = greetingPhrases.morning;
  const result = await chrome.storage.local.get([MORNING_INDEX_KEY]);
  const index = result[MORNING_INDEX_KEY] || 0
  const heading = headings[index % headings.length];
  await chrome.storage.local.set({ [MORNING_INDEX_KEY]: (index + 1) % headings.length });

  // --- Summary from GPT ---
  const userSummary = await getUserSummary(new Date());
  const prompt = `
You're an assistant that gives short, witty morning recaps. Based on the following user data, return one fun or impressive thing the user did yesterday — in a sentence or two. Be upbeat, motivating, and keep it under 20 words.

USER DATA:
${userSummary}

OUTPUT ONLY THE TEXT. No titles or labels.
`.trim();

  const summary = await fetchOpenAISummary(prompt);

  // --- Quote ---
  const { quote, author } = await getDailyQuote();

  return { heading, summary, quote, author };
}

// GPT helper
async function fetchOpenAISummary(prompt) {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 50
      })
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || 'Started the day strong!';
  } catch (err) {
    console.warn('[MorningGreeting] ChatGPT failed:', err);
    return 'Started the day strong!';
  }
}
