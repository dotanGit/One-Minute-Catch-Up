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
  const prompt = `
  Role:
  You are a personal mentor giving a weekend message to a highly driven ${USER_ROLE}. The goal is to encourage a thoughtful pause — something they usually forget.
  
  Context:
  • Interests: ${USER_INTRESTS}
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
  [Contrast-driven insight - max 20 words] <<SEP>> [Simple, witty quote with author - max 20 words]
  
  Style:
  • Think “you vs. your overachiever self”
  • Encourage joy, pausing, and human connection
  • Be fresh, light, and surprisingly real
  `.trim();
  
  
  

  console.log('=== Weekend Greeting Generation ===');
  console.log('Sending prompt to GPT:', prompt);

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
    console.log('GPT API Response:', data);
    
    const content = data?.choices?.[0]?.message?.content?.trim() || null;
    return content;
  } catch (error) {
    console.error('Failed to generate weekend greeting:', error);
    return null;
  }
}

export async function getWeekendGreeting() {
  // Generate greeting
  const greeting = await generateWeekendGreeting();
  
  if (!greeting) {
    return {
      summary: "Take this time to rest and recharge. Your mind and body deserve this break.",
      quote: '"Rest is not idleness, and to lie sometimes on the grass under trees on a summer\'s day, listening to the murmur of the water, or watching the clouds float across the sky, is by no means a waste of time." – John Lubbock'
    };
  }

  const [summary, quote] = greeting.split('<<SEP>>');
  return {
    summary: summary?.trim(),
    quote: quote?.trim() || '"Rest is not idleness, and to lie sometimes on the grass under trees on a summer\'s day, listening to the murmur of the water, or watching the clouds float across the sky, is by no means a waste of time." – John Lubbock'
  };
} 


