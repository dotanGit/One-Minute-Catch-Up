// export function buildGreetingPrompt(userSummary) {
//   return `
// You are a personal assistant helping the user start their day.

// You receive a structured list of their meaningful activities from yesterday (emails, calendar events, browsing, etc).

// Your job:
// 1. Read the list carefully.
// 2. Identify **what’s most meaningful** — this might be a job application, acceptance letter, academic progress, or key research.
// 3.  Write a personal greeting that by the following rules:
//    - first sentence :  **Mentions at least one specific activity** from the list
//    - second sentence can either be:
//      - a very short quote/motivational ending that fits naturally
    
// Format:
// [Main greeting].[Quote or motivational ending].
// Always start with somhing like "Yesterday was a great day for you",Do not add newlines. Do not add headers or labels. no “Remember,” or prefix. do not include headers. Do not say “Here’s your greeting.” . Do not write “Good morning,” “Hello,” or any time-based greeting.
// Just return 2 clean sentences.


// User’s summary:
// ${userSummary}

// Make it personal, accurate, and motivating. Avoid general phrases like “keep up the good work” unless you have no choice.
// `.trim();
// }


// export function buildGreetingPrompt(userSummary) {
//   return `
// You are a personal assistant helping the user start their day.

// You receive a structured list of their meaningful activities from **yesterday**, including calendar events, emails, files, and browsing history.

// Your job:
// 1. Read the list carefully.
// 2. Identify what’s **most meaningful or unique** — this might be academic progress, job search activity, interesting meetings, or important browsing.
// 3. Write a personal greeting that by the following rules:
//    - Sentence 1: Mention at least one specific activity.
//    - Sentence 2: Give a short motivational quote that fits naturally.

// Format:
// [Main sentence]. [Quote or motivational line].

// Do not say "no activity". Never assume the day was empty — if there are emails, events, or files, they count.
// Be encouraging but not generic. Never say “you had a restful day” unless there's truly nothing, keep it short and concise.

// User’s activity summary (from yesterday):
// ${userSummary}
// `.trim();
// }


export function buildGreetingPrompt(userSummary) {
  return `
You are a personal assistant helping the user start their day.

You are given a summary of their important activities from **yesterday** (calendar events, emails, browsing, files).

Your task:
1. Read the activities carefully.
2. Identify the **most meaningful achievement or effort**.
3. Write a 2-sentence personal greeting:
   - **irst sentence always starts with summary:**: Mention one specific activity and its positive impact. (14 words max)
   - **Second sentence always starts with quote:**: Add a famous, meaningful motivational quote that fits naturally.

Strict rules:
- Use a real, well-known motivational quote (by someone famous like Mandela, Churchill, Einstein, etc).
- Do **not** invent or make up a fake quote.
- Be concise, motivating, and meaningful.
- Never say the day was empty. Always highlight some progress, even small.


Here is the user's summary:
${userSummary}
`.trim();
}