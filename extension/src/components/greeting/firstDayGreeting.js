import { OPENAI_API_KEY, USER_ROLE, USER_INTRESTS } from './greeting.js';

const THEME_CONTRAST = {
  "working hard": "taking it easy",
  "life balance": "doing too much",
  "managing time": "wasting time",
  "having fun": "being too serious",
  "spending time with friends": "being alone too much",
  "relaxing": "working all the time",
  "letting things sink in": "rushing through things",
  "being present": "not being present",
  "staying focused": "getting distracted",
  "making progress": "not making progress"
};


const THEMES = Object.keys(THEME_CONTRAST);
const weekNumber = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
const weeklyTheme = THEMES[weekNumber % THEMES.length];
const weeklyContrast = THEME_CONTRAST[weeklyTheme];

async function generateFirstDayGreeting() {

  const roleText = USER_ROLE
  ? `You are a personal mentor speaking to a motivated ${USER_ROLE} on the first day of the week.`
  : `You are a personal mentor helping someone get back into focus on the first day of the week.`;

  const interestsLine = USER_INTRESTS
    ? `• Interests: ${USER_INTRESTS}`
    : '';

  const prompt = `
  Role:
  ${roleText} Your job is to help them gently switch back into focus — not with pressure, but with clarity and encouragement.
  
  Context:
  ${interestsLine}
  • Weekly focus: "${weeklyContrast}" (what to lean into)
  • Weekly distraction: "${weeklyTheme}" (what to be mindful of)
  
  Task:
  1. Write a friendly, real-life reminder that it's time to get back in the game — casually and with warmth (max 20 words).
  2. Add a simple, upbeat quote that feels fresh and encouraging — nothing too deep or dramatic (max 20 words).
  
  Constraints:
  • Be natural and honest — like a smart, chill friend helping them reset.
  • No drama, no corporate inspiration.
  • Avoid motivational clichés and famous overused quotes.
  • Do NOT include greetings or names.
  
  Response Format:
  1) [Concise factual reflection - max 20 words]
  2) [Quote - max 20 words] - [Author]
  Do not omit the numbers.
  Author must follow a dash with one space. 
  
  
  Style:
  • Warm, grounded, and gently motivating
  • Feel like a helpful reset — not a command
  • If it feels like something a cool friend would say, you're doing it right
  `.trim();
  

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.2
      })
    });

    const data = await response.json();

    const content = data?.choices?.[0]?.message?.content?.trim() || null;
    return content;
  } catch (error) {
    console.error('Failed to generate first day greeting:', error);
    return null;
  }
}

async function getCachedFirstDayGreeting() {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const cacheKey = `first_day_greeting_${date}`;
  const result = await chrome.storage.local.get(cacheKey);
  return result[cacheKey];
}

async function cacheFirstDayGreeting(greeting) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const cacheKey = `first_day_greeting_${date}`;
  await chrome.storage.local.set({
    [cacheKey]: {
      ...greeting,
      timestamp: Date.now()
    }
  });
}

const DEFAULT_FIRST_DAY_GREETING = {
  summary: "It's a new week — time to focus on what matters and let the rest wait.",
  quote: "Discipline is choosing between what you want now and what you want most.",
  author: "Abraham Lincoln"
};

export async function getFirstDayGreeting() {
  const cachedGreeting = await getCachedFirstDayGreeting();
  if (cachedGreeting) {
    const cacheAge = Date.now() - cachedGreeting.timestamp;
    if (cacheAge < 4 * 60 * 60 * 1000) {
      console.log('[GREETING] ✅ Using cached first day greeting (age:', Math.round(cacheAge / 1000 / 60), 'minutes)');
      return {
        summary: cachedGreeting.summary,
        quote: cachedGreeting.quote,
        author: cachedGreeting.author
      };
    } else {
      console.log('[GREETING] ❌ First day greeting cache expired (age:', Math.round(cacheAge / 1000 / 60), 'minutes)');
    }
  } else {
    console.log('[GREETING] ❌ No cached first day greeting found');
  }

  // Generate greeting
  let greeting = await generateFirstDayGreeting();
  console.log('[DEBUG] GPT First Day Greeting Response:', greeting);

  const isValid = (g) =>
    typeof g === 'string' && g.includes('1)') && g.includes('2)') && g.includes(' - ');

  if (!isValid(greeting)) {
    greeting = await generateFirstDayGreeting();
  }

  if (!isValid(greeting)) {
    return DEFAULT_FIRST_DAY_GREETING;
  }

  try {
    const summaryLine = greeting.split('1)')[1].split('2)')[0].trim();
    const quoteAuthorLine = greeting.split('2)')[1].trim();
    const [quote, author] = quoteAuthorLine.split(' - ');

    const result = {
      summary: summaryLine || DEFAULT_FIRST_DAY_GREETING.summary,
      quote: quote?.trim() || DEFAULT_FIRST_DAY_GREETING.quote,
      author: author?.trim() || DEFAULT_FIRST_DAY_GREETING.author
    };

    await cacheFirstDayGreeting(result);
    return result;
  } catch (err) {
    return DEFAULT_FIRST_DAY_GREETING;
  }
}

 