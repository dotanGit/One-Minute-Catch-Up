import { getUserSummary } from '../summary/userSummaryBuilder.js';
import { OPENAI_API_KEY, WEEKLY_GOAL,DAILY_GOAL,USER_ROLE,USER_INTRESTS } from './greeting.js';

async function generateAfternoonGreeting(userSummary) {
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
    console.error('Failed to generate afternoon greeting:', error);
    return null;
  }
}

export async function getAfternoonGreeting() {
  // Get today's summary
  const userSummary = await getUserSummary(new Date());
  
  // Generate greeting
  const greeting = await generateAfternoonGreeting(userSummary);
  if (!greeting) {
    return {
      summary: "Good afternoon! Keep up the momentum on your daily goals.",
      quote: '"The middle of the day is when you can make the most impact." – Unknown'
    };
  }

  const [summary, quote] = greeting.split('<<SEP>>');
  return {
    summary: summary.trim(),
    quote: quote ? quote.trim() : null
  };
} 