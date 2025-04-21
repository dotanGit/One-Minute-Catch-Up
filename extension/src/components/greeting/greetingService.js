// greeting/greetingService.js
const API_KEY = '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';

export async function callGptGreeting(prompt) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.8
      })
    });

    const data = await response.json();
    console.log('[Greeting GPT] Response:', data);

    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error('[Greeting GPT] Error calling OpenAI:', err);
    return null;
  }
}

