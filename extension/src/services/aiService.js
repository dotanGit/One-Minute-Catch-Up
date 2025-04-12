const OPENAI_API_KEY = 'XXXXXXXXXXXXXXXXXXXXsk-proj-8Y5Toe_sBnrdYSOCIYxtJ7druGPPKveiQyeF_hzE7VpMO-bZB7OkFttvoYMFA1J4Pb160WW_3CT3BlbkFJSgBlMNxiEb1Y5_hF4oi6yvfmXm3qtPtkWgNmUHaSf_mNqRCEUbhpwYwdoGxSEnr0FgTfIS5M4A';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function generateAISummary(data) {
  try {
    if (!data || !data.history) {
      return { summary: 'No activity data available for summary.' };
    }

    const { history, drive, emails } = data;

    const websites = (history || []).slice(0, 5).map(item => item.title).filter(Boolean).join(', ');
    const documents = (drive && drive.files ? drive.files : []).map(doc => doc.name).filter(Boolean).join(', ');
    const emailSubjects = (emails && emails.emails ? emails.emails : []).map(email => email.subject).filter(Boolean).join(', ');

    const prompt = `Based on the following activities, generate a one-sentence summary of what the user likely studied or worked on yesterday:
    ${websites ? `Websites visited: ${websites}` : 'No websites visited'}
    ${documents ? `Documents edited: ${documents}` : 'No documents edited'}
    ${emailSubjects ? `Email subjects: ${emailSubjects}` : 'No emails sent'}`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 100,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          return {
            summary: result.choices && result.choices[0] && result.choices[0].message
              ? result.choices[0].message.content.trim()
              : 'Unable to generate summary.'
          };
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || Math.pow(2, attempt + 1);
          console.log(`Rate limited. Waiting ${retryAfter} seconds before retry...`);
          await delay(retryAfter * 1000);
          continue;
        }

        throw new Error(`OpenAI API error: ${response.status}`);
      } catch (error) {
        if (attempt === 2) throw error;
        console.log(`Attempt ${attempt + 1} failed, retrying...`);
        await delay(1000 * Math.pow(2, attempt));
      }
    }

    throw new Error('Failed after 3 attempts');
  } catch (error) {
    console.error('AI summary error:', error);
    const websites = (data.history || []).slice(0, 3).map(item => item.title).filter(Boolean);
    if (websites.length > 0) {
      return { summary: `You visited websites related to: ${websites.join(', ')}` };
    }
    return { summary: 'Error generating summary. Please try again later.' };
  }
}
