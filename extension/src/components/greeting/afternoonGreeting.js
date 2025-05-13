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
[Concise factual reflection - max 20 words] <<SEP>> [Light, thoughtful quote - max 20 words] <<AUTHOR>> [Quote Author]
Do NOT skip <<SEP>> or <<AUTHOR>> — if missing, the output is invalid.
Do NOT replace <<AUTHOR>> with a dash or quotation marks.
Output must be on one line, exactly as described.

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

export async function getAfternoonGreeting() {
  const userSummary = await getUserSummary(new Date());
  const greeting = await generateAfternoonGreeting(userSummary);

  console.log('[DEBUG] GPT Afternoon Greeting Response:', greeting);


  if (!greeting) {
    return {
      summary: "Hey big BOSS, Keep up the momentum on your daily goals.",
      quote: "The middle of the day is when you can make the most impact",
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
