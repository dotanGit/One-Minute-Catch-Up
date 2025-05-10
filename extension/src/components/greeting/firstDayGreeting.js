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
  const prompt = `
  Role:
  You are a personal mentor speaking to a motivated ${USER_ROLE} on the first day of the week. Your job is to help them gently switch back into focus — not with pressure, but with clarity and encouragement.
  
  Context:
  • Interests: ${USER_INTRESTS}
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
  [Casual, friendly nudge - max 20 words] <<SEP>> [Fresh, upbeat quote with author - max 20 words]
  
  Style:
  • Warm, grounded, and gently motivating
  • Feel like a helpful reset — not a command
  • If it feels like something a cool friend would say, you’re doing it right
  `.trim();
  

  console.log('=== First Day Greeting Generation ===');
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
    console.error('Failed to generate first day greeting:', error);
    return null;
  }
}

export async function getFirstDayGreeting() {
  // Generate greeting
  const greeting = await generateFirstDayGreeting();

  if (!greeting) {
    return {
      summary: "It’s a new week — time to focus on what matters and let the rest wait.",
      quote: '"Discipline is choosing between what you want now and what you want most." – Abraham Lincoln'
    };
  }

  const [summary, quote] = greeting.split('<<SEP>>');
  return {
    summary: summary?.trim(),
    quote: quote?.trim() || '"Discipline is choosing between what you want now and what you want most." – Abraham Lincoln'
  };
}
