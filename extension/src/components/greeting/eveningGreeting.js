import { getUserSummary } from '../summary/userSummaryBuilder.js';
import { OPENAI_API_KEY, WEEKLY_GOAL,DAILY_GOAL,USER_ROLE,USER_INTRESTS } from './greeting.js';


async function generateEveningGreeting(userSummary) {

  const contextLines = [];

  if (WEEKLY_GOAL) contextLines.push(`Weekly Goal: ${WEEKLY_GOAL}`);
  if (DAILY_GOAL) contextLines.push(`Daily Goal: ${DAILY_GOAL}`);

  const contextSection = contextLines.length
    ? `Context:\n${contextLines.join('\n')}`
    : '';

  const profileLines = [];

  if (USER_ROLE) profileLines.push(`• Role: ${USER_ROLE}`);
  if (USER_INTRESTS) profileLines.push(`• Interests: ${USER_INTRESTS}`);

  const userProfileSection = profileLines.length
    ? `User Profile:\n${profileLines.join('\n')}`
    : '';

  const prompt = `
Role:
You are a personal AI mentor. You review the user’s recent digital activity (emails, browsing, calendar, files) to:
1. Infer what the user was studying, searching, learning, or curious about.
2. Teach them one short, high-quality insight related to that topic.
3. Pair it with a thoughtful quote that fits the same theme.

${contextSection}

${userProfileSection}

Today's Activities:
${userSummary}

Constraints:
• Do NOT include greetings (e.g., “Good morning”) or the user's name.
• Do NOT summarize the activity or refer to the data source.
• Do NOT use cliché praise or overly common quotes.
• Insight must be meaningful, not generic.
• Quote must feel fresh, thoughtful, and emotionally aligned.


Response Format:
1) [Concise factual reflection - max 20 words]
2) [Quote - max 20 words] - [Author]
Do not omit the numbers.
Author must follow a dash with one space.

Style:
• Be personal, insightful, and educational.
• Use plain, emotionally intelligent language.
• The message should feel natural and tailored — not robotic or motivational filler.
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
    console.error('Failed to generate evening greeting:', error);
    return null;
  }
}

const DEFAULT_EVENING_GREETING = {
  summary: "Good evening! Take a moment to reflect on your progress today.",
  quote: "The end of the day is a time for reflection and gratitude.",
  author: ""
};

export async function getEveningGreeting() {
  const userSummary = await getUserSummary(new Date());
  let greeting = await generateEveningGreeting(userSummary);

  console.log('[DEBUG] GPT Evening Greeting Response:', greeting);

  const isValid = (g) =>
    typeof g === 'string' && g.includes('1)') && g.includes('2)') && g.includes(' - ');

  if (!isValid(greeting)) {
    greeting = await generateEveningGreeting(userSummary);
    console.log('[DEBUG] GPT Retry Response (evening):', greeting);
  }

  if (!isValid(greeting)) {
    return DEFAULT_EVENING_GREETING;
  }

  try {
    const summaryLine = greeting.split('1)')[1].split('2)')[0].trim();
    const quoteAuthorLine = greeting.split('2)')[1].trim();
    const [quote, author] = quoteAuthorLine.split(' - ');

    return {
      summary: summaryLine || DEFAULT_EVENING_GREETING.summary,
      quote: quote?.trim() || DEFAULT_EVENING_GREETING.quote,
      author: author?.trim() || DEFAULT_EVENING_GREETING.author
    };
  } catch (err) {
    console.error('[GPT] Evening parsing failed:', err);
    return DEFAULT_EVENING_GREETING;
  }
}
