import { getUserSummary } from '../summary/userSummaryBuilder.js';

// Constants
const STORAGE_PREFIX = 'greeting_';
const OPENAI_API_KEY = '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'; // Your API key
const DEFAULT_GREETING = {
  summary: "I'm your new assistant. Tomorrow I'll give you a summary based on what you did today.",
  quote: '"Every day is a fresh start." – Mary Pickford'
};

// Storage utilities
async function saveGreeting(dateKey, greeting) {
  await chrome.storage.local.set({ [`${STORAGE_PREFIX}${dateKey}`]: greeting });
}

async function getStoredGreeting(dateKey) {
  const result = await chrome.storage.local.get([`${STORAGE_PREFIX}${dateKey}`]);
  return result[`${STORAGE_PREFIX}${dateKey}`] || null;
}

// Time utilities
function getYesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Good night';
}

// GPT Service
async function generateGreeting(userSummary) {
    console.log('User summary:', userSummary);
  const prompt = `
Role:
You are a personal AI mentor. You review the user’s recent digital activity (emails, browsing, calendar, files) to:
1. Infer what the user was studying, searching, learning, or curious about.
2. Teach them one short, high-quality insight related to that topic.
3. Pair it with a thoughtful quote that fits the same theme.

Your tone is warm, sharp, and intelligent — avoid fluff or repetition.

Input:
You receive a structured summary of the user’s recent activity.

Response Format:
[Concise, specific insight based on activity - max 35 words] <<SEP>> [Thoughtful, matching quote with author - max 25 words]

Constraints:
• Do NOT include greetings (e.g., “Good morning”) or the user's name.
• Do NOT summarize the activity or refer to the data source.
• Do NOT use cliché praise or overly common quotes (e.g., avoid Steve Jobs unless context demands it).
• Insight must be meaningful, not generic.
• Quote must feel fresh, thoughtful, and emotionally aligned.

Style:
• Be personal, insightful, and educational.
• Use plain, emotionally intelligent language.
• The message should feel natural and tailored — not robotic or motivational filler.

User Profile:
• Role: Computer Science Student
• Interests: Artificial Intelligence, Mathematics, Physics
• Goal: Become an expert in software development and AI research

User Context:
${userSummary}
`.trim();

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
        max_tokens: 150,
        temperature: 0.2
      })
    });

    const data = await response.json();
    console.log('[Greeting] Data:', data);
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('Failed to generate greeting:', error);
    return null;
  }
}

// Main greeting logic
export async function getOrGenerateGreeting(userSummary) {
  const yesterdayKey = getYesterdayKey();
  
//   Try to get cached greeting first
  const cachedGreeting = await getStoredGreeting(yesterdayKey);
  if (cachedGreeting) {
    const [summary, quote] = cachedGreeting.split('<<SEP>>');
    return {
      summary: summary.trim(),
      quote: quote ? `${quote.trim()}` : null
    };
  }

  // Generate new greeting if no cache
  const newGreeting = await generateGreeting(userSummary);
  if (newGreeting) {
    await saveGreeting(yesterdayKey, newGreeting);
    const [summary, quote] = newGreeting.split('<<SEP>>');
    return {
      summary: summary.trim(),
      quote: quote ? `${quote.trim()}` : null
    };
  }

  return DEFAULT_GREETING;
}

// UI Component
export async function renderGreeting(containerSelector = '#greeting-container') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Get user name
  const { userName } = await chrome.storage.local.get(['userName']);
  
  // Get yesterday's summary using getUserSummary
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const userSummary = await getUserSummary(yesterday);
  
  // Get greeting
  const greeting = await getOrGenerateGreeting(userSummary);
  const timeGreeting = getTimeBasedGreeting();
  const name = userName ? `, ${userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase()}` : '';

  // Update UI
  container.querySelector('.greeting-heading').textContent = `${timeGreeting}${name}`;
  container.querySelector('.greeting-summary').textContent = greeting.summary;
  container.querySelector('.greeting-quote').textContent = greeting.quote;
}
