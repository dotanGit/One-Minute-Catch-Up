import { getUserSummary } from '../summary/userSummaryBuilder.js';
import { OPENAI_API_KEY, WEEKLY_GOAL, DAILY_GOAL, USER_INTRESTS, USER_ROLE } from './greeting.js';

async function generateEveningGreeting(userSummary) {
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

  console.log('=== Evening Greeting Generation ===');
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
    console.error('Failed to generate evening greeting:', error);
    return null;
  }
}

export async function getEveningGreeting() {
  // Get today's summary
  const userSummary = await getUserSummary(new Date());
  console.log('User summary for evening:', userSummary);
  
  // Generate greeting
  const greeting = await generateEveningGreeting(userSummary);
  
  if (!greeting) {
    console.log('No greeting generated, using default');
    return {
      summary: "Good evening! Take a moment to reflect on your progress today.",
      quote: '"The end of the day is a time for reflection and gratitude." – Unknown'
    };
  }

  const [summary, quote] = greeting.split('<<SEP>>');
  console.log('=== Evening Greeting Result ===');
  console.log('Summary:', summary?.trim());
  console.log('Quote:', quote?.trim());
  
  return {
    summary: summary?.trim() || "Good evening! Take a moment to reflect on your progress today.",
    quote: quote?.trim() || '"The end of the day is a time for reflection and gratitude." – Unknown'
  };
} 