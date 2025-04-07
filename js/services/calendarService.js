import { getAuthToken } from '../utils/auth.js';

export async function getCalendarEvents(date) {
  try {
    const token = await getAuthToken();
    if (!token) throw new Error('Not authenticated');

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

    const targetDate = new Date(date);
    const startTime = new Date(targetDate);
    startTime.setHours(0, 0, 0, 0);
    const endTime = new Date(targetDate);
    endTime.setHours(23, 59, 59, 999);

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
          calendarName: calendar.summary,
          calendarColor: calendar.backgroundColor
        }));
      })
    );

    const events = allEvents.flat().sort((a, b) => {
      const aTime = new Date(a.start.dateTime || a.start.date);
      const bTime = new Date(b.start.dateTime || b.start.date);
      return aTime - bTime;
    });

    return {
      today: events,
      tomorrow: []
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
