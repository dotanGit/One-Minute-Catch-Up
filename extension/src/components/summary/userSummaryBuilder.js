export async function getUserSummary(date = new Date()) {
  const dateKey = `timeline_${date.toISOString().split('T')[0]}`;

  const cached = await chrome.storage.local.get(dateKey);
  const data = cached[dateKey]?.data;

  if (!data) return "No activity recorded yet today.";

  const lines = ["Significant activities:\n"];

  // ======== Calendar ========
  const calendarEvents = data.calendar?.today?.map(ev => ev.summary).filter(Boolean) || [];
  if (calendarEvents.length) {
    lines.push("Calendar:");
    calendarEvents.forEach(title => lines.push(`- ${title}`));
    lines.push("");
  }

  // ======== Emails Sent ========
  const sentEmails = (data.emails?.all || []).filter(e => e.type === 'sent');
  if (sentEmails.length) {
    lines.push("Emails Sent:");
    sentEmails.slice(0, 5).forEach(e => lines.push(`- ${e.subject}`));
    lines.push("");
  }

  // ======== Emails Received ========
  const receivedEmails = (data.emails?.all || []).filter(e => e.type === 'received');
  if (receivedEmails.length) {
    lines.push("Emails Received:");
    receivedEmails.slice(0, 5).forEach(e => lines.push(`- ${e.subject}`));
    lines.push("");
  }

  // ======== Browser History ========
  const history = (data.history || []).filter(h => h.title && h.url && !isDistraction(h.url));
  if (history.length) {
    lines.push("Browsing:");
    history.slice(0, 5).forEach(h => lines.push(`- ${h.title} (${h.url})`));
    lines.push("");
  }

  // ======== Drive Files ========
  const driveFiles = data.drive?.files || [];
  if (driveFiles.length) {
    lines.push("Drive Files:");
    driveFiles.slice(0, 5).forEach(f => lines.push(`- ${f.name}`));
    lines.push("");
  }

  const finalSummary = lines.join('\n').trim();
  return finalSummary;
}

function isDistraction(url) {
  return /youtube\.com\/(feed|shorts|watch)/.test(url)
      || /facebook|instagram|tiktok/.test(url)
      || url.includes('ads.') || url.includes('utm_') || url.includes('doubleclick');
}
