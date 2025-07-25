import { getAuthToken } from '../utils/auth.js';
import { normalizeDateToStartOfDay } from '../utils/dateUtils.js';

// Get Gmail activity
export async function getGmailActivity(date) {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.log('No auth token available');
      return { sent: [], received: [], all: [] };
    }

    // 🔄 Use local day range
    const startTime = normalizeDateToStartOfDay(date);
    const endTime = new Date(startTime.getTime() + 86400000); // +1 local day

    const startTimestamp = Math.floor(startTime.getTime() / 1000); // seconds
    const endTimestamp = Math.floor(endTime.getTime() / 1000);

    // Get sent emails
    const sentResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=in:sent after:${startTimestamp} before:${endTimestamp}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    // Get received emails - ONLY PRIMARY AND UPDATES CATEGORIES
    const receivedResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=in:inbox (category:primary OR category:updates) after:${startTimestamp} before:${endTimestamp}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    const sentData = await sentResponse.json();
    const receivedData = await receivedResponse.json();

    // Process sent emails
    const sentEmails = [];
    if (sentData.messages) {
      for (const message of sentData.messages) {
        const emailResponse = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
        );
        const emailData = await emailResponse.json();
        const headers = emailData.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
        const to = headers.find(h => h.name === 'To')?.value || '';
        const timestamp = emailData.internalDate;

        sentEmails.push({
          type: 'sent',
          subject,
          to,
          timestamp: Number(timestamp),
          id: String(message.id),
          threadId: message.threadId
        });
      }
    }

    // Process received emails
    const receivedEmails = [];
    if (receivedData.messages) {
      for (const message of receivedData.messages) {
        const emailResponse = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
        );
        const emailData = await emailResponse.json();
        const headers = emailData.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const timestamp = emailData.internalDate;

        receivedEmails.push({
          type: 'received',
          subject,
          from,
          timestamp: Number(timestamp),
          id: String(message.id),
          threadId: message.threadId
        });
      }
    }

    const allEmails = [...sentEmails, ...receivedEmails].sort((a, b) => b.timestamp - a.timestamp);

    return {
      sent: sentEmails,
      received: receivedEmails,
      all: allEmails
    };
  } catch (error) {
    console.error('Error in getGmailActivity:', error);
    return { sent: [], received: [], all: [] };
  }
}
