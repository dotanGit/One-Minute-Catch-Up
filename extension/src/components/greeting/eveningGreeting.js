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
[Concise, specific insight based on activity - max 20 words] <<SEP>> [Thoughtful, matching quote - max 20 words] <<AUTHOR>> [Quote Author]

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

export async function getEveningGreeting() {
  // Get today's summary
  const userSummary = await getUserSummary(new Date());
  
  const greeting = await generateEveningGreeting(userSummary);
  
  if (!greeting) {
    return {
      summary: "Good evening! Take a moment to reflect on your progress today.",
      quote: '"The end of the day is a time for reflection and gratitude."',
      author: ""
    };
  }

  const [summary, quotePart] = greeting.split('<<SEP>>');
  const [quote, author] = quotePart.split('<<AUTHOR>>');

  return {
    summary: summary.trim(),
    quote: quote.trim(),
    author: author.trim()
  };
} 