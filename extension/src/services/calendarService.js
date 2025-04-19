import { getAuthToken } from '../utils/auth.js';
import { normalizeDateToStartOfDay, safeToISOString } from '../utils/dateUtils.js';

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

    // 🔄 Use local time range for query
    const startTime = normalizeDateToStartOfDay(date);
    const endTime = new Date(startTime.getTime() + 86400000); // +1 local day

    const allEvents = await Promise.all(
      calendars.filter(cal => cal.selected !== false).map(async calendar => {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?timeMin=${safeToISOString(startTime)}&timeMax=${safeToISOString(endTime)}&orderBy=startTime&singleEvents=true`,
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
        return (data.items || []).map(event => {
          return {
            ...event,
            calendarName: calendar.summaryOverride || calendar.summary,
            originalCalendarName: calendar.summary,
            calendarColor: calendar.backgroundColor
          };
        });
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
