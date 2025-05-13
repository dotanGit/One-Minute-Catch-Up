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

async function generateWeekendGreeting() {

  const roleText = USER_ROLE
    ? `You are a personal mentor giving a weekend message to a highly driven ${USER_ROLE}.`
    : `You are a personal mentor giving a weekend message to a highly driven individual.`;

  const interestsLine = USER_INTRESTS
    ? `• Interests: ${USER_INTRESTS}`
    : '';

  const prompt = `
  Role:
  ${roleText} The goal is to encourage a thoughtful pause — something they usually forget.
  
  Context:
  ${interestsLine}
  • Theme this weekend: "${weeklyTheme}" vs. their usual: "${weeklyContrast}"
  
  Task:
  1. Write a friendly, casual reminder that contrasts their current theme with their usual behavior (max 20 words).
  2. Add a chill quote that also contrasts intensity with balance, work with life, or focus with fun (max 20 words).
  
  Constraints:
  • The message should be light, witty, or slightly playful — like a clever nudge from a self-aware friend.
  • The quote should not be dramatic or spiritual — just grounded and human.
  • Do NOT repeat previous phrasing or use cliché quotes.
  • Do NOT include greetings or names.
  
  Response Format:
  1) [Concise factual reflection - max 20 words]
  2) [Quote - max 20 words] - [Author]
  Do not omit the numbers.
  Author must follow a dash with one space.


  Style:
  • Think “you vs. your overachiever self”
  • Encourage joy, pausing, and human connection
  • Be fresh, light, and surprisingly real
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
    console.error('Failed to generate weekend greeting:', error);
    return null;
  }
}

const DEFAULT_WEEKEND_GREETING = {
  summary: "Take this time to rest and recharge. Your mind and body deserve this break.",
  quote: "Rest is not idleness, and to lie sometimes under trees, watching the clouds, is no waste of time.",
  author: ""
};

export async function getWeekendGreeting() {
  let greeting = await generateWeekendGreeting();

  console.log('[DEBUG] GPT Weekend Greeting Response:', greeting);

  const isValid = (g) =>
    typeof g === 'string' && g.includes('1)') && g.includes('2)') && g.includes(' - ');

  if (!isValid(greeting)) {
    greeting = await generateWeekendGreeting();
    console.log('[DEBUG] GPT Retry Response (weekend):', greeting);
  }

  if (!isValid(greeting)) {
    return DEFAULT_WEEKEND_GREETING;
  }

  try {
    const summaryLine = greeting.split('1)')[1].split('2)')[0].trim();
    const quoteAuthorLine = greeting.split('2)')[1].trim();
    const [quote, author] = quoteAuthorLine.split(' - ');

    return {
      summary: summaryLine || DEFAULT_WEEKEND_GREETING.summary,
      quote: quote?.trim() || DEFAULT_WEEKEND_GREETING.quote,
      author: author?.trim() || DEFAULT_WEEKEND_GREETING.author
    };
  } catch (err) {
    console.error('[GPT] Weekend parsing failed:', err);
    return DEFAULT_WEEKEND_GREETING;
  }
}



