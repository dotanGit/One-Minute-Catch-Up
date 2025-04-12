import { safeGetTimestamp } from '../../utils/dateUtils.js';

export function processCalendarEvent(event, processedEvents) {
    const eventTime = event.start?.dateTime || event.start?.date;
    if (eventTime) {
        const timestamp = safeGetTimestamp(eventTime);
        if (timestamp > 0) {
            processedEvents.push({
                type: 'calendar',
                timestamp,
                title: 'Calendar Event',
                description: event.summary || 'Untitled event',
                calendarName: event.calendarName,
                location: event.location,
                accessRole: event.accessRole,
                duration: event.end ? 
                    `${new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 
                    'All day',
                eventUrl: event.htmlLink
            });
        }
    }
}
