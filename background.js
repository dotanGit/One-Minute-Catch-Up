// Google API configuration
const GOOGLE_API_KEY = 'AIzaSyC8e48p_XFSAUvX285wkk_tOJ3vCPRQPxk';
const OPENAI_API_KEY = 'XXXXXXXXXXXXXXXXXXXXsk-proj-8Y5Toe_sBnrdYSOCIYxtJ7druGPPKveiQyeF_hzE7VpMO-bZB7OkFttvoYMFA1J4Pb160WW_3CT3BlbkFJSgBlMNxiEb1Y5_hF4oi6yvfmXm3qtPtkWgNmUHaSf_mNqRCEUbhpwYwdoGxSEnr0FgTfIS5M4A';
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
];

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'login':
      handleGoogleLogin().then(sendResponse);
      return true;
    case 'getUserInfo':
      getUserInfo().then(sendResponse);
      return true;
    case 'getDriveActivity':
      getDriveActivity(new Date(request.date)).then(sendResponse);
      return true;
    case 'getGmailActivity':
      getGmailActivity(new Date(request.date)).then(sendResponse);
      return true;
    case 'getCalendarEvents':
      getCalendarEvents().then(sendResponse);
      return true;
    case 'generateAISummary':
      generateAISummary(request.data).then(sendResponse);
      return true;
  }
});

// Google OAuth2 login
async function handleGoogleLogin() {
  try {
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });

    if (token) {
      // Get user info immediately after login
      const profileResponse = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        }
      );

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        // Save user info to storage
        await chrome.storage.local.set({ 
          isLoggedIn: true,
          userInfo: {
            firstName: profileData.given_name,
            lastName: profileData.family_name,
            fullName: profileData.name,
            email: profileData.email
          }
        });
      }

      return { success: true, token };
    }
    return { success: false, error: 'Failed to get auth token' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

// Get user info
async function getUserInfo() {
  try {
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });

    if (!token) throw new Error('Not authenticated');

    // Get profile info from Profile API
    const profileResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!profileResponse.ok) {
      if (profileResponse.status === 401) {
        await chrome.identity.removeCachedAuthToken({ token });
        throw new Error('Authentication expired. Please try again.');
      }
      throw new Error(`Profile API error: ${profileResponse.status}`);
    }

    const profileData = await profileResponse.json();
    console.log('Profile data:', profileData);

    // Format user info using Profile API data
    const userInfo = {
      ...profileData,
      firstName: profileData.given_name,
      lastName: profileData.family_name,
      fullName: profileData.name,
      email: profileData.email
    };

    console.log('User info:', userInfo);
    return { success: true, userInfo };
  } catch (error) {
    console.error('Get user info error:', error);
    return { success: false, error: error.message };
  }
}

// Get Google Drive activity
async function getDriveActivity(date) {
  try {
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });

    if (!token) throw new Error('Not authenticated');

    const startTime = new Date(date);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(date);
    endTime.setHours(23, 59, 59, 999);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&q=modifiedTime >= '${startTime.toISOString()}' and modifiedTime <= '${endTime.toISOString()}'`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await chrome.identity.removeCachedAuthToken({ token });
        throw new Error('Authentication expired. Please try again.');
      }
      throw new Error(`Drive API error: ${response.status}`);
    }

    const data = await response.json();
    return { files: data.files || [] };
  } catch (error) {
    console.error('Drive activity error:', error);
    return { files: [], error: error.message };
  }
}

// Get Gmail activity
async function getGmailActivity(date) {
  try {
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });

    if (!token) throw new Error('Not authenticated');

    // Format date for Gmail query (YYYY/MM/DD)
    const formattedDate = date.toISOString().split('T')[0].replace(/-/g, '/');
    
    console.log('Querying emails for date:', formattedDate);

    // Get sent emails using Gmail's date format
    const sentResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=in:sent newer_than:1d older_than:0d`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    // Get received emails using Gmail's date format
    const receivedResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=in:inbox newer_than:1d older_than:0d`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!sentResponse.ok || !receivedResponse.ok) {
      if (sentResponse.status === 401 || receivedResponse.status === 401) {
        await chrome.identity.removeCachedAuthToken({ token });
        throw new Error('Authentication expired. Please try again.');
      }
      throw new Error(`Gmail API error: ${sentResponse.status || receivedResponse.status}`);
    }

    const sentData = await sentResponse.json();
    const receivedData = await receivedResponse.json();

    console.log('Sent emails count:', sentData.messages?.length || 0);
    console.log('Received emails count:', receivedData.messages?.length || 0);

    // Process sent emails
    const sentEmails = await Promise.all(
      (sentData.messages || []).slice(0, 5).map(async (message) => {
        const emailResponse = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
        );
        if (!emailResponse.ok) {
          throw new Error(`Gmail message API error: ${emailResponse.status}`);
        }
        const emailData = await emailResponse.json();
        const headers = emailData.payload.headers;
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const to = headers.find(h => h.name.toLowerCase() === 'to')?.value || '';
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
        const timestamp = emailData.internalDate;

        console.log('Sent email:', { from, to, subject, timestamp });
        return {
          type: 'sent',
          from,
          to,
          subject,
          timestamp
        };
      })
    );

    // Process received emails
    const receivedEmails = await Promise.all(
      (receivedData.messages || []).slice(0, 5).map(async (message) => {
        const emailResponse = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
        );
        if (!emailResponse.ok) {
          throw new Error(`Gmail message API error: ${emailResponse.status}`);
        }
        const emailData = await emailResponse.json();
        const headers = emailData.payload.headers;
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
        const to = headers.find(h => h.name.toLowerCase() === 'to')?.value || '';
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
        const timestamp = emailData.internalDate;

        console.log('Received email:', { from, to, subject, timestamp });
        return {
          type: 'received',
          from,
          to,
          subject,
          timestamp
        };
      })
    );

    // Combine and sort emails by timestamp
    const allEmails = [...sentEmails, ...receivedEmails].sort((a, b) => b.timestamp - a.timestamp);

    console.log('Total processed emails:', allEmails.length);
    return { 
      sent: sentEmails,
      received: receivedEmails,
      all: allEmails
    };
  } catch (error) {
    console.error('Gmail activity error:', error);
    return { 
      sent: [], 
      received: [], 
      all: [],
      error: error.message 
    };
  }
}

// Get Calendar events for today and tomorrow
async function getCalendarEvents() {
  try {
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });

    if (!token) throw new Error('Not authenticated');

    // First, get all calendar lists
    const calListResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!calListResponse.ok) {
      if (calListResponse.status === 401) {
        await chrome.identity.removeCachedAuthToken({ token });
        throw new Error('Authentication expired. Please try again.');
      }
      throw new Error(`Calendar API error: ${calListResponse.status}`);
    }

    const calendarList = await calListResponse.json();
    const calendars = calendarList.items || [];

    // Get date range for today and tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startTime = new Date(today);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(23, 59, 59, 999);

    // Fetch events from all calendars
    const allEvents = await Promise.all(
      calendars.filter(cal => cal.selected !== false).map(async calendar => {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?timeMin=${startTime.toISOString()}&timeMax=${endTime.toISOString()}&orderBy=startTime&singleEvents=true`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          console.error(`Error fetching events for calendar ${calendar.summary}:`, response.status);
          return [];
        }

        const data = await response.json();
        return (data.items || []).map(event => ({
          ...event,
          calendarName: calendar.summary, // Add calendar name to each event
          calendarColor: calendar.backgroundColor // Add calendar color to each event
        }));
      })
    );

    // Flatten and sort all events
    const events = allEvents.flat().sort((a, b) => {
      const aTime = new Date(a.start.dateTime || a.start.date);
      const bTime = new Date(b.start.dateTime || b.start.date);
      return aTime - bTime;
    });

    // Separate events into today and tomorrow
    const todayEvents = events.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date);
      return eventDate.toDateString() === today.toDateString();
    });

    const tomorrowEvents = events.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date);
      return eventDate.toDateString() === tomorrow.toDateString();
    });

    return { 
      today: todayEvents,
      tomorrow: tomorrowEvents
    };
  } catch (error) {
    console.error('Calendar events error:', error);
    return { 
      today: [], 
      tomorrow: [],
      error: error.message 
    };
  }
}

// Helper function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Generate AI summary
async function generateAISummary(data) {
  try {
    if (!data || !data.history) {
      return { summary: 'No activity data available for summary.' };
    }

    const { history, drive, emails } = data;
    
    // Prepare data for OpenAI
    const websites = (history || []).slice(0, 5).map(item => item.title).filter(Boolean).join(', ');
    const documents = (drive && drive.files ? drive.files : []).map(doc => doc.name).filter(Boolean).join(', ');
    const emailSubjects = (emails && emails.emails ? emails.emails : []).map(email => email.subject).filter(Boolean).join(', ');

    const prompt = `Based on the following activities, generate a one-sentence summary of what the user likely studied or worked on yesterday:
    ${websites ? `Websites visited: ${websites}` : 'No websites visited'}
    ${documents ? `Documents edited: ${documents}` : 'No documents edited'}
    ${emailSubjects ? `Email subjects: ${emailSubjects}` : 'No emails sent'}`;

    // Try up to 3 times with exponential backoff
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
            temperature: 0.7, // Add some variability to responses
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
          // If we hit the rate limit, wait with exponential backoff
          const retryAfter = response.headers.get('Retry-After') || Math.pow(2, attempt + 1);
          console.log(`Rate limited. Waiting ${retryAfter} seconds before retry...`);
          await delay(retryAfter * 1000);
          continue;
        }

        // For other errors, throw immediately
        throw new Error(`OpenAI API error: ${response.status}`);
      } catch (error) {
        if (attempt === 2) throw error; // On last attempt, throw the error
        console.log(`Attempt ${attempt + 1} failed, retrying...`);
        await delay(1000 * Math.pow(2, attempt)); // Exponential backoff
      }
    }

    throw new Error('Failed after 3 attempts');
  } catch (error) {
    console.error('AI summary error:', error);
    // Provide a fallback summary based on the raw data
    const websites = (history || []).slice(0, 3).map(item => item.title).filter(Boolean);
    if (websites.length > 0) {
      return { summary: `You visited websites related to: ${websites.join(', ')}` };
    }
    return { summary: 'Error generating summary. Please try again later.' };
  }
}

// Check for daily update
chrome.runtime.onStartup.addListener(async () => {
  try {
    const { lastUpdate } = await chrome.storage.local.get('lastUpdate');
    const today = new Date().toDateString();

    if (lastUpdate !== today) {
      await chrome.storage.local.set({ lastUpdate: today });
      // Trigger a refresh of the summary
      chrome.runtime.sendMessage({ action: 'refreshSummary' });
    }
  } catch (error) {
    console.error('Daily update check error:', error);
  }
}); 