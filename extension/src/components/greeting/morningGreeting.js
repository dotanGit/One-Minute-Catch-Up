import { getUserSummary } from '../summary/userSummaryBuilder.js';
import { OPENAI_API_KEY, WEEKLY_GOAL,DAILY_GOAL,USER_ROLE,USER_INTRESTS } from './greeting.js';

async function generateMorningGreeting(userSummary) {
  const prompt = `
Role:
You are a personal AI mentor. You review the user’s recent digital activity (emails, browsing, calendar, files) to:
1. Infer what the user was studying, searching, learning, or curious about.
2. Teach them one short, high-quality insight related to that topic.
3. Pair it with a thoughtful quote that fits the same theme.

Context:
Weekly Goal: ${WEEKLY_GOAL}
Daily Goal: ${DAILY_GOAL}

User Profile:
• Role: ${USER_ROLE}
• Interests: ${USER_INTRESTS}

Today's Activities:
${userSummary}

Constraints:
• Do NOT include greetings (e.g., “Good morning”) or the user's name.
• Do NOT summarize the activity or refer to the data source.
• Do NOT use cliché praise or overly common quotes.
• Insight must be meaningful, not generic.
• Quote must feel fresh, thoughtful, and emotionally aligned.


Response Format:
[Concise, specific insight based on activity - max 20 words] <<SEP>> [Thoughtful, matching quote with author - max 20 words]

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
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('Failed to generate morning greeting:', error);
    return null;
  }
}

export async function getMorningGreeting() {
  // Get yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Get yesterday's summary
  const userSummary = await getUserSummary(yesterday);
  
  // Generate greeting
  const greeting = await generateMorningGreeting(userSummary);
  if (!greeting) {
    return {
      summary: "Good morning! Let's make progress on your weekly goals today.",
      quote: '"The morning is the most important part of the day." – Unknown'
    };
  }

  const [summary, quote] = greeting.split('<<SEP>>');
  return {
    summary: summary.trim(),
    quote: quote ? quote.trim() : null
  };
} 