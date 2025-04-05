import { getAuthToken } from '../utils/auth.js';

// Get Gmail activity
export async function getGmailActivity(date) {
    try {
      console.log('Starting getGmailActivity for date:', date);
      const token = await getAuthToken();
      if (!token) {
        console.log('No auth token available');
        return { sent: [], received: [], all: [] };
      }
  
      // Set start and end times for the specified date
      const startTime = new Date(date);
      startTime.setHours(0, 0, 0, 0);
      const endTime = new Date(date);
      endTime.setHours(23, 59, 59, 999);
      
      // detect user's timezone offset in minutes
      const timezoneOffsetMinutes = startTime.getTimezoneOffset(); // e.g., -180 for UTC+3
      
      // apply offset to get correct UTC timestamps
      const startTimestamp = Math.floor((startTime.getTime() - timezoneOffsetMinutes * 60 * 1000) / 1000);
      const endTimestamp = Math.floor((endTime.getTime() - timezoneOffsetMinutes * 60 * 1000) / 1000);
      
      console.log('Querying emails for timestamp range (adjusted to local timezone):', {
        startTimestamp,
        endTimestamp,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        timezoneOffsetMinutes
      });
  
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
  
      // Get received emails
      const receivedResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages?q=in:inbox after:${startTimestamp} before:${endTimestamp}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
      );
  
      const sentData = await sentResponse.json();
      const receivedData = await receivedResponse.json();
  
      console.log('Gmail API responses:', {
        sentCount: sentData.messages?.length || 0,
        receivedCount: receivedData.messages?.length || 0
      });
  
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
  
          console.log('Processing sent email:', {
            id: message.id,
            subject,
            timestamp: new Date(Number(timestamp)).toISOString()
          });
  
          sentEmails.push({
            type: 'sent',
            subject,
            to,
            timestamp: Number(emailData.internalDate),
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
  
          console.log('Processing received email:', {
            id: message.id,
            subject,
            timestamp: new Date(Number(timestamp)).toISOString()
          });
  
          receivedEmails.push({
            type: 'received',
            subject,
            from,
            timestamp: Number(emailData.internalDate),
            threadId: message.threadId
          });
        }
      }
  
      // Combine and sort all emails
      const allEmails = [...sentEmails, ...receivedEmails].sort((a, b) => b.timestamp - a.timestamp);
      
      console.log('Final email counts:', {
        sent: sentEmails.length,
        received: receivedEmails.length,
        total: allEmails.length
      });
  
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



