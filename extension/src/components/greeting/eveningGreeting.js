import { greetingPhrases } from './greetingPhrases.js';
import { getDailyQuote } from './quoteUtils.js';
import { OPENAI_API_KEY } from './greeting.js';
import { getUserSummary } from '../summary/userSummaryBuilder.js';

const EVENING_INDEX_KEY = 'eveningHeadingIndex';

export async function getEveningGreeting() {
  // --- Heading ---
  const headings = greetingPhrases.evening;
  const { [EVENING_INDEX_KEY]: index = 0 } = await chrome.storage.local.get([EVENING_INDEX_KEY]);
  const heading = headings[index % headings.length];
  await chrome.storage.local.set({ [EVENING_INDEX_KEY]: (index + 1) % headings.length });

  // --- Summary from GPT ---
  const userSummary = await getUserSummary(new Date());
  const prompt = `
  You're an assistant that gives short, witty evening updates. Based on the following user data, summarize one highlight from today — fun, motivating, and under 20 words.

  USER DATA:
  ${userSummary}

  OUTPUT ONLY THE TEXT. No titles or labels.
  `.trim();

  const summary = await fetchOpenAISummary(prompt);

  const { quote, author } = await getDailyQuote();

  return { heading, summary, quote, author };
}

// GPT helper
async function fetchOpenAISummary(prompt) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || 'Winding down right, as always.';
  } catch (err) {
    console.warn('[EveningGreeting] ChatGPT failed:', err);
    return 'Winding down right, as always.';
  }
}
