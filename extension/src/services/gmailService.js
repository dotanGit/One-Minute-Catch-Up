import { getAuthToken } from '../utils/auth.js';

// Get Gmail activity
export async function getGmailActivity(date) {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.log('No auth token available');
        return { sent: [], received: [], all: [] };
      }
  
      // Set start and end times for the specified date
      const startTime = new Date(date);
      startTime.setUTCHours(0, 0, 0, 0);
      const endTime = new Date(date);
      endTime.setUTCHours(23, 59, 59, 999);
      
      // detect user's timezone offset in minutes
      const timezoneOffsetMinutes = startTime.getTimezoneOffset(); // e.g., -180 for UTC+3
      
      // apply offset to get correct UTC timestamps
      const startTimestamp = Math.floor((startTime.getTime() - timezoneOffsetMinutes * 60 * 1000) / 1000);
      const endTimestamp = Math.floor((endTime.getTime() - timezoneOffsetMinutes * 60 * 1000) / 1000);
      
      // Get sent emails
      const sentResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages?q=in:sent after:${Math.floor(startTime.getTime() / 1000)} before:${Math.floor(endTime.getTime() / 1000)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );
  
      // ... rest of the function ...
    } catch (error) {
      console.error('Error getting Gmail activity:', error);
      return { sent: [], received: [], all: [] };
    }
  }
