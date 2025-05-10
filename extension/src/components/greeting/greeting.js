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
You are a personal AI assistant creating a meaningful daily greeting based on yesterday's activities.

Context:
${userSummary}

Instructions:
1. Analyze the data in this order of priority:
   - Calendar events (especially cultural, national, or personal significance)
   - Important communications or achievements
   - Learning or work activities
   - Other meaningful activities

2. Create a two-part response:
   a. First sentence (max 20 words):
      - If there's a significant event/holiday: Focus on its emotional meaning
      - Otherwise: Highlight a meaningful achievement or activity
      - Keep it personal and emotionally resonant
      
   b. Second sentence (max 20 words):
      - Include a famous quote that matches the emotional tone
      - For solemn occasions: Use respectful, contemplative, motivational quotes
      - For achievements: Use motivational quotes
      - For regular days: Use inspiring, forward-looking quotes

Format your response exactly as:
[emotional insight] <<SEP>> [quote with attribution]

Example for a solemn day:
Today we honor those who gave everything for our tomorrow <<SEP>> In their memory, we live and strive for peace - Yitzhak Rabin

Example for an achievement day:
Your dedication to learning new skills shows real commitment to growth <<SEP>> The expert in anything was once a beginner - Helen Hayes
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
