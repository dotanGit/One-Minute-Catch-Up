import { getUserSummary } from '../summary/userSummaryBuilder.js';
import { OPENAI_API_KEY, WEEKLY_GOAL,DAILY_GOAL,USER_ROLE,USER_INTRESTS } from './greeting.js';


async function generateAfternoonGreeting(userSummary) {

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
You are a personal AI assistant. You analyze the user's digital activity from today (emails, calendar, files, browsing) to:
1. Identify what they *actually* did — in clear, concrete terms.
2. Reflect that back to them with a short sentence that helps them stay aware and grounded.
3. Add a relevant quote — something subtle and thoughtful that connects to their effort or direction, without being motivational fluff.

${contextSection}

${userProfileSection}

Today's Activities:
${userSummary}

Constraints:
• Focus on facts — clearly state what the user did or worked on.
• Do NOT invent things or make assumptions — stay grounded in the activity summary.
• Do NOT summarize the activity vaguely (e.g., “you explored tech topics”).
• Do NOT use generic or motivational language.
• Quote should be human, relevant, and gentle — not deep, dramatic, or overused.

Response Format:
1) [Concise factual reflection - max 20 words]
2) [Quote - max 20 words] - [Author]
Do not omit the numbers.
Author must follow a dash with one space.

Style:
• Neutral, self-aware, slightly observant
• Like a reflection from someone who knows what you did, not someone cheering you on
• Be calm, smart, and practical — not motivational or vague

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
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('Failed to generate afternoon greeting:', error);
    return null;
  }
}

const DEFAULT_AFTERNOON_GREETING = {
  summary: "You're halfway through the day — good time to check where you're at.",
  quote: "Momentum is a mindset, not a moment.",
  author: ""
};

export async function getAfternoonGreeting() {
  const userSummary = await getUserSummary(new Date());
  let greeting = await generateAfternoonGreeting(userSummary);

  console.log('[DEBUG] GPT Afternoon Greeting Response:', greeting);

  const isValid = (g) =>
    typeof g === 'string' && g.includes('1)') && g.includes('2)') && g.includes(' - ');

  if (!isValid(greeting)) {
    greeting = await generateAfternoonGreeting(userSummary);
  }

  if (!isValid(greeting)) {
    return DEFAULT_AFTERNOON_GREETING;
  }

  try {
    const summaryLine = greeting.split('1)')[1].split('2)')[0].trim();
    const quoteAuthorLine = greeting.split('2)')[1].trim();
    const [quote, author] = quoteAuthorLine.split(' - ');

    return {
      summary: summaryLine || DEFAULT_AFTERNOON_GREETING.summary,
      quote: quote?.trim() || DEFAULT_AFTERNOON_GREETING.quote,
      author: author?.trim() || DEFAULT_AFTERNOON_GREETING.author
    };
  } catch (err) {
    console.error('[GPT] Afternoon parsing failed:', err);
    return DEFAULT_AFTERNOON_GREETING;
  }
}
